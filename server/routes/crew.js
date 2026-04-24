const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all crew
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM crew ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET crew by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM crew WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create crew member
router.post('/', auth, async (req, res) => {
  try {
    const {
      employee_id, first_name, last_name, role, certification_level, certification_expiry,
      phone, email, hire_date, assigned_unit_id, status, hours_this_week,
      consecutive_hours, fatigue_risk_level
    } = req.body;

    const result = await db.query(
      `INSERT INTO crew (employee_id, first_name, last_name, role, certification_level, certification_expiry,
       phone, email, hire_date, assigned_unit_id, status, hours_this_week, consecutive_hours, fatigue_risk_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [employee_id, first_name, last_name, role, certification_level, certification_expiry,
       phone, email, hire_date, assigned_unit_id, status || 'active', hours_this_week || 0,
       consecutive_hours || 0, fatigue_risk_level || 'low']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update crew member
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      employee_id, first_name, last_name, role, certification_level, certification_expiry,
      phone, email, hire_date, assigned_unit_id, status, hours_this_week,
      consecutive_hours, fatigue_risk_level
    } = req.body;

    const result = await db.query(
      `UPDATE crew SET employee_id=$1, first_name=$2, last_name=$3, role=$4, certification_level=$5,
       certification_expiry=$6, phone=$7, email=$8, hire_date=$9, assigned_unit_id=$10, status=$11,
       hours_this_week=$12, consecutive_hours=$13, fatigue_risk_level=$14
       WHERE id = $15 RETURNING *`,
      [employee_id, first_name, last_name, role, certification_level, certification_expiry,
       phone, email, hire_date, assigned_unit_id, status, hours_this_week,
       consecutive_hours, fatigue_risk_level, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE crew member
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM crew WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }
    res.json({ message: 'Crew member deleted.', crew: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
