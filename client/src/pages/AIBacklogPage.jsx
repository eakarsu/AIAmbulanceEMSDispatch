import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Apply pass 5 — UI for AI backlog endpoints in routes/aiBacklog.js.
// All endpoints attach a Bearer token from localStorage.
// Endpoints integrating with external systems (CAD, EHR) gracefully surface
// 503 + missing payloads when their env vars are unset.

const TOOLS = [
  { key: 'patient-outcome-prediction', label: 'Patient Outcome',
    payload: () => ({ chief_complaint: '', age: '', vitals: '', interventions: '' }),
    fields: ['chief_complaint', 'age', 'vitals', 'interventions'] },
  { key: 'cardiac-outcome-prediction', label: 'Cardiac Outcome',
    payload: () => ({ age: '', witnessed: '', bystander_cpr: '', initial_rhythm: '', time_to_cpr_min: '', time_to_defib_min: '' }),
    fields: ['age', 'witnessed', 'bystander_cpr', 'initial_rhythm', 'time_to_cpr_min', 'time_to_defib_min'] },
  { key: 'staffing-optimization', label: 'Staffing Optimization',
    payload: () => ({ lookback_days: 30, horizon_days: 7 }),
    fields: ['lookback_days', 'horizon_days'] },
  { key: 'community-paramedicine-pathway', label: 'Community Paramedicine',
    payload: () => ({ patient_id: '', demographics: '', social_determinants: '' }),
    fields: ['patient_id', 'demographics', 'social_determinants'] },
  { key: 'training-simulator/scenario', label: 'Training Simulator',
    payload: () => ({ category: 'cardiac', difficulty: 'intermediate', title: '' }),
    fields: ['category', 'difficulty', 'title'] },
];

const INTEGRATIONS = [
  { key: 'cad-integration/sync', label: 'CAD Sync (NEEDS-CREDS)', method: 'POST' },
  { key: 'ehr-integration/bed-status', label: 'EHR Bed Status (NEEDS-CREDS)', method: 'GET' },
];

async function callEndpoint(path, method, body) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
  const opts = { method, headers };
  if (method !== 'GET' && body) opts.body = JSON.stringify(body);
  const res = await fetch(`/api/ai/${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AIBacklogPage() {
  const [tool, setTool] = useState(TOOLS[0]);
  const [form, setForm] = useState(TOOLS[0].payload());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchTool = (t) => {
    setTool(t); setForm(t.payload ? t.payload() : {}); setResult(null); setError('');
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await callEndpoint(tool.key, 'POST', form);
      if (!r.ok) throw new Error(r.data?.error || `Request failed (${r.status})`);
      setResult(r.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const runIntegration = async (i) => {
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await callEndpoint(i.key, i.method, null);
      if (!r.ok) {
        const missing = r.data?.missing ? ` (missing: ${r.data.missing})` : '';
        throw new Error((r.data?.error || `Request failed (${r.status})`) + missing);
      }
      setResult(r.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <Link to="/dashboard" style={s.back}>← Back to Dashboard</Link>
      <h1 style={s.title}>AI Backlog Tools</h1>
      <p style={s.subtitle}>Apply pass 5 — Patient outcome, cardiac outcome, staffing, community paramedicine, training simulator, and external integrations (CAD/EHR).</p>

      <div style={s.tabs}>
        {TOOLS.map((t) => (
          <button key={t.key} style={{ ...s.tab, ...(tool.key === t.key ? s.tabActive : {}) }} onClick={() => switchTool(t)}>{t.label}</button>
        ))}
      </div>

      <div style={s.grid}>
        <form onSubmit={submit} style={s.card}>
          <h3 style={s.h3}>{tool.label}</h3>
          {tool.fields.map((f) => (
            <div key={f} style={s.field}>
              <label style={s.label}>{f.replace(/_/g, ' ')}</label>
              <input style={s.input} value={form[f] ?? ''} onChange={set(f)} />
            </div>
          ))}
          <button type="submit" style={s.submit} disabled={loading}>{loading ? 'Running…' : 'Run AI'}</button>
        </form>

        <div style={s.card}>
          <h3 style={s.h3}>Result</h3>
          {error && <div style={s.error}>{error}</div>}
          {!error && !result && <p style={s.empty}>Submit form to view AI output.</p>}
          {result && <pre style={s.pre}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.h3}>External Integrations</h3>
        <p style={s.muted}>These return 503 + <code>missing</code> when env vars are not configured.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {INTEGRATIONS.map((i) => (
            <button key={i.key} style={s.intBtn} onClick={() => runIntegration(i)} disabled={loading}>{i.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff', minHeight: '100vh', padding: '24px 32px' },
  back: { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 16 },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: '6px 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  tabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: { padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: 13 },
  tabActive: { background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)', borderColor: 'transparent' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 },
  h3: { margin: '0 0 12px', fontSize: 15, fontWeight: 600 },
  field: { marginBottom: 12 },
  label: { display: 'block', marginBottom: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' },
  input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, boxSizing: 'border-box' },
  submit: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  empty: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  error: { background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 6, padding: 10, color: '#ff6b6b', fontSize: 13 },
  pre: { color: 'rgba(255,255,255,0.85)', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 480, overflow: 'auto' },
  muted: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  intBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,165,2,0.3)', background: 'rgba(255,165,2,0.08)', color: '#ffa502', cursor: 'pointer', fontSize: 13 },
};
