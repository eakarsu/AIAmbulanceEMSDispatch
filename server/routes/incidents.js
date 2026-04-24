const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all incidents
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM incidents ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET incident by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create incident
router.post('/', auth, async (req, res) => {
  try {
    const {
      incident_number, call_id, incident_type, location_address, lat, lng,
      date_time, units_involved, patients_count, severity, nfirs_code,
      nemsis_code, narrative, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO incidents (incident_number, call_id, incident_type, location_address, lat, lng,
       date_time, units_involved, patients_count, severity, nfirs_code, nemsis_code, narrative, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [incident_number, call_id, incident_type, location_address, lat, lng,
       date_time, units_involved, patients_count || 1, severity, nfirs_code,
       nemsis_code, narrative, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update incident
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      incident_number, call_id, incident_type, location_address, lat, lng,
      date_time, units_involved, patients_count, severity, nfirs_code,
      nemsis_code, narrative, status
    } = req.body;

    const result = await db.query(
      `UPDATE incidents SET incident_number=$1, call_id=$2, incident_type=$3, location_address=$4,
       lat=$5, lng=$6, date_time=$7, units_involved=$8, patients_count=$9, severity=$10,
       nfirs_code=$11, nemsis_code=$12, narrative=$13, status=$14
       WHERE id = $15 RETURNING *`,
      [incident_number, call_id, incident_type, location_address, lat, lng,
       date_time, units_involved, patients_count, severity, nfirs_code,
       nemsis_code, narrative, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE incident
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM incidents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found.' });
    }
    res.json({ message: 'Incident deleted.', incident: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
