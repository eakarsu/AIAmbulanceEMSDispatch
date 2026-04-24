import React, { useState, useEffect } from 'react';

const API = '/api/billing';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const INSURANCE_TYPES = ['Medicare', 'Medicaid', 'Private', 'Workers Comp', 'Self Pay', 'No Insurance', 'Other'];
const SERVICE_TYPES = ['BLS Emergency', 'BLS Non-Emergency', 'ALS1 Emergency', 'ALS1 Non-Emergency', 'ALS2', 'SCT', 'PI'];
const STATUSES = ['Pending', 'Submitted', 'Approved', 'Denied', 'Paid', 'Partial', 'Collections', 'Write Off'];

const emptyForm = {
  call_id: '', pcr_id: '', patient_name: '', insurance_type: '', insurance_provider: '',
  policy_number: '', service_type: '', mileage: '', base_charge: '', mileage_charge: '',
  supply_charges: '', total_charge: '', amount_paid: '', amount_due: '', status: 'Pending', notes: '',
};

export default function BillingPage() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(API, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch billing records');
      setItems(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.patient_name || '').toLowerCase().includes(q) ||
      (i.insurance_type || '').toLowerCase().includes(q) ||
      (i.insurance_provider || '').toLowerCase().includes(q) ||
      (i.service_type || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q) ||
      (i.policy_number || '').toLowerCase().includes(q)
    ));
  }, [search, items]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = () => { setForm({ ...emptyForm, ...selected }); setEditId(selected.id); setShowForm(true); setSelected(null); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const url = editId ? `${API}/${editId}` : API;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setShowForm(false); fetchData();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this billing record? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null); fetchData();
    } catch (err) { setError(err.message); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const fmtCurrency = (v) => v != null && v !== '' ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Billing Management</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search billing..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Patient','Insurance Type','Service Type','Total Charge','Paid','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={S.empty}>No billing records found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} style={S.tr} onClick={() => setSelected(row)}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={S.td}>{row.patient_name}</td>
                  <td style={S.td}>{row.insurance_type}</td>
                  <td style={S.td}>{row.service_type}</td>
                  <td style={{...S.td, fontWeight: 600, fontFamily: 'monospace'}}>{fmtCurrency(row.total_charge)}</td>
                  <td style={{...S.td, fontFamily: 'monospace', color: Number(row.amount_paid) > 0 ? '#27ae60' : 'inherit'}}>{fmtCurrency(row.amount_paid)}</td>
                  <td style={S.td}><span style={{...S.badge, background: row.status === 'Paid' ? '#27ae60' : row.status === 'Denied' || row.status === 'Collections' ? '#e74c3c' : row.status === 'Approved' || row.status === 'Partial' ? '#3498db' : '#f39c12'}}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Billing - {selected.patient_name}</h2>
            <div style={S.detailGrid}>
              {Object.entries(selected).filter(([k]) => k !== 'id').map(([k, v]) => (
                <div key={k} style={S.detailItem}>
                  <span style={S.detailLabel}>{k.replace(/_/g, ' ')}</span>
                  <span style={S.detailValue}>
                    {['base_charge','mileage_charge','supply_charges','total_charge','amount_paid','amount_due'].includes(k) ? fmtCurrency(v) : (v != null ? String(v) : '-')}
                  </span>
                </div>
              ))}
            </div>
            <div style={S.modalActions}>
              <button style={S.editBtn} onClick={openEdit}>Edit</button>
              <button style={S.deleteBtn} onClick={handleDelete}>Delete</button>
              <button style={S.cancelBtn} onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={S.overlay} onClick={() => setShowForm(false)}>
          <div style={{...S.modal, maxWidth: 680}} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editId ? 'Edit Billing' : 'Add Billing'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Call ID</label><input style={S.input} value={form.call_id} onChange={e => set('call_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>PCR ID</label><input style={S.input} value={form.pcr_id} onChange={e => set('pcr_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Patient Name *</label><input style={S.input} required value={form.patient_name} onChange={e => set('patient_name', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Insurance Type</label><select style={S.input} value={form.insurance_type} onChange={e => set('insurance_type', e.target.value)}><option value="">Select...</option>{INSURANCE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Insurance Provider</label><input style={S.input} value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Policy Number</label><input style={S.input} value={form.policy_number} onChange={e => set('policy_number', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Service Type</label><select style={S.input} value={form.service_type} onChange={e => set('service_type', e.target.value)}><option value="">Select...</option>{SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Mileage</label><input style={S.input} type="number" step="0.1" value={form.mileage} onChange={e => set('mileage', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Base Charge ($)</label><input style={S.input} type="number" step="0.01" value={form.base_charge} onChange={e => set('base_charge', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Mileage Charge ($)</label><input style={S.input} type="number" step="0.01" value={form.mileage_charge} onChange={e => set('mileage_charge', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Supply Charges ($)</label><input style={S.input} type="number" step="0.01" value={form.supply_charges} onChange={e => set('supply_charges', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Total Charge ($)</label><input style={S.input} type="number" step="0.01" value={form.total_charge} onChange={e => set('total_charge', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Amount Paid ($)</label><input style={S.input} type="number" step="0.01" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Amount Due ($)</label><input style={S.input} type="number" step="0.01" value={form.amount_due} onChange={e => set('amount_due', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div style={S.field}><label style={S.label}>Notes</label><textarea style={{...S.input, minHeight: 60}} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
              <div style={S.modalActions}>
                <button type="submit" style={S.addBtn} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
                <button type="button" style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' },
  actions: { display: 'flex', gap: 12, alignItems: 'center' },
  search: { padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, width: 240, outline: 'none' },
  addBtn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#0090ff)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  error: { background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ff6b6b', fontSize: 14 },
  loading: { textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' },
  tr: { cursor: 'pointer', transition: 'background 0.15s' },
  td: { padding: '12px 16px', fontSize: 14, color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  badge: { padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#fff' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#1a1a3e', borderRadius: 16, padding: 32, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' },
  modalTitle: { margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#fff' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  modalActions: { display: 'flex', gap: 12, marginTop: 16 },
  editBtn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f39c12', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
};
