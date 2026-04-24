const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all calls (with optional ?status= and ?priority= filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT * FROM calls';
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
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET call by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM calls WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create call
router.post('/', auth, async (req, res) => {
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

// PUT update call
router.put('/:id', auth, async (req, res) => {
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

// DELETE call
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
