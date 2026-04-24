const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;

const EMS_SYSTEM_PROMPT = `You are an AI assistant serving as an EMS Medical Director advisor for an ambulance dispatch platform. You have extensive knowledge of emergency medical services, pre-hospital care protocols, NFIRS/NEMSIS standards, and EMS operations. Provide precise, clinically sound, and operationally practical recommendations. Always prioritize patient safety and evidence-based medicine.`;

async function callOpenRouter(systemPrompt, userPrompt) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJsonFromAI(text) {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return { raw_response: text };
  }
}

// POST /triage - AI-generated triage priority score
router.post('/triage', auth, async (req, res) => {
  try {
    const { description, caller_info, patient_age, patient_gender } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Call description is required.' });
    }

    const userPrompt = `Analyze the following emergency call and provide a triage priority score.

Call Description: ${description}
${caller_info ? `Caller Info: ${caller_info}` : ''}
${patient_age ? `Patient Age: ${patient_age}` : ''}
${patient_gender ? `Patient Gender: ${patient_gender}` : ''}

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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /unit-selection - Optimal unit recommendation
router.post('/unit-selection', auth, async (req, res) => {
  try {
    const { call_location, call_type, priority, available_units } = req.body;
    if (!call_location || !call_type) {
      return res.status(400).json({ error: 'Call location and call type are required.' });
    }

    // Get available units from DB if not provided
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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /pcr-draft - AI-drafted patient care report narrative
router.post('/pcr-draft', auth, async (req, res) => {
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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /protocol - Protocol recommendation based on chief complaint and vitals
router.post('/protocol', auth, async (req, res) => {
  try {
    const { chief_complaint, vitals, patient_age, patient_gender, medical_history, allergies } = req.body;
    if (!chief_complaint) {
      return res.status(400).json({ error: 'Chief complaint is required.' });
    }

    // Fetch available protocols from DB
    const protocolsResult = await db.query('SELECT protocol_number, title, category FROM protocols');
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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /demand-forecast - Resource demand forecast
router.post('/demand-forecast', auth, async (req, res) => {
  try {
    const { date_range_start, date_range_end, forecast_period_days } = req.body;

    // Fetch historical metrics
    let metricsQuery = 'SELECT * FROM performance_metrics ORDER BY metric_date DESC LIMIT 90';
    const metricsResult = await db.query(metricsQuery);

    // Fetch recent call volume patterns
    const callPatterns = await db.query(
      `SELECT DATE(created_at) as call_date, COUNT(*) as call_count, AVG(priority) as avg_priority
       FROM calls GROUP BY DATE(created_at) ORDER BY call_date DESC LIMIT 90`
    );

    const userPrompt = `Analyze the following historical EMS data and forecast resource demand.

Forecast Period: ${forecast_period_days || 7} days
${date_range_start ? `Start Date: ${date_range_start}` : ''}
${date_range_end ? `End Date: ${date_range_end}` : ''}

Historical Performance Metrics (last 90 days):
${JSON.stringify(metricsResult.rows, null, 2)}

Daily Call Patterns (last 90 days):
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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /fatigue-analysis - Crew fatigue risk analysis
router.post('/fatigue-analysis', auth, async (req, res) => {
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

    // Fetch recent schedules for the crew
    const crewIdList = crewResult.rows.map(c => c.id);
    const schedulesResult = await db.query(
      `SELECT * FROM schedules WHERE crew_id = ANY($1) AND shift_end > NOW() - INTERVAL '7 days' ORDER BY shift_start DESC`,
      [crewIdList]
    );

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

    const parsed = parseJsonFromAI(aiResponse);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
