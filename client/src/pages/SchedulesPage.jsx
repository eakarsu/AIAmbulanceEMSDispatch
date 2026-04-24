import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/schedules';
const CREW_API = '/api/crew';
const UNITS_API = '/api/units';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const SHIFT_TYPES = ['12hr', '24hr', '48hr'];
const STATUS_OPTIONS = ['scheduled', 'active', 'completed', 'cancelled', 'swapped'];
const STATUS_COLORS = {
  scheduled: '#3b82f6', active: '#22c55e', completed: '#6b7280', cancelled: '#ef4444', swapped: '#8b5cf6',
};

const emptyForm = {
  crew_id: '', shift_type: '12hr', shift_start: '', shift_end: '',
  assigned_unit_id: '', status: 'scheduled', notes: '',
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

export default function SchedulesPage() {
  const [items, setItems] = useState([]);
  const [crew, setCrew] = useState([]);
  const [units, setUnits] = useState([]);
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
      if (!res.ok) throw new Error('Failed to fetch schedules');
      setItems(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async () => {
    try {
      const [crewRes, unitsRes] = await Promise.all([
        fetch(CREW_API, { headers: getHeaders() }),
        fetch(UNITS_API, { headers: getHeaders() }),
      ]);
      if (crewRes.ok) setCrew(await crewRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
    } catch (_) { /* silent */ }
  };

  useEffect(() => { fetchData(); fetchRelated(); }, []);

  const filtered = useMemo(() => {
    let data = items;
    if (statusFilter) data = data.filter(i => i.status === statusFilter);
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(i =>
      (i.first_name || '').toLowerCase().includes(q) ||
      (i.last_name || '').toLowerCase().includes(q) ||
      (i.shift_type || '').toLowerCase().includes(q) ||
      (i.crew_employee_id || '').toLowerCase().includes(q)
    );
  }, [items, search, statusFilter]);

  const getCrewName = (item) => {
    if (item.first_name && item.last_name) return `${item.first_name} ${item.last_name}`;
    const c = crew.find(c => c.id === item.crew_id);
    return c ? `${c.first_name} ${c.last_name}` : item.crew_id || '-';
  };

  const getUnitLabel = (id) => {
    const u = units.find(u => u.id === id);
    return u ? u.unit_number : id || '-';
  };

  const fmtDt = (d) => d ? new Date(d).toLocaleString() : '-';

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      crew_id: item.crew_id || '', shift_type: item.shift_type || '12hr',
      shift_start: item.shift_start ? new Date(item.shift_start).toISOString().slice(0, 16) : '',
      shift_end: item.shift_end ? new Date(item.shift_end).toISOString().slice(0, 16) : '',
      assigned_unit_id: item.assigned_unit_id || '', status: item.status || 'scheduled',
      notes: item.notes || '',
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
      const payload = {
        ...form,
        crew_id: form.crew_id || null,
        assigned_unit_id: form.assigned_unit_id || null,
      };
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
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
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

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Schedules</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ Add Schedule</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search schedules..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Crew Member', 'Shift Type', 'Start', 'End', 'Unit', 'Status'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={s.td}>No schedules found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{getCrewName(item)}</strong></td>
                <td style={s.td}>{item.shift_type}</td>
                <td style={s.td}>{fmtDt(item.shift_start)}</td>
                <td style={s.td}>{fmtDt(item.shift_end)}</td>
                <td style={s.td}>{getUnitLabel(item.assigned_unit_id)}</td>
                <td style={s.td}><Badge value={item.status} colors={STATUS_COLORS} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Schedule Detail" wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Crew Member" value={getCrewName(selected)} />
              <DetailField label="Shift Type" value={selected.shift_type} />
              <DetailField label="Start" value={fmtDt(selected.shift_start)} />
              <DetailField label="End" value={fmtDt(selected.shift_end)} />
              <DetailField label="Unit" value={getUnitLabel(selected.assigned_unit_id)} />
              <DetailField label="Status" value={<Badge value={selected.status} colors={STATUS_COLORS} />} />
            </div>
            {selected.notes && (
              <div style={{ marginTop: 16 }}>
                <div style={s.fieldLabel}>Notes</div>
                <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
              </div>
            )}
            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Schedule' : 'Add Schedule'}>
        <form onSubmit={handleSave}>
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Crew Member *</label>
            <select style={s.input} value={form.crew_id} required onChange={e => updateField('crew_id', e.target.value)}>
              <option value="">Select crew member...</option>
              {crew.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.employee_id})</option>)}
            </select>
          </div>
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Shift Type</label>
            <select style={s.input} value={form.shift_type} onChange={e => updateField('shift_type', e.target.value)}>
              {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FormField label="Shift Start" value={form.shift_start} onChange={v => updateField('shift_start', v)} type="datetime-local" required />
          <FormField label="Shift End" value={form.shift_end} onChange={v => updateField('shift_end', v)} type="datetime-local" required />
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Assigned Unit</label>
            <select style={s.input} value={form.assigned_unit_id} onChange={e => updateField('assigned_unit_id', e.target.value)}>
              <option value="">None</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} ({u.unit_type})</option>)}
            </select>
          </div>
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Status</label>
            <select style={s.input} value={form.status} onChange={e => updateField('status', e.target.value)}>
              {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Notes</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={form.notes}
              onChange={e => updateField('notes', e.target.value)} />
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
  error: { padding: '12px 16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 14 },
};
