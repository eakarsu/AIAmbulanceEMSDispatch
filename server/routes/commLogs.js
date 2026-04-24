const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all communication logs
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM comm_logs ORDER BY id DESC');
    res.json(result.rows);
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
router.post('/', auth, async (req, res) => {
  try {
    const { call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp } = req.body;
    const result = await db.query(
      `INSERT INTO comm_logs (call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update comm log
router.put('/:id', auth, async (req, res) => {
  try {
    const { call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp } = req.body;
    const result = await db.query(
      `UPDATE comm_logs SET call_id=$1, unit_id=$2, channel=$3, message_type=$4,
       from_entity=$5, to_entity=$6, message=$7, timestamp=$8
       WHERE id = $9 RETURNING *`,
      [call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp, req.params.id]
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
