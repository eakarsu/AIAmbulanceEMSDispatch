import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AIOutput from '../components/AIOutput';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIDrugInteractionPage() {
  const [medsText, setMedsText] = useState('');
  const [allergies, setAllergies] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [conditions, setConditions] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const meds = medsText.split(',').map((m) => m.trim()).filter(Boolean);
      if (meds.length === 0) throw new Error('Enter at least one medication');
      const res = await fetch('/api/ai/drug-interaction', {
        method: 'POST', headers: HEADERS(),
        body: JSON.stringify({
          medications: meds, allergies, patient_age: age, weight_kg: weight, conditions,
        }),
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
        <i className="fas fa-pills" style={{ color: '#00d4ff', marginRight: 8 }} />
        Drug Interaction Checker
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
        AI flags drug-drug, drug-allergy, and dosage issues before PCR submission.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 700, margin: '24px 0' }}>
        <input placeholder="Medications (comma separated, e.g. aspirin, nitroglycerin) *" value={medsText} onChange={(e) => setMedsText(e.target.value)} required style={inp} />
        <input placeholder="Allergies (e.g. PCN, sulfa)" value={allergies} onChange={(e) => setAllergies(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: 12 }}>
          <input placeholder="Patient Age" value={age} onChange={(e) => setAge(e.target.value)} style={{ ...inp, flex: 1 }} />
          <input placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ ...inp, flex: 1 }} />
        </div>
        <input placeholder="Active Conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} style={inp} />
        <button type="submit" disabled={loading} style={btn}>{loading ? 'Checking...' : 'Check Interactions'}</button>
      </form>

      {error && <div style={errBox}>{error}</div>}
      <AIOutput result={result} loading={loading} title="Interaction Analysis" />
    </div>
  );
}

const inp = { padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' };
const btn = { padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginBottom: 16 };
