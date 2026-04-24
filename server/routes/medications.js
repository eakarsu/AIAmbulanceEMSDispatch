const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all medications
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM medications ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medication by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM medications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create medication
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
      expiration_date, controlled_substance, last_count_date, last_count_by, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO medications (name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
       expiration_date, controlled_substance, last_count_date, last_count_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
       expiration_date, controlled_substance || false, last_count_date, last_count_by, status || 'in_stock']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update medication
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
      expiration_date, controlled_substance, last_count_date, last_count_by, status
    } = req.body;

    const result = await db.query(
      `UPDATE medications SET name=$1, drug_class=$2, schedule=$3, unit_id=$4, quantity=$5,
       unit_measure=$6, lot_number=$7, expiration_date=$8, controlled_substance=$9,
       last_count_date=$10, last_count_by=$11, status=$12
       WHERE id = $13 RETURNING *`,
      [name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
       expiration_date, controlled_substance, last_count_date, last_count_by, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE medication
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM medications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json({ message: 'Medication deleted.', medication: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
