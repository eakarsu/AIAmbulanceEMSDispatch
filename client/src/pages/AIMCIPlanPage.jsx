import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AIOutput from '../components/AIOutput';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIMCIPlanPage() {
  const [form, setForm] = useState({ incident_type: '', estimated_casualties: '', location: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const res = await fetch('/api/ai/mci-plan', {
        method: 'POST', headers: HEADERS(),
        body: JSON.stringify({ ...form, estimated_casualties: Number(form.estimated_casualties) }),
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
        <i className="fas fa-exclamation-triangle" style={{ color: '#00d4ff', marginRight: 8 }} />
        MCI Plan Generator
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
        AI generates an ICS-structured Mass Casualty Incident response plan.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 600, margin: '24px 0' }}>
        <input placeholder="Incident Type *" value={form.incident_type} onChange={set('incident_type')} required style={inp} />
        <input type="number" min={1} placeholder="Estimated Casualties *" value={form.estimated_casualties} onChange={set('estimated_casualties')} required style={inp} />
        <input placeholder="Location *" value={form.location} onChange={set('location')} required style={inp} />
        <button type="submit" disabled={loading} style={btn}>{loading ? 'Generating...' : 'Generate MCI Plan'}</button>
      </form>

      {error && <div style={errBox}>{error}</div>}
      <AIOutput result={result} loading={loading} title="MCI Response Plan" />
    </div>
  );
}

const inp = { padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' };
const btn = { padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginBottom: 16 };
