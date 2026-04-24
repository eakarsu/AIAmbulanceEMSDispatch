const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all certifications (JOIN with crew for names)
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cert.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       FROM certifications cert
       LEFT JOIN crew c ON cert.crew_id = c.id
       ORDER BY cert.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET certification by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cert.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       FROM certifications cert
       LEFT JOIN crew c ON cert.crew_id = c.id
       WHERE cert.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certification not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create certification
router.post('/', auth, async (req, res) => {
  try {
    const {
      crew_id, certification_type, certification_number, issuing_authority,
      issue_date, expiry_date, status, ce_hours_completed, ce_hours_required
    } = req.body;

    const result = await db.query(
      `INSERT INTO certifications (crew_id, certification_type, certification_number, issuing_authority,
       issue_date, expiry_date, status, ce_hours_completed, ce_hours_required)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [crew_id, certification_type, certification_number, issuing_authority,
       issue_date, expiry_date, status || 'active', ce_hours_completed || 0, ce_hours_required || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update certification
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      crew_id, certification_type, certification_number, issuing_authority,
      issue_date, expiry_date, status, ce_hours_completed, ce_hours_required
    } = req.body;

    const result = await db.query(
      `UPDATE certifications SET crew_id=$1, certification_type=$2, certification_number=$3,
       issuing_authority=$4, issue_date=$5, expiry_date=$6, status=$7,
       ce_hours_completed=$8, ce_hours_required=$9
       WHERE id = $10 RETURNING *`,
      [crew_id, certification_type, certification_number, issuing_authority,
       issue_date, expiry_date, status, ce_hours_completed, ce_hours_required, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certification not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE certification
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM certifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certification not found.' });
    }
    res.json({ message: 'Certification deleted.', certification: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
