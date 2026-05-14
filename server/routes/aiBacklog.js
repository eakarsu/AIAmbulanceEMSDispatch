/**
 * AI backlog endpoints (apply pass 5 — full backlog).
 *
 * Env vars consumed:
 *   - OPENROUTER_API_KEY        (LLM endpoints — 503 + missing if unset)
 *   - OPENROUTER_MODEL          (defaults to anthropic/claude-3-5-sonnet-20241022)
 *   - CAD_API_URL, CAD_API_KEY  (CAD integration — 503 + missing if unset)
 *   - EHR_FHIR_URL, EHR_FHIR_TOKEN (Hospital EHR — 503 + missing if unset)
 *
 * Categories:
 *   - patient-outcome-prediction       MECHANICAL (text-only LLM)  PRODUCT-DECISION on outcome model: "30-day survival + functional"
 *   - cardiac-arrest-outcome           MECHANICAL (text-only LLM)  PRODUCT-DECISION: ROSC / 30-day survival / CPC neuro
 *   - staffing-optimization            MECHANICAL (text-only LLM)  PRODUCT-DECISION: optimize per-shift unit count vs predicted demand
 *   - community-paramedicine-pathway   MECHANICAL (text-only LLM)  PRODUCT-DECISION: super-utilizer detection threshold = >=4 calls / 90d
 *   - cad-integration                  NEEDS-CREDS (RapidSOS / ECC API)
 *   - ehr-integration                  NEEDS-CREDS (Epic / Cerner FHIR)
 *   - training-simulator-scenario      TOO-RISKY  (additive only; in-memory scenario stub seeded on first POST)
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const db = require('../db');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const EMS_SYSTEM_PROMPT = 'You are an AI assistant serving as an EMS Medical Director advisor for an ambulance dispatch platform. You have extensive knowledge of pre-hospital care protocols, NEMSIS standards, and EMS operations. Always prioritize patient safety and evidence-based medicine. Respond with valid JSON only — no markdown.';

// ---------------------------------------------------------------------------
// Idempotent table for training simulator scenarios (TOO-RISKY in-memory stub
// fronted by a CREATE-IF-NOT-EXISTS table for persistence; failure tolerated).
// ---------------------------------------------------------------------------
async function ensureSimulatorTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS training_simulator_scenarios (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        difficulty VARCHAR(50),
        scenario_payload JSONB,
        created_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error('[aiBacklog] simulator table create failed:', err.message);
  }
}
(async () => { await ensureSimulatorTable(); })();

// In-memory fallback when DB unavailable (TOO-RISKY guard rail)
const simulatorMemory = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function requireKey(res) {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
    return false;
  }
  return true;
}

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

async function callOpenRouter(systemPrompt, userPrompt, temperature = 0.3) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

async function saveAIResult(userId, analysisType, inputData, result) {
  try {
    await db.query(
      'INSERT INTO ai_results (user_id, analysis_type, input_data, result, model) VALUES ($1, $2, $3, $4, $5)',
      [userId || null, analysisType, JSON.stringify(inputData), JSON.stringify(result), OPENROUTER_MODEL]
    );
  } catch (e) {
    if (!e.message.includes('does not exist')) console.error('[aiBacklog] saveAIResult:', e.message);
  }
}

// ---------------------------------------------------------------------------
// 1. Patient outcome prediction (post-hospital)
// PRODUCT-DECISION: model = 30-day survival + functional disposition (home/SNF/rehab/deceased).
// ---------------------------------------------------------------------------
router.post('/patient-outcome-prediction', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { call_id, chief_complaint, age, comorbidities, vitals, interventions, transport_destination } = req.body || {};
    if (!chief_complaint && !call_id) {
      return res.status(400).json({ error: 'chief_complaint or call_id is required' });
    }
    const userPrompt = `Predict 30-day post-hospital outcome.

Call: ${JSON.stringify({ call_id, chief_complaint, age, comorbidities, vitals, interventions, transport_destination })}

Respond ONLY with valid JSON:
{
  "survival_30d_probability": 0-100,
  "functional_disposition_likelihood": {"home": 0-100, "rehab": 0-100, "snf": 0-100, "deceased": 0-100},
  "key_drivers": [string],
  "modifiable_factors": [string],
  "follow_up_recommendations": [string],
  "confidence": 0-100
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are estimating post-hospital outcome based on pre-hospital data only. Be calibrated; flag uncertainty.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'patient-outcome-prediction', { call_id, chief_complaint }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Cardiac arrest outcome prediction
// PRODUCT-DECISION: outcomes = ROSC, 30-day survival, CPC neurological category.
// ---------------------------------------------------------------------------
router.post('/cardiac-outcome-prediction', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { age, witnessed, bystander_cpr, initial_rhythm, time_to_cpr_min, time_to_defib_min, rosc_in_field, etiology } = req.body || {};
    if (initial_rhythm == null && !age) {
      return res.status(400).json({ error: 'At least one of initial_rhythm or age is required' });
    }
    const userPrompt = `Estimate cardiac arrest outcomes (Utstein-style).

Inputs: ${JSON.stringify({ age, witnessed, bystander_cpr, initial_rhythm, time_to_cpr_min, time_to_defib_min, rosc_in_field, etiology })}

Respond ONLY with valid JSON:
{
  "rosc_probability": 0-100,
  "survival_to_hospital_discharge_probability": 0-100,
  "favorable_neuro_cpc1_2_probability": 0-100,
  "key_modifiers": [string],
  "evidence_based_actions": [string],
  "confidence": 0-100
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are estimating OHCA outcomes per AHA / Utstein guidelines. Be calibrated; emphasize bystander-CPR and shockable-rhythm signals.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'cardiac-outcome-prediction', { age, initial_rhythm }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Staffing optimization
// PRODUCT-DECISION: optimize per-shift unit count vs forecasted demand for next 7 days.
// ---------------------------------------------------------------------------
router.post('/staffing-optimization', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { lookback_days, horizon_days } = req.body || {};
    const lb = Math.min(180, Math.max(7, parseInt(lookback_days, 10) || 30));
    const hz = Math.min(30, Math.max(1, parseInt(horizon_days, 10) || 7));

    let calls = [];
    let units = [];
    let schedules = [];
    try {
      const r = await db.query(
        `SELECT id, priority, call_type, created_at FROM calls WHERE created_at > NOW() - INTERVAL '${lb} days' ORDER BY created_at DESC LIMIT 1000`
      );
      calls = r.rows;
    } catch {}
    try { const r = await db.query('SELECT id, unit_number, status FROM units LIMIT 200'); units = r.rows; } catch {}
    try { const r = await db.query('SELECT shift_start, shift_end, crew_id FROM schedules ORDER BY shift_start DESC LIMIT 200'); schedules = r.rows; } catch {}

    const userPrompt = `Optimize ambulance unit staffing.

Lookback: ${lb} days. Horizon: ${hz} days.
Recent calls (sample): ${JSON.stringify(calls.slice(0, 200))}
Available units: ${JSON.stringify(units)}
Recent schedules (sample): ${JSON.stringify(schedules.slice(0, 100))}

Respond ONLY with valid JSON:
{
  "demand_forecast": [{"date": "YYYY-MM-DD", "expected_calls": number, "peak_hour": "HH:00"}],
  "recommended_staffing": [{"shift": "day|evening|night", "weekday": "Mon-Sun", "units": number, "rationale": string}],
  "coverage_gaps": [string],
  "fatigue_risks": [string],
  "estimated_cost_impact": "increase|decrease|neutral",
  "confidence": 0-100
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are optimizing EMS unit staffing using historical demand and current rosters.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'staffing-optimization', { lookback_days: lb, horizon_days: hz }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Community paramedicine pathway
// PRODUCT-DECISION: super-utilizer threshold = >=4 EMS calls in 90 days OR >=2 BLS-only transports in 30 days.
// ---------------------------------------------------------------------------
router.post('/community-paramedicine-pathway', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { patient_id, demographics, call_history, comorbidities, social_determinants } = req.body || {};

    let calls = [];
    if (patient_id) {
      try {
        const r = await db.query(
          "SELECT id, chief_complaint, priority, call_type, created_at FROM calls WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50",
          [patient_id]
        );
        calls = r.rows;
      } catch {}
    }

    const userPrompt = `Recommend a community paramedicine pathway.

Patient: ${JSON.stringify({ patient_id, demographics, comorbidities, social_determinants })}
EMS call history (DB or supplied): ${JSON.stringify(calls.length ? calls : (call_history || []))}

PRODUCT-DECISION: a "super-utilizer" qualifies for enrollment when >=4 EMS calls in 90 days OR >=2 BLS-only transports in 30 days.

Respond ONLY with valid JSON:
{
  "super_utilizer": true|false,
  "enrollment_recommendation": "enroll|monitor|decline",
  "pathway_track": "chronic_disease|behavioral_health|hospice|frequent_faller|other",
  "intervention_plan": [{"action": string, "frequency": string, "owner": string}],
  "social_determinants_addressed": [string],
  "estimated_call_reduction_percent": 0-100,
  "follow_up_window_days": 1-90,
  "rationale": string
}`;
    const aiResponse = await callOpenRouter(EMS_SYSTEM_PROMPT + ' You are designing community paramedicine (mobile integrated healthcare) pathways for super-utilizers. Be evidence-based.', userPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAIResult(userId, 'community-paramedicine-pathway', { patient_id }, parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. CAD (Computer-Aided Dispatch) integration — NEEDS-CREDS.
// Env: CAD_API_URL, CAD_API_KEY (RapidSOS / ECC vendor).
// ---------------------------------------------------------------------------
router.post('/cad-integration/sync', auth, async (req, res) => {
  try {
    const missing = [];
    if (!process.env.CAD_API_URL) missing.push('CAD_API_URL');
    if (!process.env.CAD_API_KEY) missing.push('CAD_API_KEY');
    if (missing.length) return res.status(503).json({ error: 'CAD integration not configured', missing: missing.join(',') });

    // Defensive: only attempt outbound if both creds present.
    const r = await fetch(`${process.env.CAD_API_URL}/incidents`, {
      headers: { 'Authorization': `Bearer ${process.env.CAD_API_KEY}` },
    });
    const txt = await r.text();
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, body: txt.slice(0, 4000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Hospital EHR (FHIR) integration — NEEDS-CREDS.
// Env: EHR_FHIR_URL, EHR_FHIR_TOKEN (Epic / Cerner).
// ---------------------------------------------------------------------------
router.get('/ehr-integration/bed-status', auth, async (req, res) => {
  try {
    const missing = [];
    if (!process.env.EHR_FHIR_URL) missing.push('EHR_FHIR_URL');
    if (!process.env.EHR_FHIR_TOKEN) missing.push('EHR_FHIR_TOKEN');
    if (missing.length) return res.status(503).json({ error: 'Hospital EHR not configured', missing: missing.join(',') });

    const r = await fetch(`${process.env.EHR_FHIR_URL}/Location?status=active&type=bd`, {
      headers: { 'Authorization': `Bearer ${process.env.EHR_FHIR_TOKEN}`, 'Accept': 'application/fhir+json' },
    });
    const txt = await r.text();
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, body: txt.slice(0, 4000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Training simulator scenario — TOO-RISKY: additive only, in-memory + idempotent table.
// Generates a synthetic scenario via LLM (if key set) or returns canned stub.
// ---------------------------------------------------------------------------
router.post('/training-simulator/scenario', auth, aiRateLimiter, async (req, res) => {
  try {
    const { category = 'cardiac', difficulty = 'intermediate', title } = req.body || {};
    let scenario;

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const aiResponse = await callOpenRouter(
          EMS_SYSTEM_PROMPT + ' Generate a single tabletop EMS training scenario as JSON.',
          `Generate one EMS training scenario.

Category: ${category}
Difficulty: ${difficulty}
Title hint: ${title || 'auto'}

Respond ONLY with valid JSON:
{
  "title": string,
  "category": string,
  "difficulty": "novice|intermediate|advanced",
  "patient_presentation": string,
  "vitals_initial": {"hr": number, "bp_sys": number, "bp_dia": number, "spo2": number, "rr": number, "gcs": number},
  "stages": [{"stage": number, "stimulus": string, "expected_actions": [string], "scoring_criteria": [string]}],
  "debrief_points": [string]
}`
        );
        scenario = parseAIJson(aiResponse) || { raw_response: aiResponse, category, difficulty };
      } catch {
        scenario = null;
      }
    }

    // In-memory canned fallback when no key or AI failure
    if (!scenario) {
      scenario = {
        title: title || `Stub: ${category} ${difficulty} scenario`,
        category,
        difficulty,
        patient_presentation: 'Synthetic patient presentation (LLM unavailable; canned stub).',
        vitals_initial: { hr: 110, bp_sys: 90, bp_dia: 60, spo2: 92, rr: 24, gcs: 14 },
        stages: [{ stage: 1, stimulus: 'On-scene initial assessment', expected_actions: ['Scene safety', 'Primary survey'], scoring_criteria: ['ABCs identified'] }],
        debrief_points: ['Communication', 'Protocol adherence'],
      };
    }

    const userId = req.user?.id || req.user?.userId;
    let saved = null;
    try {
      const r = await db.query(
        'INSERT INTO training_simulator_scenarios (title, category, difficulty, scenario_payload, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [scenario.title || null, category, difficulty, JSON.stringify(scenario), userId || null]
      );
      saved = r.rows?.[0] || null;
    } catch {
      // fall through to in-memory
      simulatorMemory.push({ id: simulatorMemory.length + 1, ...scenario, created_by: userId || null });
      saved = { id: simulatorMemory.length };
    }

    res.json({ scenario, saved_id: saved?.id || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/training-simulator/scenarios', auth, async (req, res) => {
  try {
    let rows = [];
    try {
      const r = await db.query('SELECT id, title, category, difficulty, created_at FROM training_simulator_scenarios ORDER BY id DESC LIMIT 50');
      rows = r.rows;
    } catch {
      rows = simulatorMemory.slice(-50).reverse().map((s) => ({ id: s.id, title: s.title, category: s.category, difficulty: s.difficulty }));
    }
    res.json({ scenarios: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
