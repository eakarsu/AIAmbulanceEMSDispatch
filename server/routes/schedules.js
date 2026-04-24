const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all schedules (JOIN with crew for names)
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       FROM schedules s
       LEFT JOIN crew c ON s.crew_id = c.id
       ORDER BY s.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET schedule by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       FROM schedules s
       LEFT JOIN crew c ON s.crew_id = c.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create schedule
router.post('/', auth, async (req, res) => {
  try {
    const { crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes } = req.body;
    const result = await db.query(
      `INSERT INTO schedules (crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status || 'scheduled', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update schedule
router.put('/:id', auth, async (req, res) => {
  try {
    const { crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes } = req.body;
    const result = await db.query(
      `UPDATE schedules SET crew_id=$1, shift_type=$2, shift_start=$3, shift_end=$4,
       assigned_unit_id=$5, status=$6, notes=$7
       WHERE id = $8 RETURNING *`,
      [crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json({ message: 'Schedule deleted.', schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
