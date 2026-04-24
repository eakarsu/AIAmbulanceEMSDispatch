const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all billing records
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM billing ORDER BY id DESC');
    res.json(result.rows);
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
router.post('/', auth, async (req, res) => {
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
      [call_id, pcr_id, patient_name, insurance_type, insurance_provider, policy_number,
       service_type, mileage, base_charge, mileage_charge, supply_charges, total_charge,
       amount_paid || 0, amount_due, status || 'pending', submitted_date, payment_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update billing record
router.put('/:id', auth, async (req, res) => {
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
      [call_id, pcr_id, patient_name, insurance_type, insurance_provider, policy_number,
       service_type, mileage, base_charge, mileage_charge, supply_charges, total_charge,
       amount_paid, amount_due, status, submitted_date, payment_date, notes, req.params.id]
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
