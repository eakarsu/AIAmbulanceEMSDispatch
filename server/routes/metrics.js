const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all performance metrics
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM performance_metrics ORDER BY metric_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET metric by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM performance_metrics WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Metric not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create metric
router.post('/', auth, async (req, res) => {
  try {
    const {
      metric_date, total_calls, avg_response_time_seconds, calls_under_8_min, calls_under_12_min,
      total_transports, als_calls, bls_calls, cardiac_arrests, rosc_count,
      mutual_aid_given, mutual_aid_received, unit_utilization_pct, avg_turnaround_minutes,
      on_time_response_pct, patient_satisfaction_score
    } = req.body;

    const result = await db.query(
      `INSERT INTO performance_metrics (metric_date, total_calls, avg_response_time_seconds, calls_under_8_min,
       calls_under_12_min, total_transports, als_calls, bls_calls, cardiac_arrests, rosc_count,
       mutual_aid_given, mutual_aid_received, unit_utilization_pct, avg_turnaround_minutes,
       on_time_response_pct, patient_satisfaction_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [metric_date, total_calls || 0, avg_response_time_seconds, calls_under_8_min || 0, calls_under_12_min || 0,
       total_transports || 0, als_calls || 0, bls_calls || 0, cardiac_arrests || 0, rosc_count || 0,
       mutual_aid_given || 0, mutual_aid_received || 0, unit_utilization_pct, avg_turnaround_minutes,
       on_time_response_pct, patient_satisfaction_score]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update metric
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      metric_date, total_calls, avg_response_time_seconds, calls_under_8_min, calls_under_12_min,
      total_transports, als_calls, bls_calls, cardiac_arrests, rosc_count,
      mutual_aid_given, mutual_aid_received, unit_utilization_pct, avg_turnaround_minutes,
      on_time_response_pct, patient_satisfaction_score
    } = req.body;

    const result = await db.query(
      `UPDATE performance_metrics SET metric_date=$1, total_calls=$2, avg_response_time_seconds=$3,
       calls_under_8_min=$4, calls_under_12_min=$5, total_transports=$6, als_calls=$7, bls_calls=$8,
       cardiac_arrests=$9, rosc_count=$10, mutual_aid_given=$11, mutual_aid_received=$12,
       unit_utilization_pct=$13, avg_turnaround_minutes=$14, on_time_response_pct=$15,
       patient_satisfaction_score=$16
       WHERE id = $17 RETURNING *`,
      [metric_date, total_calls, avg_response_time_seconds, calls_under_8_min, calls_under_12_min,
       total_transports, als_calls, bls_calls, cardiac_arrests, rosc_count,
       mutual_aid_given, mutual_aid_received, unit_utilization_pct, avg_turnaround_minutes,
       on_time_response_pct, patient_satisfaction_score, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Metric not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE metric
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM performance_metrics WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Metric not found.' });
    }
    res.json({ message: 'Metric deleted.', metric: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
