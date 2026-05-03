const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const incidentSchema = {
  incident_number: { required: true, type: 'string', maxLength: 50 },
  incident_type: { required: true, type: 'string', maxLength: 100 },
  severity: { enum: ['Minor', 'Moderate', 'Major', 'Mass Casualty', ''] },
  patients_count: { type: 'number', min: 0 },
};

// GET all incidents (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, severity } = req.query;

    let baseQuery = 'FROM incidents';
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
    if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

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
router.post('/', auth, validate(incidentSchema), async (req, res) => {
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
      [incident_number, call_id || null, incident_type, location_address || null,
       lat || null, lng || null, date_time || null, units_involved || null,
       patients_count || 1, severity || null, nfirs_code || null,
       nemsis_code || null, narrative || null, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update incident
router.put('/:id', auth, validate(incidentSchema), async (req, res) => {
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
      [incident_number, call_id || null, incident_type, location_address || null,
       lat || null, lng || null, date_time || null, units_involved || null,
       patients_count, severity || null, nfirs_code || null,
       nemsis_code || null, narrative || null, status, req.params.id]
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
