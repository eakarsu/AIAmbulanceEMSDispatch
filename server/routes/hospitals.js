const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all hospitals
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM hospitals ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET hospital by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM hospitals WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create hospital
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, address, lat, lng, phone, er_status, trauma_level,
      stroke_center, cardiac_center, burn_center, pediatric_center,
      available_beds, er_wait_minutes
    } = req.body;

    const result = await db.query(
      `INSERT INTO hospitals (name, address, lat, lng, phone, er_status, trauma_level,
       stroke_center, cardiac_center, burn_center, pediatric_center, available_beds, er_wait_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, address, lat, lng, phone, er_status || 'open', trauma_level,
       stroke_center || false, cardiac_center || false, burn_center || false, pediatric_center || false,
       available_beds || 0, er_wait_minutes || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update hospital
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name, address, lat, lng, phone, er_status, trauma_level,
      stroke_center, cardiac_center, burn_center, pediatric_center,
      available_beds, er_wait_minutes
    } = req.body;

    const result = await db.query(
      `UPDATE hospitals SET name=$1, address=$2, lat=$3, lng=$4, phone=$5, er_status=$6, trauma_level=$7,
       stroke_center=$8, cardiac_center=$9, burn_center=$10, pediatric_center=$11,
       available_beds=$12, er_wait_minutes=$13, last_updated=NOW()
       WHERE id = $14 RETURNING *`,
      [name, address, lat, lng, phone, er_status, trauma_level,
       stroke_center, cardiac_center, burn_center, pediatric_center,
       available_beds, er_wait_minutes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE hospital
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM hospitals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }
    res.json({ message: 'Hospital deleted.', hospital: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
