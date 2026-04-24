import React, { useState, useEffect } from 'react';

const API = '/api/incidents';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const INCIDENT_TYPES = ['Medical', 'Trauma', 'Cardiac', 'Respiratory', 'Fire', 'MVA', 'Hazmat', 'MCI', 'Behavioral', 'OB/GYN', 'Pediatric', 'Other'];
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical', 'Mass Casualty'];
const STATUSES = ['Active', 'Dispatched', 'En Route', 'On Scene', 'Transporting', 'Resolved', 'Cancelled'];

const emptyForm = {
  incident_number: '', call_id: '', incident_type: '', location_address: '', lat: '', lng: '',
  date_time: '', units_involved: '', patients_count: '', severity: '', nfirs_code: '',
  nemsis_code: '', narrative: '', status: 'Active',
};

export default function IncidentsPage() {
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
      if (!res.ok) throw new Error('Failed to fetch incidents');
      setItems(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.incident_number || '').toLowerCase().includes(q) ||
      (i.incident_type || '').toLowerCase().includes(q) ||
      (i.location_address || '').toLowerCase().includes(q) ||
      (i.severity || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q)
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
    if (!window.confirm('Delete this incident? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null); fetchData();
    } catch (err) { setError(err.message); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const fmtDate = (v) => v ? new Date(v).toLocaleString() : '-';

  const severityColor = (s) => {
    if (s === 'Critical' || s === 'Mass Casualty') return '#e74c3c';
    if (s === 'Major') return '#e67e22';
    if (s === 'Moderate') return '#f39c12';
    return '#27ae60';
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Incident Mapping</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Incident #','Type','Location','Date','Units Involved','Severity','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={S.empty}>No incidents found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} style={S.tr} onClick={() => setSelected(row)}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{...S.td, fontWeight: 600}}>{row.incident_number}</td>
                  <td style={S.td}>{row.incident_type}</td>
                  <td style={{...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.location_address}</td>
                  <td style={S.td}>{fmtDate(row.date_time)}</td>
                  <td style={S.td}>{row.units_involved}</td>
                  <td style={S.td}><span style={{...S.badge, background: severityColor(row.severity)}}>{row.severity}</span></td>
                  <td style={S.td}><span style={{...S.badge, background: row.status === 'Resolved' ? '#27ae60' : row.status === 'Active' || row.status === 'On Scene' ? '#3498db' : '#f39c12'}}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Incident {selected.incident_number}</h2>
            <div style={S.detailGrid}>
              {Object.entries(selected).filter(([k]) => k !== 'id').map(([k, v]) => (
                <div key={k} style={k === 'narrative' ? {...S.detailItem, gridColumn: '1 / -1'} : S.detailItem}>
                  <span style={S.detailLabel}>{k.replace(/_/g, ' ')}</span>
                  <span style={S.detailValue}>{v != null ? String(v) : '-'}</span>
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
            <h2 style={S.modalTitle}>{editId ? 'Edit Incident' : 'Add Incident'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Incident Number *</label><input style={S.input} required value={form.incident_number} onChange={e => set('incident_number', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Call ID</label><input style={S.input} value={form.call_id} onChange={e => set('call_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Incident Type</label><select style={S.input} value={form.incident_type} onChange={e => set('incident_type', e.target.value)}><option value="">Select...</option>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Severity</label><select style={S.input} value={form.severity} onChange={e => set('severity', e.target.value)}><option value="">Select...</option>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Date / Time</label><input style={S.input} type="datetime-local" value={form.date_time ? form.date_time.substring(0,16) : ''} onChange={e => set('date_time', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Units Involved</label><input style={S.input} value={form.units_involved} onChange={e => set('units_involved', e.target.value)} placeholder="e.g. M1, E2, R3" /></div>
                <div style={S.field}><label style={S.label}>Patients Count</label><input style={S.input} type="number" min="0" value={form.patients_count} onChange={e => set('patients_count', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Latitude</label><input style={S.input} type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Longitude</label><input style={S.input} type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>NFIRS Code</label><input style={S.input} value={form.nfirs_code} onChange={e => set('nfirs_code', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>NEMSIS Code</label><input style={S.input} value={form.nemsis_code} onChange={e => set('nemsis_code', e.target.value)} /></div>
              </div>
              <div style={S.field}><label style={S.label}>Location Address</label><input style={S.input} value={form.location_address} onChange={e => set('location_address', e.target.value)} /></div>
              <div style={S.field}><label style={S.label}>Narrative</label><textarea style={{...S.input, minHeight: 80}} value={form.narrative} onChange={e => set('narrative', e.target.value)} /></div>
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
