const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const commLogSchema = {
  message: { required: true, type: 'string', maxLength: 2000 },
  message_type: { required: true, type: 'string', maxLength: 50 },
};

// GET all communication logs (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { call_id, unit_id } = req.query;

    let baseQuery = 'FROM comm_logs';
    const params = [];
    const conditions = [];
    if (call_id) { params.push(call_id); conditions.push(`call_id = $${params.length}`); }
    if (unit_id) { params.push(unit_id); conditions.push(`unit_id = $${params.length}`); }
    if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT * ${baseQuery} ORDER BY timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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

// GET comm log by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM comm_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Communication log not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create comm log
router.post('/', auth, validate(commLogSchema), async (req, res) => {
  try {
    const { call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp } = req.body;
    const result = await db.query(
      `INSERT INTO comm_logs (call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [call_id || null, unit_id || null, channel || null, message_type,
       from_entity || null, to_entity || null, message, timestamp || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update comm log
router.put('/:id', auth, validate(commLogSchema), async (req, res) => {
  try {
    const { call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp } = req.body;
    const result = await db.query(
      `UPDATE comm_logs SET call_id=$1, unit_id=$2, channel=$3, message_type=$4,
       from_entity=$5, to_entity=$6, message=$7, timestamp=$8
       WHERE id = $9 RETURNING *`,
      [call_id || null, unit_id || null, channel || null, message_type,
       from_entity || null, to_entity || null, message, timestamp, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Communication log not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comm log
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM comm_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Communication log not found.' });
    }
    res.json({ message: 'Communication log deleted.', commLog: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
