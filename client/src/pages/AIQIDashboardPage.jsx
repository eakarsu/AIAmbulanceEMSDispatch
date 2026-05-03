import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AIOutput from '../components/AIOutput';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIQIDashboardPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError(''); setResult(null); setLoading(true);
    try {
      const res = await fetch('/api/ai/qi-dashboard', { method: 'POST', headers: HEADERS() });
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
        <i className="fas fa-chart-line" style={{ color: '#00d4ff', marginRight: 8 }} />
        Quality Improvement Dashboard
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
        Historical QA scores + clinical outcomes; AI identifies training topics and protocols needing updates.
      </p>

      <button onClick={run} disabled={loading} style={btn}>
        {loading ? 'Analyzing...' : 'Generate QI Report'}
      </button>

      {error && <div style={errBox}>{error}</div>}
      <div style={{ marginTop: 24 }}>
        <AIOutput result={result} loading={loading} title="QI Insights" />
      </div>
    </div>
  );
}

const btn = { marginTop: 16, padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginTop: 16 };
