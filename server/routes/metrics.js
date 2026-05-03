const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const metricsSchema = {
  metric_date: { required: true },
  total_calls: { type: 'number', min: 0 },
  on_time_response_pct: { type: 'number', min: 0, max: 100 },
  unit_utilization_pct: { type: 'number', min: 0, max: 100 },
  patient_satisfaction_score: { type: 'number', min: 0, max: 5 },
};

// GET all performance metrics (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) FROM performance_metrics');
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      'SELECT * FROM performance_metrics ORDER BY metric_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET response-time SLA analytics
router.get('/response-analytics', auth, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 90));

    const [totalsR, byTypeR, byDowR, byHourR] = await Promise.all([
      // Overall SLA totals
      db.query(`
        SELECT
          COUNT(*) AS total_calls,
          COUNT(CASE WHEN response_time_seconds <= 480 THEN 1 END) AS under_8min,
          COUNT(CASE WHEN response_time_seconds <= 720 THEN 1 END) AS under_12min,
          ROUND(100.0 * COUNT(CASE WHEN response_time_seconds <= 480 THEN 1 END) / NULLIF(COUNT(*),0), 1) AS pct_under_8min,
          ROUND(100.0 * COUNT(CASE WHEN response_time_seconds <= 720 THEN 1 END) / NULLIF(COUNT(*),0), 1) AS pct_under_12min,
          ROUND(AVG(response_time_seconds) / 60.0, 1) AS avg_response_minutes,
          ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time_seconds) / 60.0, 1) AS p90_response_minutes
        FROM calls
        WHERE created_at > NOW() - INTERVAL '${days} days'
          AND response_time_seconds IS NOT NULL
      `),
      // By call type
      db.query(`
        SELECT call_type,
          COUNT(*) AS calls,
          ROUND(AVG(response_time_seconds) / 60.0, 1) AS avg_minutes,
          ROUND(100.0 * COUNT(CASE WHEN response_time_seconds <= 480 THEN 1 END) / NULLIF(COUNT(*),0), 1) AS pct_under_8min
        FROM calls
        WHERE created_at > NOW() - INTERVAL '${days} days'
          AND response_time_seconds IS NOT NULL
        GROUP BY call_type ORDER BY calls DESC LIMIT 10
      `),
      // By day of week
      db.query(`
        SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Day') AS day_name,
          EXTRACT(DOW FROM created_at) AS dow,
          COUNT(*) AS calls,
          ROUND(AVG(response_time_seconds) / 60.0, 1) AS avg_minutes
        FROM calls
        WHERE created_at > NOW() - INTERVAL '${days} days'
          AND response_time_seconds IS NOT NULL
        GROUP BY day_name, dow ORDER BY dow
      `),
      // By hour of day
      db.query(`
        SELECT EXTRACT(HOUR FROM created_at) AS hour,
          COUNT(*) AS calls,
          ROUND(AVG(response_time_seconds) / 60.0, 1) AS avg_minutes
        FROM calls
        WHERE created_at > NOW() - INTERVAL '${days} days'
          AND response_time_seconds IS NOT NULL
        GROUP BY hour ORDER BY hour
      `),
    ]);

    res.json({
      period_days: days,
      totals: totalsR.rows[0] || {},
      by_call_type: byTypeR.rows,
      by_day_of_week: byDowR.rows,
      by_hour_of_day: byHourR.rows,
      generated_at: new Date().toISOString(),
    });
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
router.post('/', auth, validate(metricsSchema), async (req, res) => {
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
      [metric_date, total_calls || 0, avg_response_time_seconds || null, calls_under_8_min || 0,
       calls_under_12_min || 0, total_transports || 0, als_calls || 0, bls_calls || 0,
       cardiac_arrests || 0, rosc_count || 0, mutual_aid_given || 0, mutual_aid_received || 0,
       unit_utilization_pct || null, avg_turnaround_minutes || null,
       on_time_response_pct || null, patient_satisfaction_score || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update metric
router.put('/:id', auth, validate(metricsSchema), async (req, res) => {
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
