/**
 * Dispatch routes — atomic CAD dispatch actions.
 */
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Role enforcement
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

const DISPATCH_ROLES = ['supervisor', 'dispatcher'];

const assignSchema = {
  call_id: { required: true, type: 'number' },
  unit_id: { required: true, type: 'number' },
};

// ---------------------------------------------------------------------------
// POST /assign — Atomically dispatch a unit to a call
// Sets call.status = 'dispatched', call.assigned_unit_id, call.dispatch_time
// Sets unit.status = 'en_route'
// Logs a comm entry
// ---------------------------------------------------------------------------
router.post('/assign', auth, requireRole(...DISPATCH_ROLES), validate(assignSchema), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { call_id, unit_id, notes } = req.body;

    // Verify call exists and is dispatchable
    const callCheck = await client.query('SELECT * FROM calls WHERE id = $1', [call_id]);
    if (callCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Call not found.' });
    }
    const call = callCheck.rows[0];
    if (['completed', 'cancelled'].includes(call.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Call is already ${call.status} and cannot be dispatched.` });
    }

    // Verify unit exists and is available
    const unitCheck = await client.query('SELECT * FROM units WHERE id = $1', [unit_id]);
    if (unitCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unit not found.' });
    }
    const unit = unitCheck.rows[0];
    if (unit.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Unit ${unit.unit_number} is not available (current status: ${unit.status}).` });
    }

    const dispatchTime = new Date();

    // Update call
    const updatedCall = await client.query(
      `UPDATE calls SET assigned_unit_id = $1, status = 'dispatched', dispatch_time = $2
       WHERE id = $3 RETURNING *`,
      [unit_id, dispatchTime, call_id]
    );

    // Update unit status
    await client.query(
      `UPDATE units SET status = 'en_route', last_status_change = $1 WHERE id = $2`,
      [dispatchTime, unit_id]
    );

    // Log comm entry
    const userId = req.user?.id || req.user?.userId;
    await client.query(
      `INSERT INTO comm_logs (call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp)
       VALUES ($1, $2, 'Dispatch', 'dispatch', 'CAD', $3, $4, $5)`,
      [
        call_id,
        unit_id,
        `Unit ${unit.unit_number}`,
        `Unit ${unit.unit_number} dispatched to ${call.location_address || 'scene'} for ${call.call_type}.${notes ? ' ' + notes : ''}`,
        dispatchTime,
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      call: updatedCall.rows[0],
      unit: { id: unit.id, unit_number: unit.unit_number, new_status: 'en_route' },
      dispatch_time: dispatchTime,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Dispatch assign error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /units/:unit_id/status — Update unit status in the field
// ---------------------------------------------------------------------------
const unitStatusSchema = {
  status: { required: true, enum: ['available', 'en_route', 'on_scene', 'at_hospital', 'out_of_service'] },
};

router.patch('/units/:unit_id/status', auth, validate(unitStatusSchema), async (req, res) => {
  try {
    const { status, call_id } = req.body;
    const { unit_id } = req.params;

    const result = await db.query(
      `UPDATE units SET status = $1, last_status_change = NOW() WHERE id = $2 RETURNING *`,
      [status, unit_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found.' });

    const unit = result.rows[0];

    // Update call timestamps based on status
    if (call_id) {
      const timeField = {
        en_route: 'en_route_time',
        on_scene: 'on_scene_time',
        at_hospital: 'hospital_arrival_time',
        available: 'clear_time',
      }[status];

      if (timeField) {
        const callStatus = status === 'available' ? 'completed' : (status === 'on_scene' ? 'on_scene' : (status === 'at_hospital' ? 'transporting' : 'dispatched'));
        await db.query(
          `UPDATE calls SET ${timeField} = NOW(), status = $1 WHERE id = $2`,
          [callStatus, call_id]
        );
      }
    }

    // Log comm entry
    if (call_id) {
      await db.query(
        `INSERT INTO comm_logs (call_id, unit_id, channel, message_type, from_entity, to_entity, message, timestamp)
         VALUES ($1, $2, 'Radio', 'status_update', $3, 'Dispatch', $4, NOW())`,
        [call_id, unit_id, `Unit ${unit.unit_number}`, `Unit ${unit.unit_number} status changed to ${status}.`]
      );
    }

    res.json({ success: true, unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /activity — Recent dispatch activity feed
// ---------------------------------------------------------------------------
router.get('/activity', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.query(
      `SELECT cl.*, u.unit_number FROM comm_logs cl
       LEFT JOIN units u ON cl.unit_id = u.id
       WHERE cl.timestamp >= $1
       ORDER BY cl.timestamp DESC LIMIT $2`,
      [since, limit]
    );

    res.json({ data: result.rows, since: since.toISOString(), count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /dashboard/summary — Single endpoint for dashboard counts
// ---------------------------------------------------------------------------
router.get('/summary', auth, async (req, res) => {
  try {
    const [
      unitsR, callsR, crewR, schedulesR, pcrR, hospitalsR, equipR,
      medsR, maintR, certsR, billingR, incidentsR, metricsR,
      protocolsR, commR, exposureR, qaR, mutualAidR,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM units'),
      db.query("SELECT COUNT(*) FROM calls WHERE status NOT IN ('completed','cancelled')"),
      db.query("SELECT COUNT(*) FROM crew WHERE status = 'active'"),
      db.query("SELECT COUNT(*) FROM schedules WHERE shift_end > NOW()"),
      db.query("SELECT COUNT(*) FROM patient_care_reports WHERE status != 'locked'"),
      db.query("SELECT COUNT(*) FROM hospitals WHERE er_status = 'open'"),
      db.query("SELECT COUNT(*) FROM equipment"),
      db.query('SELECT COUNT(*) FROM medications'),
      db.query("SELECT COUNT(*) FROM vehicle_maintenance WHERE status IN ('scheduled','in_progress','overdue')"),
      db.query("SELECT COUNT(*) FROM certifications WHERE status = 'active'"),
      db.query("SELECT COUNT(*) FROM billing WHERE status NOT IN ('paid','collections')"),
      db.query("SELECT COUNT(*) FROM incidents WHERE status = 'open'"),
      db.query('SELECT COUNT(*) FROM performance_metrics'),
      db.query('SELECT COUNT(*) FROM protocols'),
      db.query("SELECT COUNT(*) FROM comm_logs WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      db.query("SELECT COUNT(*) FROM exposure_tracking WHERE follow_up_status = 'pending'"),
      db.query("SELECT COUNT(*) FROM qa_reviews WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) FROM mutual_aid WHERE status = 'active'"),
    ]);

    res.json({
      units: parseInt(unitsR.rows[0].count),
      active_calls: parseInt(callsR.rows[0].count),
      active_crew: parseInt(crewR.rows[0].count),
      upcoming_schedules: parseInt(schedulesR.rows[0].count),
      open_pcrs: parseInt(pcrR.rows[0].count),
      available_hospitals: parseInt(hospitalsR.rows[0].count),
      equipment: parseInt(equipR.rows[0].count),
      medications: parseInt(medsR.rows[0].count),
      pending_maintenance: parseInt(maintR.rows[0].count),
      active_certifications: parseInt(certsR.rows[0].count),
      open_billing: parseInt(billingR.rows[0].count),
      open_incidents: parseInt(incidentsR.rows[0].count),
      metrics_records: parseInt(metricsR.rows[0].count),
      protocols: parseInt(protocolsR.rows[0].count),
      comm_logs_24h: parseInt(commR.rows[0].count),
      pending_exposure_followups: parseInt(exposureR.rows[0].count),
      pending_qa_reviews: parseInt(qaR.rows[0].count),
      active_mutual_aid: parseInt(mutualAidR.rows[0].count),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
