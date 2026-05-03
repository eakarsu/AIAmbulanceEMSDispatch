const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const billingSchema = {
  patient_name: { required: true, type: 'string', maxLength: 255 },
  service_type: { required: true, type: 'string', maxLength: 100 },
  insurance_type: { required: false, enum: ['Medicare', 'Medicaid', 'Private', 'Self-Pay', 'Workers Comp', ''] },
  base_charge: { type: 'number', min: 0 },
  total_charge: { type: 'number', min: 0 },
};

// GET all billing records (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let baseQuery = 'FROM billing';
    const params = [];
    if (status) {
      params.push(status);
      baseQuery += ` WHERE status = $${params.length}`;
    }

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

// GET billing record by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM billing WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create billing record
router.post('/', auth, validate(billingSchema), async (req, res) => {
  try {
    const {
      call_id, pcr_id, patient_name, insurance_type, insurance_provider, policy_number,
      service_type, mileage, base_charge, mileage_charge, supply_charges, total_charge,
      amount_paid, amount_due, status, submitted_date, payment_date, notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO billing (call_id, pcr_id, patient_name, insurance_type, insurance_provider, policy_number,
       service_type, mileage, base_charge, mileage_charge, supply_charges, total_charge,
       amount_paid, amount_due, status, submitted_date, payment_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [call_id || null, pcr_id || null, patient_name, insurance_type || null, insurance_provider || null,
       policy_number || null, service_type, mileage || null, base_charge || 0,
       mileage_charge || 0, supply_charges || 0, total_charge || 0,
       amount_paid || 0, amount_due || 0, status || 'pending',
       submitted_date || null, payment_date || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update billing record
router.put('/:id', auth, validate(billingSchema), async (req, res) => {
  try {
    const {
      call_id, pcr_id, patient_name, insurance_type, insurance_provider, policy_number,
      service_type, mileage, base_charge, mileage_charge, supply_charges, total_charge,
      amount_paid, amount_due, status, submitted_date, payment_date, notes
    } = req.body;

    const result = await db.query(
      `UPDATE billing SET call_id=$1, pcr_id=$2, patient_name=$3, insurance_type=$4,
       insurance_provider=$5, policy_number=$6, service_type=$7, mileage=$8, base_charge=$9,
       mileage_charge=$10, supply_charges=$11, total_charge=$12, amount_paid=$13, amount_due=$14,
       status=$15, submitted_date=$16, payment_date=$17, notes=$18
       WHERE id = $19 RETURNING *`,
      [call_id || null, pcr_id || null, patient_name, insurance_type || null,
       insurance_provider || null, policy_number || null, service_type, mileage || null,
       base_charge, mileage_charge, supply_charges, total_charge, amount_paid, amount_due,
       status, submitted_date || null, payment_date || null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE billing record
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found.' });
    }
    res.json({ message: 'Billing record deleted.', billing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
