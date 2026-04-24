const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all QA reviews
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM qa_reviews ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET QA review by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM qa_reviews WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QA review not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create QA review
router.post('/', auth, async (req, res) => {
  try {
    const {
      call_id, pcr_id, reviewer_name, review_date, category, score,
      findings, recommendations, action_required, action_taken, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO qa_reviews (call_id, pcr_id, reviewer_name, review_date, category, score,
       findings, recommendations, action_required, action_taken, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [call_id, pcr_id, reviewer_name, review_date, category, score,
       findings, recommendations, action_required || false, action_taken, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update QA review
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      call_id, pcr_id, reviewer_name, review_date, category, score,
      findings, recommendations, action_required, action_taken, status
    } = req.body;

    const result = await db.query(
      `UPDATE qa_reviews SET call_id=$1, pcr_id=$2, reviewer_name=$3, review_date=$4,
       category=$5, score=$6, findings=$7, recommendations=$8, action_required=$9,
       action_taken=$10, status=$11
       WHERE id = $12 RETURNING *`,
      [call_id, pcr_id, reviewer_name, review_date, category, score,
       findings, recommendations, action_required, action_taken, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QA review not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE QA review
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM qa_reviews WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QA review not found.' });
    }
    res.json({ message: 'QA review deleted.', qaReview: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
