const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Use claude-3-5-sonnet for high-quality medical AI decisions
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

const EMS_SYSTEM_PROMPT = `You are an AI assistant serving as an EMS Medical Director advisor for an ambulance dispatch platform. You have extensive knowledge of emergency medical services, pre-hospital care protocols, NFIRS/NEMSIS standards, and EMS operations. Provide precise, clinically sound, and operationally practical recommendations. Always prioritize patient safety and evidence-based medicine. You MUST respond with valid JSON only — no markdown, no prose, just the JSON object.`;

// ---------------------------------------------------------------------------
// Rate limiter: 20 AI requests per user per hour (conservative for medical AI)
// ---------------------------------------------------------------------------
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => `user_${req.user?.id || req.user?.userId || 'anon'}`,
  message: { error: 'Too many AI requests. Limit: 20 per hour for medical AI.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

// ---------------------------------------------------------------------------
// Role enforcement helpers
// ---------------------------------------------------------------------------
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${userRole || 'unknown'}.`
      });
    }
    next();
  };
}

// Roles that can dispatch units
const DISPATCH_ROLES = ['supervisor', 'dispatcher'];
// Roles that can access PCR drafting (medic, paramedic, supervisor, dispatcher)
const PCR_ROLES = ['medic', 'paramedic', 'supervisor', 'dispatcher'];

// ---------------------------------------------------------------------------
// Ensure predictions table exists
// ---------------------------------------------------------------------------
async function ensurePredictionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      location_zone VARCHAR(255),
      hours_ahead INTEGER,
      input_data JSONB,
      result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// ---------------------------------------------------------------------------
// Ensure audit_log table exists
// ---------------------------------------------------------------------------
async function ensureAuditLogTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      entity_type VARCHAR(100),
      ip_address VARCHAR(45),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// ---------------------------------------------------------------------------
// ai_results table (JSONB) for persistent AI run history
// ---------------------------------------------------------------------------
async function ensureAIResultsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      analysis_type VARCHAR(100) NOT NULL,
      input_data JSONB,
      result JSONB,
      model VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Initialize tables on module load
(async () => {
  try {
    await ensurePredictionsTable();
    await ensureAuditLogTable();
    await ensureAIResultsTable();
  } catch (err) {
    console.error('Failed to ensure AI tables:', err.message);
  }
})();

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------
async function writeAuditLog({ userId, action, entityId, entityType, ipAddress }) {
  try {
    await db.query(
      'INSERT INTO audit_log (user_id, action, entity_id, entity_type, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId || null, action, entityId || null, entityType || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// 3-strategy JSON parser
// ---------------------------------------------------------------------------
function parseAIJson(text) {
  if (!text || typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// saveAIResult — Persist all AI analysis results to history
// ---------------------------------------------------------------------------
async function saveAIResult(userId, analysisType, inputData, result) {
  try {
    await db.query(
      'INSERT INTO ai_results (user_id, analysis_type, input_data, result, model) VALUES ($1, $2, $3, $4, $5)',
      [userId || null, analysisType, JSON.stringify(inputData), JSON.stringify(result), OPENROUTER_MODEL]
    );
  } catch (e) {
    console.error('saveAIResult failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Internal POST /audit endpoint
// ---------------------------------------------------------------------------
router.post('/audit', auth, async (req, res) => {
  try {
    const { action, entity_id, entity_type } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required.' });
    const userId = req.user?.id || req.user?.userId;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    await writeAuditLog({ userId, action, entityId: entity_id, entityType: entity_type, ipAddress: ip });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// OpenRouter caller — with json_object response_format for reliable JSON output
// ---------------------------------------------------------------------------
async function callOpenRouter(systemPrompt, userPrompt, temperature = 0.3) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ems-dispatch.local',
      'X-Title': 'EMS Dispatch AI',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('Invalid AI response: missing content');
  return data.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// POST /triage - AI-generated triage priority score
// FIXED: field names now match frontend (description OR callDescription, patient_age OR patientAge)
// ---------------------------------------------------------------------------
router.post('/triage', auth, aiRateLimiter, async (req, res) => {
  try {
    // Accept both camelCase (frontend) and snake_case (API direct)
    const description = req.body.description || req.body.callDescription || req.body.call_description;
    const chief_complaint = req.body.chief_complaint || req.body.chiefComplaint;
    const caller_info = req.body.caller_info || req.body.callerInfo;
    const patient_age = req.body.patient_age || req.body.patientAge;
    const patient_gender = req.body.patient_gender || req.body.patientGender;
    const additional_symptoms = req.body.additional_symptoms || req.body.additionalSymptoms;

    if (!description && !chief_complaint) {
      return res.status(400).json({ error: 'Call description or chief complaint is required.' });
    }

    const userPrompt = `Analyze the following emergency call and provide a triage priority score.

Call Description: ${description || chief_complaint}
${chief_complaint ? `Chief Complaint: ${chief_complaint}` : ''}
${caller_info ? `Caller Info: ${caller_info}` : ''}
${patient_age ? `Patient Age: ${patient_age}` : ''}
${patient_gender ? `Patient Gender: ${patient_gender}` : ''}
${additional_symptoms ? `Additional Symptoms: ${additional_symptoms}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "priority_score": <1-4 where 1=Critical, 2=Emergent, 3=Urgent, 4=Non-urgent>,
  "reasoning": "<brief clinical reasoning>",
  "recommended_unit_type": "<BLS or ALS or Critical Care>",
  "time_sensitivity": "<immediate, urgent, or non-urgent>",
  "chief_complaint_category": "<category such as Cardiac, Trauma, Respiratory, etc.>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are performing emergency call triage assessment. Use MPDS (Medical Priority Dispatch System) principles.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'triage', { description, chief_complaint, patient_age }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /unit-selection - Optimal unit recommendation (dispatch roles only)
// ---------------------------------------------------------------------------
router.post('/unit-selection', auth, requireRole(...DISPATCH_ROLES), aiRateLimiter, async (req, res) => {
  try {
    const { call_location, call_type, priority, available_units } = req.body;
    if (!call_location || !call_type) {
      return res.status(400).json({ error: 'Call location and call type are required.' });
    }

    let units = available_units;
    if (!units) {
      const result = await db.query("SELECT * FROM units WHERE status = 'available'");
      units = result.rows;
    }

    const userPrompt = `Recommend the optimal unit to dispatch for this emergency call.

Call Location: ${JSON.stringify(call_location)}
Call Type: ${call_type}
Priority: ${priority || 'Unknown'}

Available Units:
${JSON.stringify(units, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "recommended_unit_id": <unit id or null>,
  "recommended_unit_number": "<unit number>",
  "reasoning": "<explanation of why this unit is optimal>",
  "estimated_response_time_minutes": <number>,
  "alternative_unit_id": <backup unit id or null>,
  "capability_match": "<how well unit capability matches call needs>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are optimizing unit dispatch based on proximity, capability level, and call requirements. Consider ALS vs BLS needs, distance, and unit capability.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'unit-selection', { call_type, priority, units_count: units.length }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /pcr-draft - AI-drafted PCR narrative (medic or higher)
// ---------------------------------------------------------------------------
router.post('/pcr-draft', auth, requireRole(...PCR_ROLES), aiRateLimiter, async (req, res) => {
  try {
    const {
      call_type, chief_complaint, patient_name, patient_age, patient_gender,
      vitals, treatments, procedures, medications_given, transport_info, narrative_notes
    } = req.body;

    if (!chief_complaint) {
      return res.status(400).json({ error: 'Chief complaint is required.' });
    }

    const userPrompt = `Draft a professional EMS Patient Care Report (PCR) narrative based on the following data.

Call Type: ${call_type || 'Not specified'}
Chief Complaint: ${chief_complaint}
Patient: ${patient_name || 'Unknown'}, ${patient_age || 'Unknown'} y/o ${patient_gender || ''}
Vitals: ${vitals ? JSON.stringify(vitals) : 'Not recorded'}
Treatments Given: ${treatments || 'None documented'}
Procedures: ${procedures || 'None documented'}
Medications Administered: ${medications_given || 'None documented'}
Transport Info: ${transport_info || 'Not specified'}
Additional Notes: ${narrative_notes || 'None'}

Respond ONLY with valid JSON in this exact format:
{
  "narrative": "<professional PCR narrative in chronological format, written in third person past tense, suitable for medical-legal documentation>",
  "clinical_impression": "<brief clinical impression>",
  "documentation_completeness": "<assessment of how complete the provided data is>",
  "suggested_additions": ["<any additional documentation that should be added>"]
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are drafting a Patient Care Report narrative. Use professional EMS documentation standards, SOAP-style narrative, and proper medical terminology. The narrative must be factual, chronological, and legally defensible.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'pcr-draft', { chief_complaint, call_type }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /protocol - Protocol recommendation
// ---------------------------------------------------------------------------
router.post('/protocol', auth, aiRateLimiter, async (req, res) => {
  try {
    const { chief_complaint, vitals, patient_age, patient_gender, medical_history, allergies } = req.body;
    if (!chief_complaint) {
      return res.status(400).json({ error: 'Chief complaint is required.' });
    }

    const protocolsResult = await db.query('SELECT protocol_number, title, category FROM protocols LIMIT 50');
    const availableProtocols = protocolsResult.rows;

    const userPrompt = `Recommend the appropriate EMS treatment protocol based on the following patient presentation.

Chief Complaint: ${chief_complaint}
Vitals: ${vitals ? JSON.stringify(vitals) : 'Not yet assessed'}
Patient Age: ${patient_age || 'Unknown'}
Patient Gender: ${patient_gender || 'Unknown'}
Medical History: ${medical_history || 'Unknown'}
Allergies: ${allergies || 'NKDA'}

Available Protocols in System:
${JSON.stringify(availableProtocols, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "recommended_protocol": "<protocol number and title>",
  "category": "<protocol category>",
  "reasoning": "<clinical reasoning for protocol selection>",
  "key_interventions": ["<list of key interventions from the protocol>"],
  "medications_to_consider": ["<relevant medications with dosages>"],
  "contraindications_to_check": ["<important contraindications to verify>"],
  "bls_actions": ["<BLS-level actions>"],
  "als_actions": ["<ALS-level actions>"],
  "transport_considerations": "<transport priority and destination recommendations>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are recommending EMS treatment protocols. Base recommendations on current NAEMSP guidelines and standard EMS protocols. Consider patient-specific factors like age, allergies, and medical history.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'protocol', { chief_complaint, patient_age }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /demand-forecast - Resource demand forecast
// ---------------------------------------------------------------------------
router.post('/demand-forecast', auth, aiRateLimiter, async (req, res) => {
  try {
    const { date_range_start, date_range_end, forecast_period_days } = req.body;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || forecast_period_days || 30));

    const metricsResult = await db.query(
      'SELECT * FROM performance_metrics ORDER BY metric_date DESC LIMIT $1',
      [days]
    );

    const callPatterns = await db.query(
      `SELECT DATE(created_at) as call_date, COUNT(*) as call_count, AVG(priority) as avg_priority
       FROM calls GROUP BY DATE(created_at) ORDER BY call_date DESC LIMIT $1`,
      [days]
    );

    const userPrompt = `Analyze the following historical EMS data and forecast resource demand.

Forecast Period: ${days} days
${date_range_start ? `Start Date: ${date_range_start}` : ''}
${date_range_end ? `End Date: ${date_range_end}` : ''}

Historical Performance Metrics (last ${days} days):
${JSON.stringify(metricsResult.rows, null, 2)}

Daily Call Patterns (last ${days} days):
${JSON.stringify(callPatterns.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "forecast_summary": "<overall forecast summary>",
  "predicted_daily_call_volume": <number>,
  "predicted_peak_hours": ["<list of peak hours in 24h format>"],
  "predicted_als_percentage": <number>,
  "predicted_bls_percentage": <number>,
  "recommended_units_on_duty": <number>,
  "staffing_recommendation": "<staffing level recommendation>",
  "high_demand_areas": ["<predicted high-demand zones>"],
  "risk_factors": ["<factors that could increase demand>"],
  "confidence_level": "<low, moderate, or high>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are performing EMS resource demand forecasting. Analyze historical patterns including seasonal trends, day-of-week patterns, and call volume trends. Provide actionable staffing and resource deployment recommendations.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'demand-forecast', { days, metrics_count: metricsResult.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /fatigue-analysis - Crew fatigue risk analysis
// ---------------------------------------------------------------------------
router.post('/fatigue-analysis', auth, aiRateLimiter, async (req, res) => {
  try {
    const { crew_id, crew_ids } = req.body;

    let crewQuery;
    let crewParams;

    if (crew_id) {
      crewQuery = 'SELECT * FROM crew WHERE id = $1';
      crewParams = [crew_id];
    } else if (crew_ids && crew_ids.length > 0) {
      crewQuery = `SELECT * FROM crew WHERE id = ANY($1)`;
      crewParams = [crew_ids];
    } else {
      crewQuery = "SELECT * FROM crew WHERE status = 'active'";
      crewParams = [];
    }

    const crewResult = await db.query(crewQuery, crewParams);

    const crewIdList = crewResult.rows.map(c => c.id);
    const schedulesResult = crewIdList.length > 0 ? await db.query(
      `SELECT * FROM schedules WHERE crew_id = ANY($1) AND shift_end > NOW() - INTERVAL '7 days' ORDER BY shift_start DESC`,
      [crewIdList]
    ) : { rows: [] };

    const userPrompt = `Analyze fatigue risk for the following EMS crew members based on their work data.

Crew Members:
${JSON.stringify(crewResult.rows, null, 2)}

Recent Schedules (last 7 days):
${JSON.stringify(schedulesResult.rows, null, 2)}

Consider NFPA 1500 standards for work/rest cycles and NAEMSP fatigue risk management guidelines.

Respond ONLY with valid JSON in this exact format:
{
  "analysis": [
    {
      "crew_id": <id>,
      "name": "<first_name last_name>",
      "fatigue_risk_level": "<low, moderate, high, or critical>",
      "hours_worked_last_7_days": <number>,
      "consecutive_hours": <number>,
      "rest_deficit_hours": <number>,
      "risk_factors": ["<specific risk factors>"],
      "recommendation": "<specific recommendation>"
    }
  ],
  "overall_assessment": "<team-level fatigue assessment>",
  "immediate_actions": ["<actions to take now>"],
  "scheduling_recommendations": ["<recommendations for future scheduling>"]
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are performing crew fatigue risk analysis. Apply evidence-based fatigue science, NFPA 1500 standards, and NAEMSP guidelines. Flag any crew members who may be at elevated risk for fatigue-related errors.',
      userPrompt
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'fatigue-analysis', { crew_count: crewResult.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /crew-schedule - Smart Crew Scheduling (supervisor only)
// ---------------------------------------------------------------------------
router.post('/crew-schedule', auth, requireRole('supervisor'), aiRateLimiter, async (req, res) => {
  try {
    const { start_date, days = 14 } = req.body;
    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required (YYYY-MM-DD).' });
    }
    const scheduleDays = Math.min(28, Math.max(1, parseInt(days)));

    const crewResult = await db.query('SELECT * FROM crew ORDER BY id ASC');
    const certResult = await db.query('SELECT * FROM certifications ORDER BY crew_id ASC');
    const recentSchedules = await db.query(
      `SELECT crew_id, SUM(EXTRACT(EPOCH FROM (shift_end - shift_start))/3600) AS hours_last_14
       FROM schedules
       WHERE shift_start >= NOW() - INTERVAL '14 days'
       GROUP BY crew_id`
    );

    const userPrompt = `Generate an optimal ${scheduleDays}-day shift rotation starting ${start_date} for the following EMS crew members.

Crew Members:
${JSON.stringify(crewResult.rows, null, 2)}

Certifications:
${JSON.stringify(certResult.rows, null, 2)}

Recent Hours (last 14 days):
${JSON.stringify(recentSchedules.rows, null, 2)}

Constraints (NFPA 1500):
- Minimum 8 hours rest between shifts
- Maximum 24-hour shift length
- Maximum 48 hours in any 7-day period
- Each shift must have at least 1 ALS-certified crew member
- Ensure coverage 24/7 with minimum 2 units staffed

Respond ONLY with valid JSON in this exact format:
{
  "schedule": [
    {
      "crew_id": <id>,
      "crew_name": "<name>",
      "shifts": [
        {
          "date": "<YYYY-MM-DD>",
          "shift_start": "<HH:MM>",
          "shift_end": "<HH:MM>",
          "shift_type": "<day|night|24hr>",
          "unit_assigned": "<unit number or null>"
        }
      ]
    }
  ],
  "coverage_summary": {
    "total_shifts": <number>,
    "als_coverage_pct": <number>,
    "nfpa_compliant": <true|false>,
    "notes": ["<any scheduling notes or warnings>"]
  }
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are generating an EMS crew shift schedule. Strictly follow NFPA 1500 work/rest standards. Ensure ALS coverage at all times. Respond ONLY with valid JSON.',
      userPrompt,
      0.3
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'crew-schedule', { start_date, days: scheduleDays }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Crew Schedule Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /incident-prediction - AI Incident Prediction
// FIXED: removed queries for non-existent columns (location_description, zone)
// ---------------------------------------------------------------------------
router.post('/incident-prediction', auth, aiRateLimiter, async (req, res) => {
  try {
    const { location_zone, hours_ahead = 24 } = req.body;
    if (!location_zone) {
      return res.status(400).json({ error: 'location_zone is required.' });
    }
    const lookAhead = Math.min(72, Math.max(1, parseInt(hours_ahead)));

    // Query historical call patterns — use location_address (actual column name)
    const historicalCalls = await db.query(
      `SELECT
         EXTRACT(DOW FROM created_at) AS day_of_week,
         EXTRACT(HOUR FROM created_at) AS hour_of_day,
         call_type,
         priority,
         COUNT(*) AS call_count
       FROM calls
       WHERE location_address ILIKE $1
       GROUP BY day_of_week, hour_of_day, call_type, priority
       ORDER BY call_count DESC
       LIMIT 100`,
      [`%${location_zone}%`]
    );

    const userPrompt = `Analyze historical EMS call patterns for zone "${location_zone}" and predict incident probability for the next ${lookAhead} hours.

Historical Call Patterns (by day-of-week, hour, type):
${JSON.stringify(historicalCalls.rows, null, 2)}

Current date/time context: ${new Date().toISOString()}

Respond ONLY with valid JSON in this format:
{
  "location_zone": "${location_zone}",
  "forecast_hours": ${lookAhead},
  "predicted_incidents": [
    {
      "hour_offset": <0-${lookAhead}>,
      "call_type": "<likely call type>",
      "probability": <0.0-1.0>,
      "severity": "<low|medium|high>"
    }
  ],
  "peak_risk_windows": ["<time range description>"],
  "recommended_pre_positioning": [
    {
      "unit_type": "<BLS|ALS>",
      "location": "<staging area>",
      "start_time": "<HH:MM>",
      "end_time": "<HH:MM>"
    }
  ],
  "overall_risk_level": "<low|medium|high|critical>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are performing predictive analytics for EMS resource pre-positioning. Use historical call patterns to predict future incidents. Respond ONLY with valid JSON.',
      userPrompt,
      0.3
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    // Save to predictions table
    try {
      await db.query(
        'INSERT INTO predictions (location_zone, hours_ahead, input_data, result) VALUES ($1, $2, $3, $4)',
        [location_zone, lookAhead, JSON.stringify({ historical_rows: historicalCalls.rows.length }), JSON.stringify(parsed)]
      );
    } catch (dbErr) {
      console.error('Failed to save prediction:', dbErr.message);
    }

    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'incident-prediction', { location_zone, hours_ahead: lookAhead }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Incident Prediction Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /mci-plan - Mass Casualty Incident Plan Generator
// FIXED: removed queries for non-existent hospital columns (icu_beds, er_beds)
// ---------------------------------------------------------------------------
router.post('/mci-plan', auth, requireRole('supervisor', 'dispatcher'), aiRateLimiter, async (req, res) => {
  try {
    const { incident_type, estimated_casualties, location } = req.body;
    if (!incident_type || !estimated_casualties || !location) {
      return res.status(400).json({ error: 'incident_type, estimated_casualties, and location are required.' });
    }
    if (!Number.isInteger(Number(estimated_casualties)) || Number(estimated_casualties) < 1) {
      return res.status(400).json({ error: 'estimated_casualties must be a positive integer.' });
    }

    // Use actual columns: available_beds, er_wait_minutes, er_status, trauma_level
    const unitsResult = await db.query("SELECT unit_number, unit_type, status, capability_level FROM units WHERE status = 'available'");
    const hospitalsResult = await db.query(
      'SELECT name, address, trauma_level, available_beds, er_wait_minutes, er_status, stroke_center, cardiac_center FROM hospitals WHERE er_status != \'closed\' LIMIT 20'
    );

    const userPrompt = `Generate a Mass Casualty Incident (MCI) plan using ICS (Incident Command System) structure.

Incident Type: ${incident_type}
Estimated Casualties: ${estimated_casualties}
Location: ${location}

Available EMS Units:
${JSON.stringify(unitsResult.rows, null, 2)}

Nearby Hospitals (with availability):
${JSON.stringify(hospitalsResult.rows, null, 2)}

Respond ONLY with valid JSON in this format:
{
  "incident_summary": {
    "type": "${incident_type}",
    "estimated_casualties": ${estimated_casualties},
    "location": "${location}",
    "mci_level": "<Level 1 (5-10), Level 2 (10-25), Level 3 (25+)>"
  },
  "ics_structure": {
    "incident_commander": "<role description>",
    "operations_section": "<description>",
    "medical_branch": "<description>",
    "triage_group": "<description>",
    "treatment_group": "<description>",
    "transport_group": "<description>"
  },
  "triage_zones": [
    {
      "zone": "<Red|Yellow|Green|Black>",
      "priority": "<Immediate|Delayed|Minor|Expectant>",
      "estimated_patients": <number>,
      "location_description": "<where to set up>"
    }
  ],
  "resource_allocation": {
    "als_units_needed": <number>,
    "bls_units_needed": <number>,
    "mutual_aid_requested": <true|false>,
    "staging_location": "<address or landmark>"
  },
  "hospital_diversion": [
    {
      "hospital": "<name>",
      "patient_category": "<Red|Yellow|Green>",
      "estimated_patients": <number>,
      "rationale": "<why this hospital>"
    }
  ],
  "immediate_actions": ["<first 5 minutes actions>"],
  "communications_plan": "<radio channels and command frequencies>"
}`;

    const aiResponse = await callOpenRouter(
      EMS_SYSTEM_PROMPT + ' You are an EMS Incident Commander advisor generating an MCI response plan. Follow NIMS/ICS standards. Be specific and operationally actionable. Respond ONLY with valid JSON.',
      userPrompt,
      0.3
    );

    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'mci-plan', { incident_type, estimated_casualties, location }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI MCI Plan Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /history - paginated AI history
router.get('/history', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const userId = req.user?.id || req.user?.userId;
    const { analysis_type } = req.query;

    let baseQuery = 'FROM ai_results WHERE user_id = $1';
    const params = [userId];
    if (analysis_type) {
      params.push(analysis_type);
      baseQuery += ` AND analysis_type = $${params.length}`;
    }

    const countR = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countR.rows[0].count);

    params.push(limit);
    params.push(offset);
    const r = await db.query(
      `SELECT id, analysis_type, input_data, result, model, created_at ${baseQuery} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: r.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /hospital-divert - Hospital Divert Advisor
// FIXED: uses actual column names (er_status, available_beds, er_wait_minutes)
// ---------------------------------------------------------------------------
router.post('/hospital-divert', auth, aiRateLimiter, async (req, res) => {
  try {
    const { patient_acuity, chief_complaint, current_location } = req.body;
    if (!chief_complaint) return res.status(400).json({ error: 'chief_complaint is required.' });

    // Use actual schema columns
    const hospitalsR = await db.query(
      'SELECT id, name, address, trauma_level, available_beds, er_wait_minutes, er_status, stroke_center, cardiac_center, burn_center, pediatric_center FROM hospitals WHERE er_status != \'closed\' ORDER BY er_wait_minutes ASC LIMIT 30'
    ).catch(() => ({ rows: [] }));

    const userPrompt = `Recommend the optimal hospital for transport.

Patient Acuity: ${patient_acuity || 'unknown'}
Chief Complaint: ${chief_complaint}
Current Location: ${current_location || 'unknown'}

Hospitals (with current bed availability and ER status):
${JSON.stringify(hospitalsR.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "recommended_hospital_id": 0,
  "recommended_hospital_name": "string",
  "rationale": "string",
  "estimated_eta_minutes": 0,
  "alternative_hospital_id": 0,
  "alternative_rationale": "string",
  "diversions_to_avoid": ["string"]
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' Recommend hospital destinations minimizing patient delay and matching trauma capability.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'hospital-divert', { chief_complaint, patient_acuity }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /drug-interaction - Drug Interaction Checker
// ---------------------------------------------------------------------------
router.post('/drug-interaction', auth, requireRole(...PCR_ROLES), aiRateLimiter, async (req, res) => {
  try {
    const { medications, allergies, patient_age, weight_kg, conditions } = req.body;
    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ error: 'medications must be a non-empty array.' });
    }

    const formularyR = await db.query('SELECT name, drug_class, schedule, contraindications FROM medications WHERE controlled_substance = true OR drug_class IS NOT NULL LIMIT 200').catch(() => ({ rows: [] }));

    const userPrompt = `Check for drug interactions, allergies, and dosage issues for the medications about to be administered.

Medications about to be given:
${JSON.stringify(medications, null, 2)}

Patient allergies: ${allergies || 'NKDA'}
Patient age: ${patient_age || 'unknown'}
Weight (kg): ${weight_kg || 'unknown'}
Active conditions: ${conditions || 'unknown'}

Agency Formulary (for reference):
${JSON.stringify(formularyR.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "interactions": [
    { "drug_a": "string", "drug_b": "string", "severity": "minor|moderate|major|contraindicated", "mechanism": "string", "recommendation": "string" }
  ],
  "allergy_conflicts": [{ "drug": "string", "allergy": "string", "severity": "string" }],
  "dosage_warnings": [{ "drug": "string", "issue": "string", "recommended_dose": "string" }],
  "overall_safety": "safe|caution|do_not_administer",
  "summary": "string"
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are a clinical pharmacology safety AI. Identify drug-drug, drug-allergy, and dose problems with conservative, safety-first reasoning.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'drug-interaction', { meds: medications.length }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /mutual-aid-optimizer - Mutual Aid Optimizer
// FIXED: mutual_aid_agencies table now exists (created by mutualAidAgencies route)
// ---------------------------------------------------------------------------
router.post('/mutual-aid-optimizer', auth, requireRole(...DISPATCH_ROLES), aiRateLimiter, async (req, res) => {
  try {
    const { hours_ahead = 6 } = req.body || {};
    const lookAhead = Math.min(72, Math.max(1, parseInt(hours_ahead)));

    const unitsR = await db.query('SELECT id, unit_number, status, capability_level FROM units').catch(() => ({ rows: [] }));
    const callPatternsR = await db.query(
      `SELECT EXTRACT(HOUR FROM created_at) AS hour_of_day, COUNT(*) AS cnt
       FROM calls WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY hour_of_day ORDER BY hour_of_day`
    ).catch(() => ({ rows: [] }));
    const mutualAidR = await db.query('SELECT * FROM mutual_aid_agencies WHERE status = \'active\' LIMIT 30').catch(() => ({ rows: [] }));

    const userPrompt = `Predict EMS coverage gaps over the next ${lookAhead} hours and recommend proactive mutual aid requests.

Units (current status):
${JSON.stringify(unitsR.rows, null, 2)}

Call patterns (last 30 days, by hour of day):
${JSON.stringify(callPatternsR.rows, null, 2)}

Mutual aid agencies:
${JSON.stringify(mutualAidR.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "horizon_hours": ${lookAhead},
  "predicted_gaps": [
    { "starts_at": "ISO", "ends_at": "ISO", "zone": "string", "shortfall_units": 0, "risk_level": "low|medium|high|critical" }
  ],
  "mutual_aid_requests": [
    { "agency": "string", "request_at": "ISO", "units_requested": 0, "duration_hours": 0, "rationale": "string" }
  ],
  "summary": "string"
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' Proactively prevent coverage gaps with mutual aid. Respond ONLY with valid JSON.', userPrompt, 0.3);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'mutual-aid-optimizer', { lookAhead }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /caller-script - Caller Reassurance Script Generator
// ---------------------------------------------------------------------------
router.post('/caller-script', auth, aiRateLimiter, async (req, res) => {
  try {
    const { chief_complaint, patient_age, vitals, time_to_arrival_minutes } = req.body;
    if (!chief_complaint) return res.status(400).json({ error: 'chief_complaint is required.' });

    const userPrompt = `Generate caller instructions to provide while EMS is en route.

Chief complaint: ${chief_complaint}
Patient age: ${patient_age || 'unknown'}
Vitals: ${vitals ? JSON.stringify(vitals) : 'unknown'}
ETA (minutes): ${time_to_arrival_minutes || 'unknown'}

Respond ONLY with valid JSON:
{
  "reassurance_intro": "string (calm, supportive)",
  "step_by_step_instructions": [
    { "step": 1, "instruction": "string", "duration_seconds": 0 }
  ],
  "warning_signs_to_report": ["string"],
  "do_not_do": ["string"],
  "estimated_total_seconds": 0,
  "follow_up_question_for_caller": "string"
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are an Emergency Medical Dispatcher generating caller pre-arrival instructions. Use plain language at a 6th-grade reading level. Always include reassurance.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'caller-script', { chief_complaint }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /qi-dashboard - Quality Improvement Dashboard
// ---------------------------------------------------------------------------
router.post('/qi-dashboard', auth, requireRole('supervisor'), aiRateLimiter, async (req, res) => {
  try {
    const qaR = await db.query('SELECT * FROM qa_reviews ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] }));
    const outcomesR = await db.query(
      `SELECT call_type, priority, COUNT(*) AS cnt FROM calls
       WHERE created_at > NOW() - INTERVAL '90 days'
       GROUP BY call_type, priority ORDER BY cnt DESC LIMIT 50`
    ).catch(() => ({ rows: [] }));

    const userPrompt = `Analyze recent QA review scores and clinical outcomes and identify training topics + protocols needing updates.

Recent QA Reviews (last 100):
${JSON.stringify(qaR.rows, null, 2)}

Clinical outcomes / call patterns (90 days):
${JSON.stringify(outcomesR.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "kpis": {
    "average_qa_score": 0,
    "trend_pct_change_30d": 0,
    "compliance_rate_pct": 0
  },
  "training_topics": [
    { "topic": "string", "rationale": "string", "priority": "low|medium|high" }
  ],
  "protocols_to_update": [
    { "protocol": "string", "issue": "string", "recommended_change": "string" }
  ],
  "high_performers": ["string"],
  "needs_remediation": ["string"],
  "summary": "string"
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are an EMS Medical Director performing CQI analysis. Respond ONLY with valid JSON.', userPrompt, 0.3);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'qi-dashboard', { qa_count: qaR.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /post-call-debrief - Post-Call Debrief Generator
// ---------------------------------------------------------------------------
router.post('/post-call-debrief', auth, requireRole(...PCR_ROLES), aiRateLimiter, async (req, res) => {
  try {
    const { call_id, call_type, chief_complaint, outcome, interventions, crew_feedback } = req.body;
    if (!chief_complaint || !call_type) {
      return res.status(400).json({ error: 'call_type and chief_complaint are required.' });
    }

    const userPrompt = `Generate a structured crew debrief for this call (especially if trauma, pediatric, cardiac, or psych).

Call ID: ${call_id || 'unspecified'}
Call type: ${call_type}
Chief complaint: ${chief_complaint}
Outcome: ${outcome || 'unspecified'}
Interventions: ${interventions || 'unspecified'}
Crew feedback: ${crew_feedback || 'none provided'}

Respond ONLY with valid JSON:
{
  "summary": "string",
  "what_went_well": ["string"],
  "improvement_opportunities": ["string"],
  "learning_points": ["string"],
  "wellness_check": {
    "stress_indicators_observed": ["string"],
    "recommended_resources": ["string"]
  },
  "follow_up_actions": [{ "action": "string", "owner": "string", "due_in_days": 0 }]
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are an EMS supervisor facilitating a critical-incident debrief. Be supportive, evidence-based, and constructive.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'post-call-debrief', { call_id, call_type }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
