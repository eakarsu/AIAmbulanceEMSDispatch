import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AIOutput from '../components/AIOutput';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIPostCallDebriefPage() {
  const [form, setForm] = useState({
    call_id: '', call_type: '', chief_complaint: '', outcome: '', interventions: '', crew_feedback: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const res = await fetch('/api/ai/post-call-debrief', {
        method: 'POST', headers: HEADERS(), body: JSON.stringify(form),
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
        <i className="fas fa-comments" style={{ color: '#00d4ff', marginRight: 8 }} />
        Post-Call Debrief Generator
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
        AI drafts crew debriefs for critical calls (trauma, pediatric, cardiac).
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 700, margin: '24px 0' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input placeholder="Call ID" value={form.call_id} onChange={set('call_id')} style={{ ...inp, flex: 1 }} />
          <input placeholder="Call Type *" value={form.call_type} onChange={set('call_type')} required style={{ ...inp, flex: 1 }} />
        </div>
        <input placeholder="Chief Complaint *" value={form.chief_complaint} onChange={set('chief_complaint')} required style={inp} />
        <input placeholder="Outcome (transported, ROSC, refusal, etc.)" value={form.outcome} onChange={set('outcome')} style={inp} />
        <textarea placeholder="Interventions" value={form.interventions} onChange={set('interventions')} style={{ ...inp, minHeight: 70, resize: 'vertical' }} />
        <textarea placeholder="Crew feedback (optional)" value={form.crew_feedback} onChange={set('crew_feedback')} style={{ ...inp, minHeight: 70, resize: 'vertical' }} />
        <button type="submit" disabled={loading} style={btn}>{loading ? 'Generating...' : 'Generate Debrief'}</button>
      </form>

      {error && <div style={errBox}>{error}</div>}
      <AIOutput result={result} loading={loading} title="Crew Debrief" />
    </div>
  );
}

const inp = { padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' };
const btn = { padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginBottom: 16 };
