const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all exposure tracking records
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM exposure_tracking ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET exposure record by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM exposure_tracking WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exposure record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create exposure record
router.post('/', auth, async (req, res) => {
  try {
    const {
      crew_id, call_id, exposure_type, exposure_date, pathogen, description,
      ppe_worn, follow_up_required, follow_up_date, follow_up_status, result: exposureResult, notes
    } = req.body;

    const dbResult = await db.query(
      `INSERT INTO exposure_tracking (crew_id, call_id, exposure_type, exposure_date, pathogen, description,
       ppe_worn, follow_up_required, follow_up_date, follow_up_status, result, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [crew_id, call_id, exposure_type, exposure_date, pathogen, description,
       ppe_worn, follow_up_required !== undefined ? follow_up_required : true,
       follow_up_date, follow_up_status || 'pending', exposureResult, notes]
    );
    res.status(201).json(dbResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update exposure record
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      crew_id, call_id, exposure_type, exposure_date, pathogen, description,
      ppe_worn, follow_up_required, follow_up_date, follow_up_status, result: exposureResult, notes
    } = req.body;

    const dbResult = await db.query(
      `UPDATE exposure_tracking SET crew_id=$1, call_id=$2, exposure_type=$3, exposure_date=$4,
       pathogen=$5, description=$6, ppe_worn=$7, follow_up_required=$8, follow_up_date=$9,
       follow_up_status=$10, result=$11, notes=$12
       WHERE id = $13 RETURNING *`,
      [crew_id, call_id, exposure_type, exposure_date, pathogen, description,
       ppe_worn, follow_up_required, follow_up_date, follow_up_status, exposureResult, notes, req.params.id]
    );
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exposure record not found.' });
    }
    res.json(dbResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE exposure record
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM exposure_tracking WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exposure record not found.' });
    }
    res.json({ message: 'Exposure record deleted.', exposure: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
