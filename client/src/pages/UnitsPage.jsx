import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/units';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const STATUS_COLORS = {
  available: '#22c55e',
  en_route: '#eab308',
  on_scene: '#f97316',
  at_hospital: '#3b82f6',
  out_of_service: '#6b7280',
};

const UNIT_TYPES = ['BLS', 'ALS', 'Supervisor', 'Fly Car'];
const STATUS_OPTIONS = ['available', 'en_route', 'on_scene', 'at_hospital', 'out_of_service'];

const emptyForm = {
  unit_number: '', unit_type: 'BLS', status: 'available', station: '',
  crew_lead: '', capability_level: '', current_lat: '', current_lng: '',
};

// ── Inline sub-components ──────────────────────────────────────
function StatusBadge({ status, colors }) {
  const bg = colors[status] || '#6b7280';
  return (
    <span style={{ ...s.badge, backgroundColor: bg + '22', color: bg, border: `1px solid ${bg}44` }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function Modal({ open, onClose, title, wide, children }) {
  if (!open) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, ...(wide ? { maxWidth: 800 } : {}) }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{title}</h2>
          <button style={s.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div style={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function UnitsPage() {
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

  // Fetch
  const fetchData = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `${API}?status=${statusFilter}` : API;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch units');
      setItems(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  // Filtered
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.unit_number || '').toLowerCase().includes(q) ||
      (i.unit_type || '').toLowerCase().includes(q) ||
      (i.station || '').toLowerCase().includes(q) ||
      (i.crew_lead || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // CRUD
  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      unit_number: item.unit_number || '', unit_type: item.unit_type || 'BLS',
      status: item.status || 'available', station: item.station || '',
      crew_lead: item.crew_lead || '', capability_level: item.capability_level || '',
      current_lat: item.current_lat || '', current_lng: item.current_lng || '',
    });
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
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
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
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
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

  const quickStatus = async (item, newStatus) => {
    try {
      const res = await fetch(`${API}/${item.id}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ ...item, status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const updated = await res.json();
      setSelected(updated);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Units Management</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ Add New Unit</button>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search units..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Unit #', 'Type', 'Status', 'Station', 'Crew Lead', 'Capability'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={s.td}>No units found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.unit_number}</strong></td>
                <td style={s.td}>{item.unit_type}</td>
                <td style={s.td}><StatusBadge status={item.status} colors={STATUS_COLORS} /></td>
                <td style={s.td}>{item.station}</td>
                <td style={s.td}>{item.crew_lead}</td>
                <td style={s.td}>{item.capability_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Unit ${selected?.unit_number || ''}`} wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Unit Number" value={selected.unit_number} />
              <DetailField label="Type" value={selected.unit_type} />
              <DetailField label="Status" value={<StatusBadge status={selected.status} colors={STATUS_COLORS} />} />
              <DetailField label="Station" value={selected.station} />
              <DetailField label="Crew Lead" value={selected.crew_lead} />
              <DetailField label="Capability" value={selected.capability_level} />
              <DetailField label="Latitude" value={selected.current_lat} />
              <DetailField label="Longitude" value={selected.current_lng} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={s.fieldLabel}>Quick Status Change</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(st => (
                  <button key={st} onClick={() => quickStatus(selected, st)}
                    style={{
                      ...s.smallBtn,
                      backgroundColor: STATUS_COLORS[st] + '22',
                      color: STATUS_COLORS[st],
                      border: `1px solid ${STATUS_COLORS[st]}44`,
                      fontWeight: selected.status === st ? 700 : 500,
                    }}>
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Unit' : 'Add New Unit'}>
        <form onSubmit={handleSave}>
          <FormField label="Unit Number" value={form.unit_number} onChange={v => updateField('unit_number', v)} required />
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Unit Type</label>
            <select style={s.input} value={form.unit_type} onChange={e => updateField('unit_type', e.target.value)}>
              {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Status</label>
            <select style={s.input} value={form.status} onChange={e => updateField('status', e.target.value)}>
              {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <FormField label="Station" value={form.station} onChange={v => updateField('station', v)} />
          <FormField label="Crew Lead" value={form.crew_lead} onChange={v => updateField('crew_lead', v)} />
          <FormField label="Capability Level" value={form.capability_level} onChange={v => updateField('capability_level', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Latitude" value={form.current_lat} onChange={v => updateField('current_lat', v)} type="number" />
            <FormField label="Longitude" value={form.current_lng} onChange={v => updateField('current_lng', v)} type="number" />
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

// ── Helper components ──────────────────────────────────────────
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

// ── Styles ─────────────────────────────────────────────────────
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
  smallBtn: { padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none' },
  error: { padding: '12px 16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 14 },
};
