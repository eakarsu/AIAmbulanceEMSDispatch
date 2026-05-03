const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const equipmentSchema = {
  name: { required: true, type: 'string', maxLength: 255 },
  quantity: { type: 'number', min: 0 },
};

// GET all equipment (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, unit_id } = req.query;

    let baseQuery = 'FROM equipment';
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (unit_id) { params.push(unit_id); conditions.push(`unit_id = $${params.length}`); }
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
router.post('/', auth, validate(equipmentSchema), async (req, res) => {
  try {
    const { name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes } = req.body;
    const result = await db.query(
      `INSERT INTO equipment (name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, category || null, unit_id || null, serial_number || null,
       status || 'operational', last_inspected || null, next_inspection_due || null,
       quantity || 1, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update equipment
router.put('/:id', auth, validate(equipmentSchema), async (req, res) => {
  try {
    const { name, category, unit_id, serial_number, status, last_inspected, next_inspection_due, quantity, notes } = req.body;
    const result = await db.query(
      `UPDATE equipment SET name=$1, category=$2, unit_id=$3, serial_number=$4, status=$5,
       last_inspected=$6, next_inspection_due=$7, quantity=$8, notes=$9
       WHERE id = $10 RETURNING *`,
      [name, category || null, unit_id || null, serial_number || null,
       status, last_inspected || null, next_inspection_due || null,
       quantity, notes || null, req.params.id]
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
