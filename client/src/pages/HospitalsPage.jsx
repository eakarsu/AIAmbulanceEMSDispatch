import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/hospitals';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const ER_STATUS_COLORS = { open: '#22c55e', diversion: '#eab308', closed: '#dc2626' };
const ER_STATUS_OPTIONS = ['open', 'diversion', 'closed'];
const TRAUMA_LEVELS = ['Level I', 'Level II', 'Level III', 'Level IV', 'Level V', 'None'];

const emptyForm = {
  name: '', address: '', phone: '', er_status: 'open', trauma_level: '',
  stroke_center: false, cardiac_center: false, burn_center: false, pediatric_center: false,
  available_beds: 0, er_wait_minutes: 0, lat: '', lng: '',
};

function Badge({ value, colors }) {
  const color = colors[value] || '#6b7280';
  return (
    <span style={{ ...s.badge, backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>
      {String(value || '').replace(/_/g, ' ')}
    </span>
  );
}

function BoolBadge({ value, label }) {
  const color = value ? '#22c55e' : '#cbd5e1';
  return (
    <span style={{ ...s.badge, backgroundColor: color + '22', color: value ? '#16a34a' : '#94a3b8', border: `1px solid ${color}` }}>
      {label}
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

export default function HospitalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [erFilter, setErFilter] = useState('');
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
      if (!res.ok) throw new Error('Failed to fetch hospitals');
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
    if (erFilter) data = data.filter(i => i.er_status === erFilter);
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.address || '').toLowerCase().includes(q) ||
      (i.trauma_level || '').toLowerCase().includes(q)
    );
  }, [items, search, erFilter]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      name: item.name || '', address: item.address || '', phone: item.phone || '',
      er_status: item.er_status || 'open', trauma_level: item.trauma_level || '',
      stroke_center: !!item.stroke_center, cardiac_center: !!item.cardiac_center,
      burn_center: !!item.burn_center, pediatric_center: !!item.pediatric_center,
      available_beds: item.available_beds || 0, er_wait_minutes: item.er_wait_minutes || 0,
      lat: item.lat || '', lng: item.lng || '',
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
        available_beds: Number(form.available_beds),
        er_wait_minutes: Number(form.er_wait_minutes),
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
    if (!window.confirm('Are you sure you want to delete this hospital?')) return;
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

  const fmtWait = (mins) => {
    if (!mins && mins !== 0) return '-';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Hospitals</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ Add Hospital</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search hospitals..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={erFilter} onChange={e => setErFilter(e.target.value)}>
          <option value="">All ER Statuses</option>
          {ER_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Name', 'Address', 'ER Status', 'Trauma Level', 'Available Beds', 'Wait Time'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={s.td}>No hospitals found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.name}</strong></td>
                <td style={s.td}>{item.address || '-'}</td>
                <td style={s.td}><Badge value={item.er_status} colors={ER_STATUS_COLORS} /></td>
                <td style={s.td}>{item.trauma_level || '-'}</td>
                <td style={s.td}>{item.available_beds != null ? item.available_beds : '-'}</td>
                <td style={s.td}>{fmtWait(item.er_wait_minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || ''} wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Name" value={selected.name} />
              <DetailField label="Address" value={selected.address} />
              <DetailField label="Phone" value={selected.phone} />
              <DetailField label="ER Status" value={<Badge value={selected.er_status} colors={ER_STATUS_COLORS} />} />
              <DetailField label="Trauma Level" value={selected.trauma_level} />
              <DetailField label="Available Beds" value={selected.available_beds} />
              <DetailField label="ER Wait Time" value={fmtWait(selected.er_wait_minutes)} />
              <DetailField label="Latitude" value={selected.lat} />
              <DetailField label="Longitude" value={selected.lng} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={s.fieldLabel}>Specialty Centers</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <BoolBadge value={selected.stroke_center} label="Stroke Center" />
                <BoolBadge value={selected.cardiac_center} label="Cardiac Center" />
                <BoolBadge value={selected.burn_center} label="Burn Center" />
                <BoolBadge value={selected.pediatric_center} label="Pediatric Center" />
              </div>
            </div>
            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Hospital' : 'Add Hospital'} wide>
        <form onSubmit={handleSave}>
          <div style={s.grid2}>
            <FormField label="Name" value={form.name} onChange={v => updateField('name', v)} required />
            <FormField label="Phone" value={form.phone} onChange={v => updateField('phone', v)} />
          </div>
          <FormField label="Address" value={form.address} onChange={v => updateField('address', v)} required />
          <div style={s.grid2}>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>ER Status</label>
              <select style={s.input} value={form.er_status} onChange={e => updateField('er_status', e.target.value)}>
                {ER_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Trauma Level</label>
              <select style={s.input} value={form.trauma_level} onChange={e => updateField('trauma_level', e.target.value)}>
                <option value="">Select...</option>
                {TRAUMA_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <FormField label="Available Beds" value={form.available_beds} onChange={v => updateField('available_beds', v)} type="number" />
            <FormField label="ER Wait (minutes)" value={form.er_wait_minutes} onChange={v => updateField('er_wait_minutes', v)} type="number" />
            <FormField label="Latitude" value={form.lat} onChange={v => updateField('lat', v)} type="number" />
            <FormField label="Longitude" value={form.lng} onChange={v => updateField('lng', v)} type="number" />
          </div>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={s.fieldLabel}>Specialty Centers</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
              <Checkbox label="Stroke Center" checked={form.stroke_center} onChange={v => updateField('stroke_center', v)} />
              <Checkbox label="Cardiac Center" checked={form.cardiac_center} onChange={v => updateField('cardiac_center', v)} />
              <Checkbox label="Burn Center" checked={form.burn_center} onChange={v => updateField('burn_center', v)} />
              <Checkbox label="Pediatric Center" checked={form.pediatric_center} onChange={v => updateField('pediatric_center', v)} />
            </div>
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

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
      {label}
    </label>
  );
}

function DetailField({ label, value }) {
  return (
    <div style={s.detailField}>
      <div style={s.fieldLabel}>{label}</div>
      <div style={s.fieldValue}>{value != null && value !== '' ? value : '-'}</div>
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
