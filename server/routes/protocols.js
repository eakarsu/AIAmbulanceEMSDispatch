const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all protocols
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM protocols ORDER BY id DESC');
    res.json(result.rows);
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
router.post('/', auth, async (req, res) => {
  try {
    const {
      protocol_number, title, category, description, steps, medications,
      contraindications, special_considerations, bls_scope, als_scope, last_updated
    } = req.body;

    const result = await db.query(
      `INSERT INTO protocols (protocol_number, title, category, description, steps, medications,
       contraindications, special_considerations, bls_scope, als_scope, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [protocol_number, title, category, description, steps, medications,
       contraindications, special_considerations, bls_scope !== undefined ? bls_scope : true,
       als_scope !== undefined ? als_scope : true, last_updated]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update protocol
router.put('/:id', auth, async (req, res) => {
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
      [protocol_number, title, category, description, steps, medications,
       contraindications, special_considerations, bls_scope, als_scope, last_updated, req.params.id]
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
