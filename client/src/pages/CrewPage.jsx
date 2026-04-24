import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/crew';
const UNITS_API = '/api/units';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const ROLES = ['EMT-B', 'EMT-A', 'Paramedic', 'Driver'];
const CERT_LEVELS = ['EMT-Basic', 'EMT-Advanced', 'Paramedic', 'Critical Care'];
const STATUS_OPTIONS = ['active', 'off_duty', 'on_leave', 'suspended', 'inactive'];

const STATUS_COLORS = {
  active: '#22c55e', off_duty: '#6b7280', on_leave: '#eab308', suspended: '#ef4444', inactive: '#94a3b8',
};

const FATIGUE_COLORS = {
  low: '#22c55e', moderate: '#eab308', high: '#f97316', critical: '#dc2626',
};

const emptyForm = {
  employee_id: '', first_name: '', last_name: '', role: 'EMT-B', certification_level: 'EMT-Basic',
  phone: '', email: '', hire_date: '', assigned_unit_id: '', status: 'active',
  hours_this_week: 0, consecutive_hours: 0,
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

export default function CrewPage() {
  const [items, setItems] = useState([]);
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
      if (!res.ok) throw new Error('Failed to fetch crew');
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

  useEffect(() => { fetchData(); fetchUnits(); }, []);

  const filtered = useMemo(() => {
    let data = items;
    if (statusFilter) data = data.filter(i => i.status === statusFilter);
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(i =>
      (i.employee_id || '').toLowerCase().includes(q) ||
      (i.first_name || '').toLowerCase().includes(q) ||
      (i.last_name || '').toLowerCase().includes(q) ||
      (i.role || '').toLowerCase().includes(q) ||
      (i.certification_level || '').toLowerCase().includes(q)
    );
  }, [items, search, statusFilter]);

  const getUnitLabel = (id) => {
    const u = units.find(u => u.id === id);
    return u ? u.unit_number : id || '-';
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      employee_id: item.employee_id || '', first_name: item.first_name || '',
      last_name: item.last_name || '', role: item.role || 'EMT-B',
      certification_level: item.certification_level || 'EMT-Basic',
      phone: item.phone || '', email: item.email || '',
      hire_date: item.hire_date ? item.hire_date.substring(0, 10) : '',
      assigned_unit_id: item.assigned_unit_id || '', status: item.status || 'active',
      hours_this_week: item.hours_this_week || 0, consecutive_hours: item.consecutive_hours || 0,
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
        hours_this_week: Number(form.hours_this_week),
        consecutive_hours: Number(form.consecutive_hours),
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
    if (!window.confirm('Are you sure you want to delete this crew member?')) return;
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
        <h1 style={s.pageTitle}>Crew Management</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ Add Crew Member</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search crew..." value={search}
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
              {['Employee ID', 'Name', 'Role', 'Certification', 'Status', 'Assigned Unit', 'Hours/Week', 'Fatigue Risk'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={s.td}>No crew members found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.employee_id}</strong></td>
                <td style={s.td}>{item.first_name} {item.last_name}</td>
                <td style={s.td}>{item.role}</td>
                <td style={s.td}>{item.certification_level}</td>
                <td style={s.td}><Badge value={item.status} colors={STATUS_COLORS} /></td>
                <td style={s.td}>{getUnitLabel(item.assigned_unit_id)}</td>
                <td style={s.td}>{item.hours_this_week || 0}h</td>
                <td style={s.td}><Badge value={item.fatigue_risk_level} colors={FATIGUE_COLORS} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={selected ? `${selected.first_name} ${selected.last_name}` : ''} wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Employee ID" value={selected.employee_id} />
              <DetailField label="Name" value={`${selected.first_name} ${selected.last_name}`} />
              <DetailField label="Role" value={selected.role} />
              <DetailField label="Certification" value={selected.certification_level} />
              <DetailField label="Status" value={<Badge value={selected.status} colors={STATUS_COLORS} />} />
              <DetailField label="Assigned Unit" value={getUnitLabel(selected.assigned_unit_id)} />
              <DetailField label="Phone" value={selected.phone} />
              <DetailField label="Email" value={selected.email} />
              <DetailField label="Hire Date" value={selected.hire_date ? new Date(selected.hire_date).toLocaleDateString() : '-'} />
              <DetailField label="Hours This Week" value={`${selected.hours_this_week || 0}h`} />
              <DetailField label="Consecutive Hours" value={`${selected.consecutive_hours || 0}h`} />
              <DetailField label="Fatigue Risk" value={<Badge value={selected.fatigue_risk_level} colors={FATIGUE_COLORS} />} />
            </div>
            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Crew Member' : 'Add Crew Member'} wide>
        <form onSubmit={handleSave}>
          <div style={s.grid2}>
            <FormField label="Employee ID" value={form.employee_id} onChange={v => updateField('employee_id', v)} required />
            <FormField label="First Name" value={form.first_name} onChange={v => updateField('first_name', v)} required />
            <FormField label="Last Name" value={form.last_name} onChange={v => updateField('last_name', v)} required />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Role</label>
              <select style={s.input} value={form.role} onChange={e => updateField('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Certification Level</label>
              <select style={s.input} value={form.certification_level} onChange={e => updateField('certification_level', e.target.value)}>
                {CERT_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <FormField label="Phone" value={form.phone} onChange={v => updateField('phone', v)} />
            <FormField label="Email" value={form.email} onChange={v => updateField('email', v)} type="email" />
            <FormField label="Hire Date" value={form.hire_date} onChange={v => updateField('hire_date', v)} type="date" />
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
                {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <FormField label="Hours This Week" value={form.hours_this_week} onChange={v => updateField('hours_this_week', v)} type="number" />
            <FormField label="Consecutive Hours" value={form.consecutive_hours} onChange={v => updateField('consecutive_hours', v)} type="number" />
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
