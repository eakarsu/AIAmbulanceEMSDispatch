const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const medicationSchema = {
  name: { required: true, type: 'string', maxLength: 255 },
  quantity: { type: 'number', min: 0 },
};

// GET all medications (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, unit_id, controlled_substance } = req.query;

    let baseQuery = 'FROM medications';
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (unit_id) { params.push(unit_id); conditions.push(`unit_id = $${params.length}`); }
    if (controlled_substance !== undefined) {
      params.push(controlled_substance === 'true');
      conditions.push(`controlled_substance = $${params.length}`);
    }
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

// GET medication by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM medications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create medication
router.post('/', auth, validate(medicationSchema), async (req, res) => {
  try {
    const {
      name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
      expiration_date, controlled_substance, last_count_date, last_count_by, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO medications (name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
       expiration_date, controlled_substance, last_count_date, last_count_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, drug_class || null, schedule || null, unit_id || null, quantity || 0,
       unit_measure || null, lot_number || null, expiration_date || null,
       controlled_substance || false, last_count_date || null, last_count_by || null,
       status || 'in_stock']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update medication
router.put('/:id', auth, validate(medicationSchema), async (req, res) => {
  try {
    const {
      name, drug_class, schedule, unit_id, quantity, unit_measure, lot_number,
      expiration_date, controlled_substance, last_count_date, last_count_by, status
    } = req.body;

    const result = await db.query(
      `UPDATE medications SET name=$1, drug_class=$2, schedule=$3, unit_id=$4, quantity=$5,
       unit_measure=$6, lot_number=$7, expiration_date=$8, controlled_substance=$9,
       last_count_date=$10, last_count_by=$11, status=$12
       WHERE id = $13 RETURNING *`,
      [name, drug_class || null, schedule || null, unit_id || null, quantity,
       unit_measure || null, lot_number || null, expiration_date || null,
       controlled_substance, last_count_date || null, last_count_by || null,
       status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/count — Record a controlled substance count (shift reconciliation)
router.post('/:id/count', auth, async (req, res) => {
  try {
    const { count_by, quantity_counted, shift_type, notes } = req.body;
    if (!count_by || quantity_counted === undefined) {
      return res.status(400).json({ error: 'count_by and quantity_counted are required.' });
    }
    const qty = parseFloat(quantity_counted);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantity_counted must be a non-negative number.' });
    }

    // Get current medication
    const medR = await db.query('SELECT * FROM medications WHERE id = $1', [req.params.id]);
    if (medR.rows.length === 0) return res.status(404).json({ error: 'Medication not found.' });
    const med = medR.rows[0];

    const discrepancy = qty - (med.quantity || 0);
    const discrepancyFlag = Math.abs(discrepancy) > 0.001;

    // Update last count info
    const updated = await db.query(
      `UPDATE medications SET last_count_date = NOW(), last_count_by = $1
       WHERE id = $2 RETURNING *`,
      [count_by, req.params.id]
    );

    // Log to audit_log
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_id, entity_type, ip_address)
       VALUES ($1, $2, $3, 'medication', $4)`,
      [
        req.user?.id || null,
        discrepancyFlag ? 'CONTROLLED_SUBSTANCE_DISCREPANCY' : 'CONTROLLED_SUBSTANCE_COUNT',
        req.params.id,
        req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      ]
    );

    res.json({
      medication: updated.rows[0],
      count_record: {
        medication_id: parseInt(req.params.id),
        medication_name: med.name,
        expected_quantity: med.quantity,
        counted_quantity: qty,
        discrepancy,
        discrepancy_flag: discrepancyFlag,
        counted_by: count_by,
        shift_type: shift_type || null,
        notes: notes || null,
        counted_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET controlled substance count sheet (shift reconciliation)
router.get('/controlled/count-sheet', auth, async (req, res) => {
  try {
    const { unit_id } = req.query;
    let query = 'SELECT * FROM medications WHERE controlled_substance = true';
    const params = [];
    if (unit_id) { params.push(unit_id); query += ` AND unit_id = $${params.length}`; }
    query += ' ORDER BY name ASC';
    const result = await db.query(query, params);
    res.json({ data: result.rows, count: result.rows.length, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE medication
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM medications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }
    res.json({ message: 'Medication deleted.', medication: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
