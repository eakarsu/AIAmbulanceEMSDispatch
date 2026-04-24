const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all units (with optional ?status= filter)
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM units';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY id DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unit by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM units WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create unit
router.post('/', auth, async (req, res) => {
  try {
    const { unit_number, unit_type, status, current_lat, current_lng, station, crew_lead, capability_level } = req.body;
    const result = await db.query(
      `INSERT INTO units (unit_number, unit_type, status, current_lat, current_lng, station, crew_lead, capability_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [unit_number, unit_type, status || 'available', current_lat, current_lng, station, crew_lead, capability_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update unit
router.put('/:id', auth, async (req, res) => {
  try {
    const { unit_number, unit_type, status, current_lat, current_lng, station, crew_lead, capability_level } = req.body;
    const result = await db.query(
      `UPDATE units SET unit_number = $1, unit_type = $2, status = $3, current_lat = $4, current_lng = $5,
       station = $6, crew_lead = $7, capability_level = $8, last_status_change = NOW()
       WHERE id = $9 RETURNING *`,
      [unit_number, unit_type, status, current_lat, current_lng, station, crew_lead, capability_level, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE unit
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM units WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    res.json({ message: 'Unit deleted.', unit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
