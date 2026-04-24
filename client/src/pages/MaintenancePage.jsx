import React, { useState, useEffect } from 'react';

const API = '/api/maintenance';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const TYPES = ['Preventive', 'Corrective', 'Emergency', 'Inspection', 'Oil Change', 'Tire Rotation', 'Brake Service'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

const emptyForm = {
  unit_id: '', maintenance_type: '', description: '', scheduled_date: '', completed_date: '',
  mileage: '', cost: '', vendor: '', status: 'Scheduled', next_due_date: '', next_due_mileage: '', notes: '',
};

export default function MaintenancePage() {
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
      if (!res.ok) throw new Error('Failed to fetch maintenance records');
      setItems(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.unit_id || '').toString().toLowerCase().includes(q) ||
      (i.maintenance_type || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q) ||
      (i.vendor || '').toLowerCase().includes(q)
    ));
  }, [search, items]);

  const isOverdue = (row) => {
    if (row.status === 'Completed' || row.status === 'Cancelled') return false;
    if (!row.scheduled_date) return false;
    return new Date(row.scheduled_date) < new Date();
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
    if (!window.confirm('Delete this maintenance record? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null); fetchData();
    } catch (err) { setError(err.message); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const fmtCurrency = (v) => v != null && v !== '' ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
  const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Vehicle Maintenance</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search maintenance..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Unit','Type','Description','Scheduled Date','Status','Mileage','Cost'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={S.empty}>No maintenance records found</td></tr>
              ) : filtered.map(row => {
                const overdue = isOverdue(row);
                return (
                  <tr key={row.id} style={{...S.tr, ...(overdue ? { background: 'rgba(231,76,60,0.1)' } : {})}} onClick={() => setSelected(row)}
                    onMouseEnter={e => e.currentTarget.style.background = overdue ? 'rgba(231,76,60,0.18)' : 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = overdue ? 'rgba(231,76,60,0.1)' : 'transparent'}>
                    <td style={S.td}>{row.unit_id}</td>
                    <td style={S.td}>{row.maintenance_type}</td>
                    <td style={{...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.description}</td>
                    <td style={{...S.td, ...(overdue ? { color: '#ff6b6b', fontWeight: 600 } : {})}}>{fmtDate(row.scheduled_date)} {overdue && ' (OVERDUE)'}</td>
                    <td style={S.td}><span style={{...S.badge, background: row.status === 'Completed' ? '#27ae60' : row.status === 'Overdue' ? '#e74c3c' : row.status === 'In Progress' ? '#3498db' : '#f39c12'}}>{row.status}</span></td>
                    <td style={S.td}>{row.mileage ? Number(row.mileage).toLocaleString() : '-'}</td>
                    <td style={S.td}>{fmtCurrency(row.cost)}</td>
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
            <h2 style={S.modalTitle}>Maintenance Record - Unit {selected.unit_id}</h2>
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
          <div style={{...S.modal, maxWidth: 640}} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editId ? 'Edit Maintenance' : 'Add Maintenance'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Unit ID *</label><input style={S.input} required value={form.unit_id} onChange={e => set('unit_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Type</label><select style={S.input} value={form.maintenance_type} onChange={e => set('maintenance_type', e.target.value)}><option value="">Select...</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Scheduled Date</label><input style={S.input} type="date" value={form.scheduled_date ? form.scheduled_date.substring(0,10) : ''} onChange={e => set('scheduled_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Completed Date</label><input style={S.input} type="date" value={form.completed_date ? form.completed_date.substring(0,10) : ''} onChange={e => set('completed_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Mileage</label><input style={S.input} type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Cost ($)</label><input style={S.input} type="number" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Vendor</label><input style={S.input} value={form.vendor} onChange={e => set('vendor', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Next Due Date</label><input style={S.input} type="date" value={form.next_due_date ? form.next_due_date.substring(0,10) : ''} onChange={e => set('next_due_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Next Due Mileage</label><input style={S.input} type="number" value={form.next_due_mileage} onChange={e => set('next_due_mileage', e.target.value)} /></div>
              </div>
              <div style={S.field}><label style={S.label}>Description</label><textarea style={{...S.input, minHeight: 60}} value={form.description} onChange={e => set('description', e.target.value)} /></div>
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
