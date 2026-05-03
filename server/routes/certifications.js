const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const certSchema = {
  crew_id: { required: true, type: 'number' },
  certification_type: { required: true, type: 'string', maxLength: 100 },
  expiry_date: { required: true },
  status: { enum: ['active', 'expired', 'pending_renewal', 'suspended', ''] },
  ce_hours_completed: { type: 'number', min: 0 },
  ce_hours_required: { type: 'number', min: 0 },
};

// GET all certifications (paginated, JOIN with crew for names)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { crew_id, status } = req.query;

    let baseQuery = 'FROM certifications cert LEFT JOIN crew c ON cert.crew_id = c.id';
    const params = [];
    const conditions = [];
    if (crew_id) { params.push(crew_id); conditions.push(`cert.crew_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`cert.status = $${params.length}`); }
    if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT cert.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       ${baseQuery}
       ORDER BY cert.expiry_date ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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

// GET expiring certifications (within N days)
router.get('/expiring', auth, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
    const result = await db.query(
      `SELECT cert.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id,
              c.role, c.phone, c.email
       FROM certifications cert
       JOIN crew c ON cert.crew_id = c.id
       WHERE cert.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
         AND cert.status = 'active'
       ORDER BY cert.expiry_date ASC`
    );
    res.json({
      data: result.rows,
      days_window: days,
      count: result.rows.length,
      checked_at: new Date().toISOString(),
    });
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
router.post('/', auth, validate(certSchema), async (req, res) => {
  try {
    const {
      crew_id, certification_type, certification_number, issuing_authority,
      issue_date, expiry_date, status, ce_hours_completed, ce_hours_required
    } = req.body;

    const result = await db.query(
      `INSERT INTO certifications (crew_id, certification_type, certification_number, issuing_authority,
       issue_date, expiry_date, status, ce_hours_completed, ce_hours_required)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [crew_id, certification_type, certification_number || null, issuing_authority || null,
       issue_date || null, expiry_date, status || 'active',
       ce_hours_completed || 0, ce_hours_required || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update certification
router.put('/:id', auth, validate(certSchema), async (req, res) => {
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
      [crew_id, certification_type, certification_number || null, issuing_authority || null,
       issue_date || null, expiry_date, status, ce_hours_completed, ce_hours_required, req.params.id]
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
