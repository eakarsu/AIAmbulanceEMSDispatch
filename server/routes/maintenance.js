const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const maintenanceSchema = {
  unit_id: { required: true, type: 'number' },
  maintenance_type: { required: true, type: 'string', maxLength: 100 },
  status: { enum: ['scheduled', 'in_progress', 'completed', 'overdue', ''] },
  cost: { type: 'number', min: 0 },
  mileage: { type: 'number', min: 0 },
};

// GET all vehicle maintenance records (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, unit_id } = req.query;

    const filterParams = [];
    const conditions = [];
    if (status) { filterParams.push(status); conditions.push(`vm.status = $${filterParams.length}`); }
    if (unit_id) { filterParams.push(unit_id); conditions.push(`vm.unit_id = $${filterParams.length}`); }
    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM vehicle_maintenance vm ${whereClause}`,
      filterParams
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...filterParams, limit, offset];
    const result = await db.query(
      `SELECT vm.*, u.unit_number FROM vehicle_maintenance vm
       LEFT JOIN units u ON vm.unit_id = u.id
       ${whereClause}
       ORDER BY vm.id DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET maintenance record by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT vm.*, u.unit_number FROM vehicle_maintenance vm
       LEFT JOIN units u ON vm.unit_id = u.id
       WHERE vm.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create maintenance record
router.post('/', auth, validate(maintenanceSchema), async (req, res) => {
  try {
    const {
      unit_id, maintenance_type, description, scheduled_date, completed_date,
      mileage, cost, vendor, status, next_due_date, next_due_mileage, notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO vehicle_maintenance (unit_id, maintenance_type, description, scheduled_date, completed_date,
       mileage, cost, vendor, status, next_due_date, next_due_mileage, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [unit_id, maintenance_type, description || null, scheduled_date || null, completed_date || null,
       mileage || null, cost || null, vendor || null, status || 'scheduled',
       next_due_date || null, next_due_mileage || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update maintenance record
router.put('/:id', auth, validate(maintenanceSchema), async (req, res) => {
  try {
    const {
      unit_id, maintenance_type, description, scheduled_date, completed_date,
      mileage, cost, vendor, status, next_due_date, next_due_mileage, notes
    } = req.body;

    const result = await db.query(
      `UPDATE vehicle_maintenance SET unit_id=$1, maintenance_type=$2, description=$3, scheduled_date=$4,
       completed_date=$5, mileage=$6, cost=$7, vendor=$8, status=$9, next_due_date=$10,
       next_due_mileage=$11, notes=$12
       WHERE id = $13 RETURNING *`,
      [unit_id, maintenance_type, description || null, scheduled_date || null, completed_date || null,
       mileage || null, cost || null, vendor || null, status || 'scheduled',
       next_due_date || null, next_due_mileage || null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE maintenance record
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicle_maintenance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    res.json({ message: 'Maintenance record deleted.', maintenance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
