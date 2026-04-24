const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all equipment
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM equipment ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET equipment by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create equipment
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes } = req.body;
    const result = await db.query(
      `INSERT INTO equipment (name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, category, unit_id, serial_number, status || 'operational', last_inspected, next_inspection_due, quantity || 1, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update equipment
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes } = req.body;
    const result = await db.query(
      `UPDATE equipment SET name=$1, category=$2, unit_id=$3, serial_number=$4, status=$5,
       last_inspected=$6, next_inspection_due=$7, quantity=$8, notes=$9
       WHERE id = $10 RETURNING *`,
      [name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE equipment
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }
    res.json({ message: 'Equipment deleted.', equipment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
