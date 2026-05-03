const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Ensure mutual_aid_agencies table exists
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS mutual_aid_agencies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      agency_type VARCHAR(100),
      contact_name VARCHAR(255),
      contact_phone VARCHAR(50),
      contact_email VARCHAR(255),
      radio_frequency VARCHAR(50),
      coverage_area TEXT,
      capabilities TEXT,
      agreement_type VARCHAR(100),
      agreement_expiry DATE,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureTable().catch((e) => console.error('ensureTable mutual_aid_agencies failed:', e.message));

const agencySchema = {
  name: { required: true, type: 'string', maxLength: 255 },
  status: { enum: ['active', 'inactive', ''] },
};

// GET all mutual aid agencies (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let baseQuery = 'FROM mutual_aid_agencies';
    const params = [];
    if (status) {
      params.push(status);
      baseQuery += ` WHERE status = $${params.length}`;
    }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT * ${baseQuery} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET agency by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM mutual_aid_agencies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agency not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create agency
router.post('/', auth, validate(agencySchema), async (req, res) => {
  try {
    const {
      name, agency_type, contact_name, contact_phone, contact_email,
      radio_frequency, coverage_area, capabilities, agreement_type,
      agreement_expiry, status, notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO mutual_aid_agencies (name, agency_type, contact_name, contact_phone, contact_email,
       radio_frequency, coverage_area, capabilities, agreement_type, agreement_expiry, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, agency_type || null, contact_name || null, contact_phone || null, contact_email || null,
       radio_frequency || null, coverage_area || null, capabilities || null, agreement_type || null,
       agreement_expiry || null, status || 'active', notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update agency
router.put('/:id', auth, validate(agencySchema), async (req, res) => {
  try {
    const {
      name, agency_type, contact_name, contact_phone, contact_email,
      radio_frequency, coverage_area, capabilities, agreement_type,
      agreement_expiry, status, notes
    } = req.body;

    const result = await db.query(
      `UPDATE mutual_aid_agencies SET name=$1, agency_type=$2, contact_name=$3, contact_phone=$4,
       contact_email=$5, radio_frequency=$6, coverage_area=$7, capabilities=$8, agreement_type=$9,
       agreement_expiry=$10, status=$11, notes=$12
       WHERE id = $13 RETURNING *`,
      [name, agency_type || null, contact_name || null, contact_phone || null, contact_email || null,
       radio_frequency || null, coverage_area || null, capabilities || null, agreement_type || null,
       agreement_expiry || null, status || 'active', notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agency not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE agency
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM mutual_aid_agencies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agency not found.' });
    res.json({ message: 'Agency deleted.', agency: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
