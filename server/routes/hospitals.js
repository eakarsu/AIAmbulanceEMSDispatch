const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const hospitalSchema = {
  name: { required: true, type: 'string', maxLength: 255 },
  er_status: { enum: ['open', 'diversion', 'closed'] },
  available_beds: { type: 'number', min: 0 },
  er_wait_minutes: { type: 'number', min: 0 },
};

// GET all hospitals (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { er_status } = req.query;

    let baseQuery = 'FROM hospitals';
    const params = [];
    if (er_status) {
      params.push(er_status);
      baseQuery += ` WHERE er_status = $${params.length}`;
    }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT * ${baseQuery} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
router.post('/', auth, validate(hospitalSchema), async (req, res) => {
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
      [name, address || null, lat || null, lng || null, phone || null,
       er_status || 'open', trauma_level || null,
       stroke_center || false, cardiac_center || false, burn_center || false, pediatric_center || false,
       available_beds || 0, er_wait_minutes || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update hospital
router.put('/:id', auth, validate(hospitalSchema), async (req, res) => {
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
      [name, address || null, lat || null, lng || null, phone || null,
       er_status, trauma_level || null, stroke_center, cardiac_center, burn_center, pediatric_center,
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

// PATCH /:id/er-status — Quick ER status toggle
router.patch('/:id/er-status', auth, async (req, res) => {
  try {
    const { er_status } = req.body;
    if (!['open', 'diversion', 'closed'].includes(er_status)) {
      return res.status(400).json({ error: 'er_status must be one of: open, diversion, closed.' });
    }
    const result = await db.query(
      'UPDATE hospitals SET er_status = $1, last_updated = NOW() WHERE id = $2 RETURNING *',
      [er_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hospital not found.' });
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
