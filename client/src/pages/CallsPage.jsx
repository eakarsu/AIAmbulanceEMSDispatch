import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/calls';
const UNITS_API = '/api/units';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const PRIORITY_MAP = {
  1: { label: 'Critical', color: '#dc2626' },
  2: { label: 'Emergent', color: '#f97316' },
  3: { label: 'Urgent', color: '#eab308' },
  4: { label: 'Non-urgent', color: '#22c55e' },
};

const STATUS_COLORS = {
  pending: '#6b7280',
  dispatched: '#3b82f6',
  en_route: '#eab308',
  on_scene: '#f97316',
  transporting: '#8b5cf6',
  at_hospital: '#06b6d4',
  closed: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_OPTIONS = Object.keys(STATUS_COLORS);
const CALL_TYPES = ['Medical', 'Trauma', 'Cardiac', 'Respiratory', 'Psychiatric', 'OB/GYN', 'Pediatric', 'MVC', 'Fire', 'Other'];

const emptyForm = {
  call_number: '', call_type: 'Medical', priority: 3, caller_name: '', caller_phone: '',
  patient_name: '', patient_age: '', patient_gender: '', location_address: '',
  chief_complaint: '', description: '', assigned_unit_id: '', destination_hospital: '',
  status: 'pending',
};

function StatusBadge({ value, colorMap }) {
  const color = colorMap[value] || '#6b7280';
  return (
    <span style={{ ...s.badge, backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_MAP[priority] || { label: `P${priority}`, color: '#6b7280' };
  return (
    <span style={{ ...s.badge, backgroundColor: p.color + '22', color: p.color, border: `1px solid ${p.color}44` }}>
      P{priority} - {p.label}
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

export default function CallsPage() {
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const qs = params.toString();
      const url = qs ? `${API}?${qs}` : API;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch calls');
      setItems(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch(UNITS_API, { headers: getHeaders() });
      if (res.ok) setUnits(await res.json());
    } catch (_) { /* silent */ }
  };

  useEffect(() => { fetchData(); }, [statusFilter, priorityFilter]);
  useEffect(() => { fetchUnits(); }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.call_number || '').toLowerCase().includes(q) ||
      (i.call_type || '').toLowerCase().includes(q) ||
      (i.patient_name || '').toLowerCase().includes(q) ||
      (i.location_address || '').toLowerCase().includes(q) ||
      (i.chief_complaint || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const getUnitLabel = (id) => {
    const u = units.find(u => u.id === id);
    return u ? `${u.unit_number} (${u.unit_type})` : id || '-';
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      call_number: item.call_number || '', call_type: item.call_type || 'Medical',
      priority: item.priority || 3, caller_name: item.caller_name || '',
      caller_phone: item.caller_phone || '', patient_name: item.patient_name || '',
      patient_age: item.patient_age || '', patient_gender: item.patient_gender || '',
      location_address: item.location_address || '', chief_complaint: item.chief_complaint || '',
      description: item.description || '', assigned_unit_id: item.assigned_unit_id || '',
      destination_hospital: item.destination_hospital || '', status: item.status || 'pending',
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
      const payload = { ...form, priority: Number(form.priority), assigned_unit_id: form.assigned_unit_id || null };
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
    if (!window.confirm('Are you sure you want to delete this call?')) return;
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

  const fmtTime = (t) => t ? new Date(t).toLocaleString() : '-';

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Calls / Dispatch</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ New Call</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search calls..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
        </select>
        <select style={s.select} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {[1, 2, 3, 4].map(p => <option key={p} value={p}>P{p} - {PRIORITY_MAP[p].label}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Call #', 'Type', 'Priority', 'Status', 'Location', 'Assigned Unit', 'Time'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={s.td}>No calls found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.call_number}</strong></td>
                <td style={s.td}>{item.call_type}</td>
                <td style={s.td}><PriorityBadge priority={item.priority} /></td>
                <td style={s.td}><StatusBadge value={item.status} colorMap={STATUS_COLORS} /></td>
                <td style={s.td}>{item.location_address || '-'}</td>
                <td style={s.td}>{getUnitLabel(item.assigned_unit_id)}</td>
                <td style={s.td}>{fmtTime(item.created_at || item.dispatch_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Call ${selected?.call_number || ''}`} wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Call Number" value={selected.call_number} />
              <DetailField label="Call Type" value={selected.call_type} />
              <DetailField label="Priority" value={<PriorityBadge priority={selected.priority} />} />
              <DetailField label="Status" value={<StatusBadge value={selected.status} colorMap={STATUS_COLORS} />} />
              <DetailField label="Caller Name" value={selected.caller_name} />
              <DetailField label="Caller Phone" value={selected.caller_phone} />
              <DetailField label="Patient Name" value={selected.patient_name} />
              <DetailField label="Patient Age" value={selected.patient_age} />
              <DetailField label="Patient Gender" value={selected.patient_gender} />
              <DetailField label="Location" value={selected.location_address} />
              <DetailField label="Chief Complaint" value={selected.chief_complaint} />
              <DetailField label="Assigned Unit" value={getUnitLabel(selected.assigned_unit_id)} />
              <DetailField label="Destination Hospital" value={selected.destination_hospital} />
              <DetailField label="Dispatch Time" value={fmtTime(selected.dispatch_time)} />
              <DetailField label="En Route Time" value={fmtTime(selected.en_route_time)} />
              <DetailField label="On Scene Time" value={fmtTime(selected.on_scene_time)} />
              <DetailField label="Hospital Arrival" value={fmtTime(selected.hospital_arrival_time)} />
              <DetailField label="Response Time (s)" value={selected.response_time_seconds} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 16 }}>
                <div style={s.fieldLabel}>Description</div>
                <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap' }}>{selected.description}</div>
              </div>
            )}
            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Call' : 'New Call'} wide>
        <form onSubmit={handleSave}>
          <div style={s.grid2}>
            <FormField label="Call Number" value={form.call_number} onChange={v => updateField('call_number', v)} required />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Call Type</label>
              <select style={s.input} value={form.call_type} onChange={e => updateField('call_type', e.target.value)}>
                {CALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Priority *</label>
              <select style={s.input} value={form.priority} onChange={e => updateField('priority', e.target.value)}>
                {[1, 2, 3, 4].map(p => <option key={p} value={p}>P{p} - {PRIORITY_MAP[p].label}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Status</label>
              <select style={s.input} value={form.status} onChange={e => updateField('status', e.target.value)}>
                {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <FormField label="Caller Name" value={form.caller_name} onChange={v => updateField('caller_name', v)} />
            <FormField label="Caller Phone" value={form.caller_phone} onChange={v => updateField('caller_phone', v)} />
            <FormField label="Patient Name" value={form.patient_name} onChange={v => updateField('patient_name', v)} />
            <FormField label="Patient Age" value={form.patient_age} onChange={v => updateField('patient_age', v)} type="number" />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Patient Gender</label>
              <select style={s.input} value={form.patient_gender} onChange={e => updateField('patient_gender', e.target.value)}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Assigned Unit</label>
              <select style={s.input} value={form.assigned_unit_id} onChange={e => updateField('assigned_unit_id', e.target.value)}>
                <option value="">None</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} ({u.unit_type})</option>)}
              </select>
            </div>
            <FormField label="Destination Hospital" value={form.destination_hospital} onChange={v => updateField('destination_hospital', v)} />
          </div>
          <FormField label="Location Address" value={form.location_address} onChange={v => updateField('location_address', v)} required />
          <FormField label="Chief Complaint" value={form.chief_complaint} onChange={v => updateField('chief_complaint', v)} required />
          <div style={s.formGroup}>
            <label style={s.fieldLabel}>Description</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={form.description}
              onChange={e => updateField('description', e.target.value)} />
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
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
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
