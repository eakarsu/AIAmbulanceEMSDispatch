const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all mutual aid records
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM mutual_aid ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mutual aid record by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM mutual_aid WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mutual aid record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create mutual aid record
router.post('/', auth, async (req, res) => {
  try {
    const {
      request_type, agency_name, call_id, unit_sent, request_time,
      arrival_time, clear_time, reason, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO mutual_aid (request_type, agency_name, call_id, unit_sent, request_time,
       arrival_time, clear_time, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [request_type, agency_name, call_id, unit_sent, request_time,
       arrival_time, clear_time, reason, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update mutual aid record
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      request_type, agency_name, call_id, unit_sent, request_time,
      arrival_time, clear_time, reason, status
    } = req.body;

    const result = await db.query(
      `UPDATE mutual_aid SET request_type=$1, agency_name=$2, call_id=$3, unit_sent=$4,
       request_time=$5, arrival_time=$6, clear_time=$7, reason=$8, status=$9
       WHERE id = $10 RETURNING *`,
      [request_type, agency_name, call_id, unit_sent, request_time,
       arrival_time, clear_time, reason, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mutual aid record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE mutual aid record
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM mutual_aid WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mutual aid record not found.' });
    }
    res.json({ message: 'Mutual aid record deleted.', mutualAid: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
