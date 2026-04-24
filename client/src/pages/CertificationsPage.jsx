import React, { useState, useEffect } from 'react';

const API = '/api/certifications';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const CERT_TYPES = ['EMT-Basic', 'EMT-Intermediate', 'Paramedic', 'CPR/BLS', 'ACLS', 'PALS', 'PHTLS', 'ITLS', 'EVOC', 'Hazmat', 'ICS-100', 'ICS-200', 'ICS-700', 'ICS-800'];
const STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Renewed', 'Revoked', 'Pending'];

const emptyForm = {
  crew_id: '', certification_type: '', certification_number: '', issuing_authority: '',
  issue_date: '', expiry_date: '', status: 'Active', ce_hours_completed: 0, ce_hours_required: 0,
};

export default function CertificationsPage() {
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
      if (!res.ok) throw new Error('Failed to fetch certifications');
      setItems(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.crew_id || '').toString().toLowerCase().includes(q) ||
      (i.certification_type || '').toLowerCase().includes(q) ||
      (i.certification_number || '').toLowerCase().includes(q) ||
      (i.issuing_authority || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q) ||
      (i.crew_name || '').toLowerCase().includes(q)
    ));
  }, [search, items]);

  const getExpiryStatus = (row) => {
    if (!row.expiry_date) return 'normal';
    const diff = new Date(row.expiry_date) - new Date();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'expired';
    if (days < 60) return 'expiring';
    return 'normal';
  };

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
    if (!window.confirm('Delete this certification record? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null); fetchData();
    } catch (err) { setError(err.message); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Certification Tracking</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search certifications..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Crew Member','Cert Type','Cert #','Issuing Authority','Expiry','Status','CE Hours'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={S.empty}>No certifications found</td></tr>
              ) : filtered.map(row => {
                const es = getExpiryStatus(row);
                const rowBg = es === 'expired' ? 'rgba(231,76,60,0.1)' : es === 'expiring' ? 'rgba(243,156,18,0.1)' : 'transparent';
                return (
                  <tr key={row.id} style={{...S.tr, background: rowBg}} onClick={() => setSelected(row)}
                    onMouseEnter={e => e.currentTarget.style.background = es === 'expired' ? 'rgba(231,76,60,0.18)' : es === 'expiring' ? 'rgba(243,156,18,0.18)' : 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                    <td style={S.td}>{row.crew_name || row.crew_id}</td>
                    <td style={S.td}>{row.certification_type}</td>
                    <td style={S.td}>{row.certification_number}</td>
                    <td style={S.td}>{row.issuing_authority}</td>
                    <td style={{...S.td, color: es === 'expired' ? '#e74c3c' : es === 'expiring' ? '#f39c12' : 'inherit', fontWeight: es !== 'normal' ? 600 : 400}}>
                      {fmtDate(row.expiry_date)} {es === 'expired' && ' (EXPIRED)'} {es === 'expiring' && ' (EXPIRING)'}
                    </td>
                    <td style={S.td}><span style={{...S.badge, background: row.status === 'Active' ? '#27ae60' : row.status === 'Expired' || row.status === 'Revoked' ? '#e74c3c' : '#f39c12'}}>{row.status}</span></td>
                    <td style={S.td}>{row.ce_hours_completed || 0} / {row.ce_hours_required || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Certification - {selected.certification_type}</h2>
            <div style={S.detailGrid}>
              {Object.entries(selected).filter(([k]) => k !== 'id').map(([k, v]) => (
                <div key={k} style={S.detailItem}>
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
          <div style={{...S.modal, maxWidth: 600}} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editId ? 'Edit Certification' : 'Add Certification'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Crew ID *</label><input style={S.input} required value={form.crew_id} onChange={e => set('crew_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Certification Type *</label><select style={S.input} required value={form.certification_type} onChange={e => set('certification_type', e.target.value)}><option value="">Select...</option>{CERT_TYPES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Certification Number</label><input style={S.input} value={form.certification_number} onChange={e => set('certification_number', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Issuing Authority</label><input style={S.input} value={form.issuing_authority} onChange={e => set('issuing_authority', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Issue Date</label><input style={S.input} type="date" value={form.issue_date ? form.issue_date.substring(0,10) : ''} onChange={e => set('issue_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Expiry Date</label><input style={S.input} type="date" value={form.expiry_date ? form.expiry_date.substring(0,10) : ''} onChange={e => set('expiry_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>CE Hours Completed</label><input style={S.input} type="number" min="0" step="0.5" value={form.ce_hours_completed} onChange={e => set('ce_hours_completed', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>CE Hours Required</label><input style={S.input} type="number" min="0" step="0.5" value={form.ce_hours_required} onChange={e => set('ce_hours_required', e.target.value)} /></div>
              </div>
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
