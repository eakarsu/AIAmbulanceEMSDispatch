const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all patient care reports
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM patient_care_reports ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET PCR by id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM patient_care_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient care report not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create PCR
router.post('/', auth, async (req, res) => {
  try {
    const {
      pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
      patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
      vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
      treatments_given, procedures, medications_administered, transport_disposition,
      receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status
    } = req.body;

    const result = await db.query(
      `INSERT INTO patient_care_reports (pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
       patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
       vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
       treatments_given, procedures, medications_administered, transport_disposition,
       receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       RETURNING *`,
      [pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
       patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
       vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
       treatments_given, procedures, medications_administered, transport_disposition,
       receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update PCR
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
      patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
      vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
      treatments_given, procedures, medications_administered, transport_disposition,
      receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status
    } = req.body;

    const result = await db.query(
      `UPDATE patient_care_reports SET pcr_number=$1, call_id=$2, patient_name=$3, patient_dob=$4,
       patient_age=$5, patient_gender=$6, patient_weight=$7, allergies=$8, medications=$9,
       medical_history=$10, chief_complaint=$11, narrative=$12, vitals_bp=$13, vitals_hr=$14,
       vitals_rr=$15, vitals_spo2=$16, vitals_temp=$17, vitals_gcs=$18, treatments_given=$19,
       procedures=$20, medications_administered=$21, transport_disposition=$22, receiving_facility=$23,
       receiving_physician=$24, crew_lead=$25, crew_members=$26, ai_draft=$27, status=$28
       WHERE id = $29 RETURNING *`,
      [pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
       patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
       vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
       treatments_given, procedures, medications_administered, transport_disposition,
       receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient care report not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE PCR
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM patient_care_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient care report not found.' });
    }
    res.json({ message: 'Patient care report deleted.', pcr: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
