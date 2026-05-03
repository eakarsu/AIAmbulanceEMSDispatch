const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const callSchema = {
  call_number: { required: true, type: 'string', maxLength: 50 },
  call_type: { required: true, type: 'string', maxLength: 100 },
  priority: { type: 'number', min: 1, max: 4 },
  patient_age: { type: 'number', min: 0, max: 150 },
};

// ---------------------------------------------------------------------------
// HIPAA audit log helper
// ---------------------------------------------------------------------------
async function auditCallAccess(req, callId) {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_id, entity_type, ip_address)
       VALUES ($1, 'VIEW_CALL', $2, 'call', $3)`,
      [userId, callId, ip]
    );
  } catch {
    // Audit failures must not block the primary request
  }
}

// ---------------------------------------------------------------------------
// GET all calls (with optional ?status=, ?priority=, pagination ?page=&limit=)
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    let baseQuery = 'FROM calls';
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Count total
    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Fetch page
    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT * ${baseQuery} ORDER BY id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET call by id — HIPAA audit logged
// ---------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM calls WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    // HIPAA audit trail
    await auditCallAccess(req, req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST create call
// ---------------------------------------------------------------------------
router.post('/', auth, validate(callSchema), async (req, res) => {
  try {
    const {
      call_number, call_type, priority, status, caller_name, caller_phone,
      patient_name, patient_age, patient_gender, location_address, location_lat, location_lng,
      chief_complaint, description, assigned_unit_id, dispatch_time, en_route_time,
      on_scene_time, transport_time, hospital_arrival_time, clear_time,
      response_time_seconds, destination_hospital, ai_triage_score, ai_triage_reasoning
    } = req.body;

    const result = await db.query(
      `INSERT INTO calls (call_number, call_type, priority, status, caller_name, caller_phone,
       patient_name, patient_age, patient_gender, location_address, location_lat, location_lng,
       chief_complaint, description, assigned_unit_id, dispatch_time, en_route_time,
       on_scene_time, transport_time, hospital_arrival_time, clear_time,
       response_time_seconds, destination_hospital, ai_triage_score, ai_triage_reasoning)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [call_number, call_type, priority || 3, status || 'pending', caller_name, caller_phone,
       patient_name, patient_age, patient_gender, location_address, location_lat, location_lng,
       chief_complaint, description, assigned_unit_id, dispatch_time, en_route_time,
       on_scene_time, transport_time, hospital_arrival_time, clear_time,
       response_time_seconds, destination_hospital, ai_triage_score, ai_triage_reasoning]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT update call
// ---------------------------------------------------------------------------
router.put('/:id', auth, validate(callSchema), async (req, res) => {
  try {
    const {
      call_number, call_type, priority, status, caller_name, caller_phone,
      patient_name, patient_age, patient_gender, location_address, location_lat, location_lng,
      chief_complaint, description, assigned_unit_id, dispatch_time, en_route_time,
      on_scene_time, transport_time, hospital_arrival_time, clear_time,
      response_time_seconds, destination_hospital, ai_triage_score, ai_triage_reasoning
    } = req.body;

    const result = await db.query(
      `UPDATE calls SET call_number=$1, call_type=$2, priority=$3, status=$4, caller_name=$5, caller_phone=$6,
       patient_name=$7, patient_age=$8, patient_gender=$9, location_address=$10, location_lat=$11, location_lng=$12,
       chief_complaint=$13, description=$14, assigned_unit_id=$15, dispatch_time=$16, en_route_time=$17,
       on_scene_time=$18, transport_time=$19, hospital_arrival_time=$20, clear_time=$21,
       response_time_seconds=$22, destination_hospital=$23, ai_triage_score=$24, ai_triage_reasoning=$25
       WHERE id = $26 RETURNING *`,
      [call_number, call_type, priority, status, caller_name, caller_phone,
       patient_name, patient_age, patient_gender, location_address, location_lat, location_lng,
       chief_complaint, description, assigned_unit_id, dispatch_time, en_route_time,
       on_scene_time, transport_time, hospital_arrival_time, clear_time,
       response_time_seconds, destination_hospital, ai_triage_score, ai_triage_reasoning, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE call
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM calls WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    res.json({ message: 'Call deleted.', call: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
