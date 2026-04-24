import React, { useState, useEffect } from 'react';

const API = '/api/metrics';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const emptyForm = {
  metric_date: '', total_calls: '', avg_response_time_seconds: '', calls_under_8_min: '',
  calls_under_12_min: '', total_transports: '', als_calls: '', bls_calls: '', cardiac_arrests: '',
  rosc_count: '', unit_utilization_pct: '', avg_turnaround_minutes: '', on_time_response_pct: '',
  patient_satisfaction_score: '',
};

export default function MetricsPage() {
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
      if (!res.ok) throw new Error('Failed to fetch metrics');
      setItems(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      (i.metric_date || '').toLowerCase().includes(q)
    ));
  }, [search, items]);

  // Summary stats
  const summary = items.length > 0 ? {
    avgCalls: (items.reduce((s, i) => s + (Number(i.total_calls) || 0), 0) / items.length).toFixed(1),
    avgResponseTime: (items.reduce((s, i) => s + (Number(i.avg_response_time_seconds) || 0), 0) / items.length).toFixed(0),
    avgUtilization: (items.reduce((s, i) => s + (Number(i.unit_utilization_pct) || 0), 0) / items.length).toFixed(1),
    avgSatisfaction: (items.reduce((s, i) => s + (Number(i.patient_satisfaction_score) || 0), 0) / items.length).toFixed(2),
  } : null;

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
    if (!window.confirm('Delete this metric record? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/${selected.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setSelected(null); fetchData();
    } catch (err) { setError(err.message); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';
  const fmtTime = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Performance Metrics</h1>
        <div style={S.actions}>
          <input style={S.search} placeholder="Search by date..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.addBtn} onClick={openAdd}>+ Add New</button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* Summary Stats */}
      {summary && (
        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <span style={S.statLabel}>Avg Daily Calls</span>
            <span style={S.statValue}>{summary.avgCalls}</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statLabel}>Avg Response Time</span>
            <span style={S.statValue}>{fmtTime(Number(summary.avgResponseTime))}</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statLabel}>Avg Utilization</span>
            <span style={S.statValue}>{summary.avgUtilization}%</span>
          </div>
          <div style={S.statCard}>
            <span style={S.statLabel}>Avg Satisfaction</span>
            <span style={S.statValue}>{summary.avgSatisfaction}</span>
          </div>
        </div>
      )}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{['Date','Total Calls','Avg Response Time','Under 8 min','Under 12 min','Utilization %','Satisfaction'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={S.empty}>No metrics found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} style={S.tr} onClick={() => setSelected(row)}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{...S.td, fontWeight: 600}}>{fmtDate(row.metric_date)}</td>
                  <td style={S.td}>{row.total_calls}</td>
                  <td style={S.td}>{fmtTime(row.avg_response_time_seconds)}</td>
                  <td style={S.td}>{row.calls_under_8_min}</td>
                  <td style={S.td}>{row.calls_under_12_min}</td>
                  <td style={S.td}>{row.unit_utilization_pct != null ? `${row.unit_utilization_pct}%` : '-'}</td>
                  <td style={S.td}>{row.patient_satisfaction_score || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Metrics - {fmtDate(selected.metric_date)}</h2>
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
          <div style={{...S.modal, maxWidth: 680}} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editId ? 'Edit Metrics' : 'Add Metrics'}</h2>
            <form onSubmit={handleSave} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}><label style={S.label}>Metric Date *</label><input style={S.input} type="date" required value={form.metric_date ? form.metric_date.substring(0,10) : ''} onChange={e => set('metric_date', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Total Calls</label><input style={S.input} type="number" min="0" value={form.total_calls} onChange={e => set('total_calls', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Avg Response Time (sec)</label><input style={S.input} type="number" min="0" value={form.avg_response_time_seconds} onChange={e => set('avg_response_time_seconds', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Calls Under 8 min</label><input style={S.input} type="number" min="0" value={form.calls_under_8_min} onChange={e => set('calls_under_8_min', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Calls Under 12 min</label><input style={S.input} type="number" min="0" value={form.calls_under_12_min} onChange={e => set('calls_under_12_min', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Total Transports</label><input style={S.input} type="number" min="0" value={form.total_transports} onChange={e => set('total_transports', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>ALS Calls</label><input style={S.input} type="number" min="0" value={form.als_calls} onChange={e => set('als_calls', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>BLS Calls</label><input style={S.input} type="number" min="0" value={form.bls_calls} onChange={e => set('bls_calls', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Cardiac Arrests</label><input style={S.input} type="number" min="0" value={form.cardiac_arrests} onChange={e => set('cardiac_arrests', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>ROSC Count</label><input style={S.input} type="number" min="0" value={form.rosc_count} onChange={e => set('rosc_count', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Unit Utilization %</label><input style={S.input} type="number" min="0" max="100" step="0.1" value={form.unit_utilization_pct} onChange={e => set('unit_utilization_pct', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Avg Turnaround (min)</label><input style={S.input} type="number" min="0" value={form.avg_turnaround_minutes} onChange={e => set('avg_turnaround_minutes', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>On-Time Response %</label><input style={S.input} type="number" min="0" max="100" step="0.1" value={form.on_time_response_pct} onChange={e => set('on_time_response_pct', e.target.value)} /></div>
                <div style={S.field}><label style={S.label}>Patient Satisfaction Score</label><input style={S.input} type="number" min="0" max="5" step="0.01" value={form.patient_satisfaction_score} onChange={e => set('patient_satisfaction_score', e.target.value)} /></div>
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#00d4ff' },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' },
  tr: { cursor: 'pointer', transition: 'background 0.15s' },
  td: { padding: '12px 16px', fontSize: 14, color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontSize: 14 },
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
