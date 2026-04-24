const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all vehicle maintenance records
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vehicle_maintenance ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET maintenance record by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vehicle_maintenance WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create maintenance record
router.post('/', auth, async (req, res) => {
  try {
    const {
      unit_id, maintenance_type, description, scheduled_date, completed_date,
      mileage, cost, vendor, status, next_due_date, next_due_mileage, notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO vehicle_maintenance (unit_id, maintenance_type, description, scheduled_date, completed_date,
       mileage, cost, vendor, status, next_due_date, next_due_mileage, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [unit_id, maintenance_type, description, scheduled_date, completed_date,
       mileage, cost, vendor, status || 'scheduled', next_due_date, next_due_mileage, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update maintenance record
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      unit_id, maintenance_type, description, scheduled_date, completed_date,
      mileage, cost, vendor, status, next_due_date, next_due_mileage, notes
    } = req.body;

    const result = await db.query(
      `UPDATE vehicle_maintenance SET unit_id=$1, maintenance_type=$2, description=$3, scheduled_date=$4,
       completed_date=$5, mileage=$6, cost=$7, vendor=$8, status=$9, next_due_date=$10,
       next_due_mileage=$11, notes=$12
       WHERE id = $13 RETURNING *`,
      [unit_id, maintenance_type, description, scheduled_date, completed_date,
       mileage, cost, vendor, status, next_due_date, next_due_mileage, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE maintenance record
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicle_maintenance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json({ message: 'Maintenance record deleted.', maintenance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
