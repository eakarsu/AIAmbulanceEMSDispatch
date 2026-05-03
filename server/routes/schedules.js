const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const scheduleSchema = {
  crew_id: { required: true, type: 'number' },
  shift_type: { required: true, enum: ['12hr', '24hr', '48hr'] },
  shift_start: { required: true },
  shift_end: { required: true },
};

// Conflict check helper
async function hasScheduleConflict(crewId, shiftStart, shiftEnd, excludeId = null) {
  const query = `
    SELECT id FROM schedules
    WHERE crew_id = $1
      AND status NOT IN ('cancelled', 'called_off')
      AND shift_start < $3
      AND shift_end > $2
      ${excludeId ? 'AND id != $4' : ''}
  `;
  const params = excludeId
    ? [crewId, shiftStart, shiftEnd, excludeId]
    : [crewId, shiftStart, shiftEnd];
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

// GET all schedules (paginated, JOIN with crew for names)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { crew_id, status } = req.query;

    let baseQuery = 'FROM schedules s LEFT JOIN crew c ON s.crew_id = c.id';
    const params = [];
    const conditions = [];
    if (crew_id) { params.push(crew_id); conditions.push(`s.crew_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }
    if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await db.query(
      `SELECT s.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       ${baseQuery}
       ORDER BY s.shift_start DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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

// GET schedule by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, c.first_name, c.last_name, c.employee_id AS crew_employee_id
       FROM schedules s
       LEFT JOIN crew c ON s.crew_id = c.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create schedule (with conflict check)
router.post('/', auth, validate(scheduleSchema), async (req, res) => {
  try {
    const { crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes } = req.body;

    // Shift conflict check
    const conflict = await hasScheduleConflict(crew_id, shift_start, shift_end);
    if (conflict) {
      return res.status(409).json({ error: 'Schedule conflict: crew member already has an overlapping shift.' });
    }

    const result = await db.query(
      `INSERT INTO schedules (crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [crew_id, shift_type, shift_start, shift_end, assigned_unit_id || null, status || 'scheduled', notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update schedule (with conflict check)
router.put('/:id', auth, validate(scheduleSchema), async (req, res) => {
  try {
    const { crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status, notes } = req.body;

    // Shift conflict check (exclude current schedule from check)
    if (!['cancelled', 'called_off'].includes(status)) {
      const conflict = await hasScheduleConflict(crew_id, shift_start, shift_end, req.params.id);
      if (conflict) {
        return res.status(409).json({ error: 'Schedule conflict: crew member already has an overlapping shift.' });
      }
    }

    const result = await db.query(
      `UPDATE schedules SET crew_id=$1, shift_type=$2, shift_start=$3, shift_end=$4,
       assigned_unit_id=$5, status=$6, notes=$7
       WHERE id = $8 RETURNING *`,
      [crew_id, shift_type, shift_start, shift_end, assigned_unit_id || null, status, notes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }
    res.json({ message: 'Schedule deleted.', schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
