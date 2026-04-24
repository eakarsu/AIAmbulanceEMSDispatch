import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/pcr';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const STATUS_OPTIONS = ['draft', 'in_progress', 'completed', 'reviewed', 'locked'];
const STATUS_COLORS = {
  draft: '#6b7280', in_progress: '#eab308', completed: '#22c55e', reviewed: '#3b82f6', locked: '#8b5cf6',
};
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const DISPOSITION_OPTIONS = ['Transported', 'Refused', 'AMA', 'DOA', 'Cancelled', 'No Patient'];

const emptyForm = {
  pcr_number: '', call_id: '', patient_name: '', patient_dob: '', patient_age: '',
  patient_gender: '', allergies: '', medications: '', medical_history: '',
  chief_complaint: '', narrative: '', vitals_bp: '', vitals_hr: '', vitals_rr: '',
  vitals_spo2: '', vitals_temp: '', vitals_gcs: '', treatments_given: '', procedures: '',
  medications_administered: '', transport_disposition: '', receiving_facility: '',
  receiving_physician: '', crew_lead: '', crew_members: '', status: 'draft',
};

function Badge({ value, colors }) {
  const color = colors[value] || '#6b7280';
  return (
    <span style={{ ...s.badge, backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>
      {String(value || '').replace(/_/g, ' ')}
    </span>
  );
}

function Modal({ open, onClose, title, wide, children }) {
  if (!open) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, ...(wide ? { maxWidth: 900 } : {}) }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{title}</h2>
          <button style={s.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div style={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export default function PCRPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch PCRs');
      setItems(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let data = items;
    if (statusFilter) data = data.filter(i => i.status === statusFilter);
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(i =>
      (i.pcr_number || '').toLowerCase().includes(q) ||
      (i.patient_name || '').toLowerCase().includes(q) ||
      (i.chief_complaint || '').toLowerCase().includes(q) ||
      (i.crew_lead || '').toLowerCase().includes(q)
    );
  }, [items, search, statusFilter]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    const f = {};
    Object.keys(emptyForm).forEach(k => { f[k] = item[k] || emptyForm[k]; });
    if (item.patient_dob) f.patient_dob = item.patient_dob.substring(0, 10);
    setForm(f);
    setEditId(item.id);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API}/${editId}` : API;
      const payload = { ...form, call_id: form.call_id || null };
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PCR?')) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setShowDetail(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Patient Care Reports</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ New PCR</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search PCRs..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['PCR #', 'Patient', 'Chief Complaint', 'Status', 'Crew Lead', 'Date'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={s.td}>No PCRs found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.pcr_number}</strong></td>
                <td style={s.td}>{item.patient_name || '-'}</td>
                <td style={s.td}>{item.chief_complaint || '-'}</td>
                <td style={s.td}><Badge value={item.status} colors={STATUS_COLORS} /></td>
                <td style={s.td}>{item.crew_lead || '-'}</td>
                <td style={s.td}>{fmtDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal - Rich view */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`PCR ${selected?.pcr_number || ''}`} wide>
        {selected && (
          <div>
            {/* Patient Info Section */}
            <SectionHeader title="Patient Information" />
            <div style={s.detailGrid}>
              <DetailField label="PCR Number" value={selected.pcr_number} />
              <DetailField label="Call ID" value={selected.call_id} />
              <DetailField label="Patient Name" value={selected.patient_name} />
              <DetailField label="DOB" value={fmtDate(selected.patient_dob)} />
              <DetailField label="Age" value={selected.patient_age} />
              <DetailField label="Gender" value={selected.patient_gender} />
              <DetailField label="Status" value={<Badge value={selected.status} colors={STATUS_COLORS} />} />
            </div>

            {/* Medical History Section */}
            <SectionHeader title="Medical History" />
            <div style={s.detailGrid}>
              <DetailField label="Allergies" value={selected.allergies} />
              <DetailField label="Medications" value={selected.medications} />
            </div>
            <DetailField label="Medical History" value={selected.medical_history} />
            <DetailField label="Chief Complaint" value={selected.chief_complaint} />

            {/* Vitals Section */}
            <SectionHeader title="Vitals" />
            <div style={s.vitalsGrid}>
              <VitalCard label="Blood Pressure" value={selected.vitals_bp} unit="mmHg" />
              <VitalCard label="Heart Rate" value={selected.vitals_hr} unit="bpm" />
              <VitalCard label="Respiratory Rate" value={selected.vitals_rr} unit="/min" />
              <VitalCard label="SpO2" value={selected.vitals_spo2} unit="%" />
              <VitalCard label="Temperature" value={selected.vitals_temp} unit="F" />
              <VitalCard label="GCS" value={selected.vitals_gcs} unit="/15" />
            </div>

            {/* Narrative */}
            <SectionHeader title="Narrative" />
            <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, minHeight: 60 }}>
              {selected.narrative || 'No narrative provided.'}
            </div>

            {/* Treatment Section */}
            <SectionHeader title="Treatment & Transport" />
            <div style={s.detailGrid}>
              <DetailField label="Treatments Given" value={selected.treatments_given} />
              <DetailField label="Procedures" value={selected.procedures} />
              <DetailField label="Medications Administered" value={selected.medications_administered} />
              <DetailField label="Transport Disposition" value={selected.transport_disposition} />
              <DetailField label="Receiving Facility" value={selected.receiving_facility} />
              <DetailField label="Receiving Physician" value={selected.receiving_physician} />
            </div>

            {/* Crew Section */}
            <SectionHeader title="Crew" />
            <div style={s.detailGrid}>
              <DetailField label="Crew Lead" value={selected.crew_lead} />
              <DetailField label="Crew Members" value={selected.crew_members} />
            </div>

            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit PCR' : 'New PCR'} wide>
        <form onSubmit={handleSave}>
          <SectionHeader title="Patient Information" />
          <div style={s.grid2}>
            <FormField label="PCR Number" value={form.pcr_number} onChange={v => updateField('pcr_number', v)} required />
            <FormField label="Call ID" value={form.call_id} onChange={v => updateField('call_id', v)} type="number" />
            <FormField label="Patient Name" value={form.patient_name} onChange={v => updateField('patient_name', v)} />
            <FormField label="Date of Birth" value={form.patient_dob} onChange={v => updateField('patient_dob', v)} type="date" />
            <FormField label="Age" value={form.patient_age} onChange={v => updateField('patient_age', v)} type="number" />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Gender</label>
              <select style={s.input} value={form.patient_gender} onChange={e => updateField('patient_gender', e.target.value)}>
                <option value="">Select...</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <SectionHeader title="Medical History" />
          <div style={s.grid2}>
            <FormField label="Allergies" value={form.allergies} onChange={v => updateField('allergies', v)} />
            <FormField label="Current Medications" value={form.medications} onChange={v => updateField('medications', v)} />
          </div>
          <TextArea label="Medical History" value={form.medical_history} onChange={v => updateField('medical_history', v)} />
          <FormField label="Chief Complaint" value={form.chief_complaint} onChange={v => updateField('chief_complaint', v)} required />
          <TextArea label="Narrative" value={form.narrative} onChange={v => updateField('narrative', v)} rows={4} />

          <SectionHeader title="Vitals" />
          <div style={s.grid3}>
            <FormField label="Blood Pressure" value={form.vitals_bp} onChange={v => updateField('vitals_bp', v)} />
            <FormField label="Heart Rate" value={form.vitals_hr} onChange={v => updateField('vitals_hr', v)} type="number" />
            <FormField label="Respiratory Rate" value={form.vitals_rr} onChange={v => updateField('vitals_rr', v)} type="number" />
            <FormField label="SpO2" value={form.vitals_spo2} onChange={v => updateField('vitals_spo2', v)} type="number" />
            <FormField label="Temperature" value={form.vitals_temp} onChange={v => updateField('vitals_temp', v)} />
            <FormField label="GCS" value={form.vitals_gcs} onChange={v => updateField('vitals_gcs', v)} type="number" />
          </div>

          <SectionHeader title="Treatment & Transport" />
          <TextArea label="Treatments Given" value={form.treatments_given} onChange={v => updateField('treatments_given', v)} />
          <TextArea label="Procedures" value={form.procedures} onChange={v => updateField('procedures', v)} />
          <TextArea label="Medications Administered" value={form.medications_administered} onChange={v => updateField('medications_administered', v)} />
          <div style={s.grid2}>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Transport Disposition</label>
              <select style={s.input} value={form.transport_disposition} onChange={e => updateField('transport_disposition', e.target.value)}>
                <option value="">Select...</option>
                {DISPOSITION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <FormField label="Receiving Facility" value={form.receiving_facility} onChange={v => updateField('receiving_facility', v)} />
            <FormField label="Receiving Physician" value={form.receiving_physician} onChange={v => updateField('receiving_physician', v)} />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Status</label>
              <select style={s.input} value={form.status} onChange={e => updateField('status', e.target.value)}>
                {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <SectionHeader title="Crew" />
          <div style={s.grid2}>
            <FormField label="Crew Lead" value={form.crew_lead} onChange={v => updateField('crew_lead', v)} />
            <FormField label="Crew Members" value={form.crew_members} onChange={v => updateField('crew_members', v)} />
          </div>

          <div style={s.formActions}>
            <button type="button" style={s.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" style={s.primaryBtn} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 20, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #e2e8f0' }}>
      {title}
    </div>
  );
}

function VitalCard({ label, value, unit }) {
  return (
    <div style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: value ? '#1e293b' : '#cbd5e1' }}>{value || '--'}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{unit}</div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div style={s.detailField}>
      <div style={s.fieldLabel}>{label}</div>
      <div style={s.fieldValue}>{value || '-'}</div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div style={s.formGroup}>
      <label style={s.fieldLabel}>{label}{required && ' *'}</label>
      <input style={s.input} type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div style={s.formGroup}>
      <label style={s.fieldLabel}>{label}</label>
      <textarea style={{ ...s.input, minHeight: rows * 24, resize: 'vertical' }} value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 },
  filterBar: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, backgroundColor: '#fff', outline: 'none', minWidth: 160 },
  tableWrap: { overflowX: 'auto', backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' },
  td: { padding: '12px 16px', fontSize: 14, color: '#334155', borderBottom: '1px solid #f1f5f9' },
  tr: { cursor: 'pointer', transition: 'background 0.15s' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', padding: '0 4px' },
  modalBody: { padding: 24 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  vitalsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' },
  detailField: { marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  fieldValue: { fontSize: 14, color: '#1e293b' },
  detailActions: { display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' },
  formGroup: { marginBottom: 16 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' },
  primaryBtn: { padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  dangerBtn: { padding: '10px 20px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { padding: '12px 16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 14 },
};
