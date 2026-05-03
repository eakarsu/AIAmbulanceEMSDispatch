const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const pcrSchema = {
  pcr_number: { required: true, type: 'string', maxLength: 50 },
  patient_name: { required: true, type: 'string', maxLength: 255 },
  chief_complaint: { required: true, type: 'string', maxLength: 500 },
  patient_age: { type: 'number', min: 0, max: 150 },
  vitals_hr: { type: 'number', min: 0, max: 400 },
  vitals_rr: { type: 'number', min: 0, max: 100 },
  vitals_spo2: { type: 'number', min: 0, max: 100 },
  vitals_gcs: { type: 'number', min: 3, max: 15 },
};

// GET all patient care reports (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let baseQuery = 'FROM patient_care_reports';
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
router.post('/', auth, validate(pcrSchema), async (req, res) => {
  try {
    const {
      pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
      patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
      vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
      treatments_given, procedures, medications_administered, transport_disposition,
      receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status
    } = req.body;

    // Prevent edits to locked PCRs via POST (should be unique pcr_number)
    const existing = await db.query('SELECT id, status FROM patient_care_reports WHERE pcr_number = $1', [pcr_number]);
    if (existing.rows.length > 0 && existing.rows[0].status === 'locked') {
      return res.status(403).json({ error: 'Cannot modify a locked PCR.' });
    }

    const result = await db.query(
      `INSERT INTO patient_care_reports (pcr_number, call_id, patient_name, patient_dob, patient_age, patient_gender,
       patient_weight, allergies, medications, medical_history, chief_complaint, narrative,
       vitals_bp, vitals_hr, vitals_rr, vitals_spo2, vitals_temp, vitals_gcs,
       treatments_given, procedures, medications_administered, transport_disposition,
       receiving_facility, receiving_physician, crew_lead, crew_members, ai_draft, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       RETURNING *`,
      [pcr_number, call_id || null, patient_name, patient_dob || null, patient_age || null, patient_gender || null,
       patient_weight || null, allergies || null, medications || null, medical_history || null,
       chief_complaint, narrative || null, vitals_bp || null, vitals_hr || null, vitals_rr || null,
       vitals_spo2 || null, vitals_temp || null, vitals_gcs || null, treatments_given || null,
       procedures || null, medications_administered || null, transport_disposition || null,
       receiving_facility || null, receiving_physician || null, crew_lead || null,
       crew_members || null, ai_draft || null, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update PCR
router.put('/:id', auth, validate(pcrSchema), async (req, res) => {
  try {
    // Prevent edits to locked PCRs
    const existing = await db.query('SELECT status FROM patient_care_reports WHERE id = $1', [req.params.id]);
    if (existing.rows.length > 0 && existing.rows[0].status === 'locked') {
      return res.status(403).json({ error: 'Cannot modify a locked PCR.' });
    }

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
      [pcr_number, call_id || null, patient_name, patient_dob || null, patient_age || null,
       patient_gender || null, patient_weight || null, allergies || null, medications || null,
       medical_history || null, chief_complaint, narrative || null, vitals_bp || null,
       vitals_hr || null, vitals_rr || null, vitals_spo2 || null, vitals_temp || null,
       vitals_gcs || null, treatments_given || null, procedures || null,
       medications_administered || null, transport_disposition || null, receiving_facility || null,
       receiving_physician || null, crew_lead || null, crew_members || null,
       ai_draft || null, status || 'draft', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient care report not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/lock — Lock a completed PCR (supervisor or above)
router.post('/:id/lock', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE patient_care_reports SET status = 'locked' WHERE id = $1 AND status = 'reviewed' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PCR not found or not in reviewed status.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /expiring-certifications — utility endpoint used by PCR workflow
router.get('/alerts/expiring', auth, async (req, res) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt(req.query.days) || 30));
    const result = await db.query(
      `SELECT c.id, c.certification_type, c.expiry_date, c.status,
              cr.first_name, cr.last_name, cr.employee_id
       FROM certifications c
       JOIN crew cr ON c.crew_id = cr.id
       WHERE c.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
         AND c.status = 'active'
       ORDER BY c.expiry_date ASC`
    );
    res.json({ data: result.rows, days_window: days, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE PCR
router.delete('/:id', auth, async (req, res) => {
  try {
    // Prevent deletion of locked PCRs
    const check = await db.query('SELECT status FROM patient_care_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length > 0 && check.rows[0].status === 'locked') {
      return res.status(403).json({ error: 'Cannot delete a locked PCR.' });
    }
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
