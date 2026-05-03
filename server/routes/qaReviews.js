const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const qaSchema = {
  reviewer_name: { required: true, type: 'string', maxLength: 255 },
  category: { required: true, type: 'string', maxLength: 100 },
  score: { required: true, type: 'number', min: 0, max: 100 },
};

// GET all QA reviews (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, category } = req.query;

    let baseQuery = 'FROM qa_reviews';
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
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
router.post('/', auth, validate(qaSchema), async (req, res) => {
  try {
    const {
      call_id, pcr_id, reviewer_name, review_date, category, score,
      findings, recommendations, action_required, action_taken, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO qa_reviews (call_id, pcr_id, reviewer_name, review_date, category, score,
       findings, recommendations, action_required, action_taken, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [call_id || null, pcr_id || null, reviewer_name, review_date || null, category, score,
       findings || null, recommendations || null, action_required || false,
       action_taken || null, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update QA review
router.put('/:id', auth, validate(qaSchema), async (req, res) => {
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
      [call_id || null, pcr_id || null, reviewer_name, review_date || null, category, score,
       findings || null, recommendations || null, action_required, action_taken || null,
       status, req.params.id]
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
