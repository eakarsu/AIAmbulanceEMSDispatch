import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AIOutput from '../components/AIOutput';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AICallerScriptPage() {
  const [form, setForm] = useState({ chief_complaint: '', patient_age: '', vitals: '', time_to_arrival_minutes: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const body = { ...form };
      // Try to JSON-parse vitals if it looks like JSON
      if (form.vitals && form.vitals.trim().startsWith('{')) {
        try { body.vitals = JSON.parse(form.vitals); } catch {}
      }
      const res = await fetch('/api/ai/caller-script', {
        method: 'POST', headers: HEADERS(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 32, color: '#fff' }}>
      <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>&larr; Back</Link>
      <h1 style={{ fontSize: 26, margin: '12px 0 4px' }}>
        <i className="fas fa-headset" style={{ color: '#00d4ff', marginRight: 8 }} />
        Caller Reassurance Script
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
        AI generates pre-arrival caller instructions (CPR, bleeding control, etc.) while unit is en route.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 700, margin: '24px 0' }}>
        <input placeholder="Chief Complaint *" value={form.chief_complaint} onChange={set('chief_complaint')} required style={inp} />
        <div style={{ display: 'flex', gap: 12 }}>
          <input placeholder="Patient Age" value={form.patient_age} onChange={set('patient_age')} style={{ ...inp, flex: 1 }} />
          <input placeholder="ETA (minutes)" value={form.time_to_arrival_minutes} onChange={set('time_to_arrival_minutes')} style={{ ...inp, flex: 1 }} />
        </div>
        <textarea placeholder='Vitals (free text or JSON like {"hr":120,"bp":"90/60"})' value={form.vitals} onChange={set('vitals')} style={{ ...inp, minHeight: 70, resize: 'vertical' }} />
        <button type="submit" disabled={loading} style={btn}>{loading ? 'Generating...' : 'Generate Script'}</button>
      </form>

      {error && <div style={errBox}>{error}</div>}
      <AIOutput result={result} loading={loading} title="Caller Pre-Arrival Script" />
    </div>
  );
}

const inp = { padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' };
const btn = { padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginBottom: 16 };
