import React, { useState, useEffect } from 'react';

const API = '/api/equipment';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const CATEGORIES = ['Medical', 'Communication', 'Safety', 'Vehicle'];
const STATUSES = ['Available', 'In Use', 'Out of Service', 'Maintenance'];

const emptyForm = {
  name: '', category: '', unit_id: '', serial_number: '', status: 'Available',
  last_inspected: '', next_inspection_due: '', quantity: 1, notes: '',
};

export default function EquipmentPage() {
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch equipment');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.serial_number || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q)
    ));
  }, [search, items]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = () => { setForm({ ...emptyForm, ...selected }); setEditId(selected.id); setShowForm(true); setSelected(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editId ? `${API}/${editId}` : API;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Equipment Inventory</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search equipment..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Name','Category','Unit','Serial #','Status','Next Inspection'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={S.empty}>No equipment found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} style={S.tr} onClick={() => setSelected(row)} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={S.td}>{row.name}</td>
                  <td style={S.td}>{row.category}</td>
                  <td style={S.td}>{row.unit_id}</td>
                  <td style={S.td}>{row.serial_number}</td>
                  <td style={S.td}><span style={{...S.badge, background: row.status === 'Available' ? '#27ae60' : row.status === 'Out of Service' ? '#e74c3c' : '#f39c12'}}>{row.status}</span></td>
                  <td style={S.td}>{row.next_inspection_due ? new Date(row.next_inspection_due).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{selected.name}</h2>
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

      {/* Form Modal */}
      {showForm && (
        <div style={S.overlay} onClick={() => setShowForm(false)}>
          <div style={{...S.modal, maxWidth: 600}} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editId ? 'Edit Equipment' : 'Add Equipment'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Name *</label><input style={S.input} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => set('category', e.target.value)}><option value="">Select...</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Unit ID</label><input style={S.input} value={form.unit_id} onChange={e => set('unit_id', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Serial Number</label><input style={S.input} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Quantity</label><input style={S.input} type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Last Inspected</label><input style={S.input} type="date" value={form.last_inspected ? form.last_inspected.substring(0,10) : ''} onChange={e => set('last_inspected', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Next Inspection Due</label><input style={S.input} type="date" value={form.next_inspection_due ? form.next_inspection_due.substring(0,10) : ''} onChange={e => set('next_inspection_due', e.target.value)} /></div>
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
