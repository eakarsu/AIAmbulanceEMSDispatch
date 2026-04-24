import React, { useState, useEffect, useMemo } from 'react';

const API = '/api/protocols';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const CATEGORIES = ['Cardiac', 'Respiratory', 'Trauma', 'Medical', 'Pediatric', 'OB/GYN', 'Behavioral', 'Toxicology', 'Environmental', 'Other'];

const emptyForm = {
  protocol_number: '', title: '', category: 'Medical', description: '', steps: '',
  medications: '', contraindications: '', special_considerations: '',
  bls_scope: true, als_scope: true,
};

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

function ScopeBadge({ bls, als }) {
  const parts = [];
  if (bls) parts.push('BLS');
  if (als) parts.push('ALS');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {parts.length === 0 ? (
        <span style={{ ...s.badge, backgroundColor: '#f1f5f9', color: '#94a3b8' }}>None</span>
      ) : parts.map(p => (
        <span key={p} style={{
          ...s.badge,
          backgroundColor: p === 'ALS' ? '#3b82f622' : '#22c55e22',
          color: p === 'ALS' ? '#3b82f6' : '#22c55e',
          border: `1px solid ${p === 'ALS' ? '#3b82f644' : '#22c55e44'}`,
        }}>{p}</span>
      ))}
    </div>
  );
}

export default function ProtocolsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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
      if (!res.ok) throw new Error('Failed to fetch protocols');
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
    if (categoryFilter) data = data.filter(i => i.category === categoryFilter);
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(i =>
      (i.protocol_number || '').toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    );
  }, [items, search, categoryFilter]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      protocol_number: item.protocol_number || '', title: item.title || '',
      category: item.category || 'Medical', description: item.description || '',
      steps: item.steps || '', medications: item.medications || '',
      contraindications: item.contraindications || '',
      special_considerations: item.special_considerations || '',
      bls_scope: item.bls_scope !== false, als_scope: item.als_scope !== false,
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
    if (!window.confirm('Are you sure you want to delete this protocol?')) return;
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

  // Unique categories from data
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    CATEGORIES.forEach(c => cats.add(c));
    return [...cats].sort();
  }, [items]);

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Protocols</h1>
        <button style={s.primaryBtn} onClick={openAdd}>+ Add Protocol</button>
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="Search protocols..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Protocol #', 'Title', 'Category', 'BLS/ALS Scope'].map(h =>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={s.td}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={s.td}>No protocols found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={s.tr} onClick={() => openDetail(item)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td style={s.td}><strong>{item.protocol_number}</strong></td>
                <td style={s.td}>{item.title}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    {item.category}
                  </span>
                </td>
                <td style={s.td}><ScopeBadge bls={item.bls_scope} als={item.als_scope} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal - Full protocol view */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={selected ? `${selected.protocol_number} - ${selected.title}` : ''} wide>
        {selected && (
          <div>
            <div style={s.detailGrid}>
              <DetailField label="Protocol Number" value={selected.protocol_number} />
              <DetailField label="Category" value={selected.category} />
              <DetailField label="Scope" value={<ScopeBadge bls={selected.bls_scope} als={selected.als_scope} />} />
            </div>

            <SectionBlock title="Description" content={selected.description} />
            <SectionBlock title="Steps" content={selected.steps} />
            <SectionBlock title="Medications" content={selected.medications} />
            <SectionBlock title="Contraindications" content={selected.contraindications} highlight />
            <SectionBlock title="Special Considerations" content={selected.special_considerations} />

            <div style={s.detailActions}>
              <button style={s.primaryBtn} onClick={() => openEdit(selected)}>Edit</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Protocol' : 'Add Protocol'} wide>
        <form onSubmit={handleSave}>
          <div style={s.grid2}>
            <FormField label="Protocol Number" value={form.protocol_number} onChange={v => updateField('protocol_number', v)} required />
            <FormField label="Title" value={form.title} onChange={v => updateField('title', v)} required />
            <div style={s.formGroup}>
              <label style={s.fieldLabel}>Category</label>
              <select style={s.input} value={form.category} onChange={e => updateField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <TextArea label="Description" value={form.description} onChange={v => updateField('description', v)} rows={3} />
          <TextArea label="Steps" value={form.steps} onChange={v => updateField('steps', v)} rows={5} />
          <TextArea label="Medications" value={form.medications} onChange={v => updateField('medications', v)} rows={3} />
          <TextArea label="Contraindications" value={form.contraindications} onChange={v => updateField('contraindications', v)} rows={3} />
          <TextArea label="Special Considerations" value={form.special_considerations} onChange={v => updateField('special_considerations', v)} rows={3} />
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <Checkbox label="BLS Scope" checked={form.bls_scope} onChange={v => updateField('bls_scope', v)} />
            <Checkbox label="ALS Scope" checked={form.als_scope} onChange={v => updateField('als_scope', v)} />
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

function SectionBlock({ title, content, highlight }) {
  if (!content) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={s.fieldLabel}>{title}</div>
      <div style={{
        whiteSpace: 'pre-wrap', fontSize: 14, color: '#1e293b', padding: 12, borderRadius: 8,
        backgroundColor: highlight ? '#fef2f2' : '#f8fafc',
        border: highlight ? '1px solid #fecaca' : '1px solid #e2e8f0',
        lineHeight: 1.6,
      }}>
        {content}
      </div>
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

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div style={s.formGroup}>
      <label style={s.fieldLabel}>{label}</label>
      <textarea style={{ ...s.input, minHeight: rows * 24, resize: 'vertical' }} value={value}
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
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
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
