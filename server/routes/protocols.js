const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const protocolSchema = {
  protocol_number: { required: true, type: 'string', maxLength: 50 },
  title: { required: true, type: 'string', maxLength: 255 },
  category: { required: true, type: 'string', maxLength: 100 },
};

// GET all protocols (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { category } = req.query;

    let baseQuery = 'FROM protocols';
    const params = [];
    if (category) { params.push(category); baseQuery += ` WHERE category = $${params.length}`; }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT * ${baseQuery} ORDER BY protocol_number ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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

// GET protocol by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM protocols WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create protocol
router.post('/', auth, validate(protocolSchema), async (req, res) => {
  try {
    const {
      protocol_number, title, category, description, steps, medications,
      contraindications, special_considerations, bls_scope, als_scope, last_updated
    } = req.body;

    const result = await db.query(
      `INSERT INTO protocols (protocol_number, title, category, description, steps, medications,
       contraindications, special_considerations, bls_scope, als_scope, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [protocol_number, title, category, description || null, steps || null,
       medications || null, contraindications || null, special_considerations || null,
       bls_scope !== undefined ? bls_scope : true,
       als_scope !== undefined ? als_scope : true, last_updated || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update protocol
router.put('/:id', auth, validate(protocolSchema), async (req, res) => {
  try {
    const {
      protocol_number, title, category, description, steps, medications,
      contraindications, special_considerations, bls_scope, als_scope, last_updated
    } = req.body;

    const result = await db.query(
      `UPDATE protocols SET protocol_number=$1, title=$2, category=$3, description=$4, steps=$5,
       medications=$6, contraindications=$7, special_considerations=$8, bls_scope=$9,
       als_scope=$10, last_updated=$11
       WHERE id = $12 RETURNING *`,
      [protocol_number, title, category, description || null, steps || null,
       medications || null, contraindications || null, special_considerations || null,
       bls_scope, als_scope, last_updated || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE protocol
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM protocols WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found.' });
    }
    res.json({ message: 'Protocol deleted.', protocol: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
