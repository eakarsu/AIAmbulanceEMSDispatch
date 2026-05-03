import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const PRIORITY_CONFIG = {
  1: { label: 'Critical', color: '#ff4757', bg: 'rgba(255,71,87,0.15)', border: 'rgba(255,71,87,0.4)' },
  2: { label: 'Emergent', color: '#ffa502', bg: 'rgba(255,165,2,0.15)', border: 'rgba(255,165,2,0.4)' },
  3: { label: 'Urgent', color: '#ffd43b', bg: 'rgba(255,212,59,0.15)', border: 'rgba(255,212,59,0.4)' },
  4: { label: 'Non-urgent', color: '#2ed573', bg: 'rgba(46,213,115,0.15)', border: 'rgba(46,213,115,0.4)' },
};

export default function AITriagePage() {
  const [form, setForm] = useState({
    callDescription: '',
    patientAge: '',
    patientGender: '',
    chiefComplaint: '',
    additionalSymptoms: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      // Map camelCase form fields to snake_case expected by backend
      const payload = {
        description: form.callDescription,
        chief_complaint: form.chiefComplaint,
        patient_age: form.patientAge,
        patient_gender: form.patientGender,
        additional_symptoms: form.additionalSymptoms,
      };
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Triage analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Backend returns priority_score (snake_case)
  const priority = result?.priority_score || result?.priority || result?.priorityScore || result?.score;
  const pConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];

  return (
    <div style={s.page}>
      <style>{animations}</style>

      <div style={s.header}>
        <Link to="/dashboard" style={s.backLink}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />
          Back to Dashboard
        </Link>
        <h1 style={s.title}>
          <i className="fas fa-brain" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI Triage Priority Scoring
        </h1>
        <p style={s.subtitle}>
          Leverage AI to analyze incoming call data and determine triage priority level with confidence scoring.
        </p>
      </div>

      <div style={s.grid}>
        {/* Input Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-clipboard-list" style={{ color: '#00d4ff', marginRight: 8 }} />
            Call Information
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Call Description</label>
              <textarea
                style={{ ...s.input, ...s.textarea, minHeight: 100 }}
                value={form.callDescription}
                onChange={set('callDescription')}
                placeholder="Describe the incoming call details..."
                required
              />
            </div>
            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Patient Age</label>
                <input
                  style={s.input}
                  type="number"
                  value={form.patientAge}
                  onChange={set('patientAge')}
                  placeholder="Age"
                  min="0"
                  max="120"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Patient Gender</label>
                <select style={s.input} value={form.patientGender} onChange={set('patientGender')}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Chief Complaint</label>
              <input
                style={s.input}
                type="text"
                value={form.chiefComplaint}
                onChange={set('chiefComplaint')}
                placeholder="e.g., Chest pain, difficulty breathing"
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Additional Symptoms</label>
              <textarea
                style={{ ...s.input, ...s.textarea }}
                value={form.additionalSymptoms}
                onChange={set('additionalSymptoms')}
                placeholder="Any additional symptoms, history, or relevant information..."
              />
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Analyzing...</span>
              ) : (
                <span><i className="fas fa-brain" style={{ marginRight: 8 }} />Analyze with AI</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-chart-bar" style={{ color: '#00d4ff', marginRight: 8 }} />
            AI Analysis Results
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is analyzing call data...</p>
              <p style={s.loadingSubtext}>Processing symptoms, patient data, and clinical indicators</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
              {error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-stethoscope" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Submit call information to receive AI-powered triage analysis
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Priority Badge */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: pConfig.bg,
                  border: `3px solid ${pConfig.border}`,
                  boxShadow: `0 0 30px ${pConfig.bg}`,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: pConfig.color }}>{priority}</span>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '6px 20px',
                  borderRadius: 20,
                  background: pConfig.bg,
                  border: `1px solid ${pConfig.border}`,
                  color: pConfig.color,
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>
                  {pConfig.label}
                </div>
              </div>

              {/* Confidence */}
              {(result.confidence || result.confidenceLevel) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Confidence Level</h3>
                  <div style={s.progressBar}>
                    <div style={{
                      ...s.progressFill,
                      width: `${result.confidence || result.confidenceLevel || 85}%`,
                      background: `linear-gradient(90deg, #00d4ff, ${pConfig.color})`,
                    }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    {result.confidence || result.confidenceLevel || 85}% confidence
                  </span>
                </div>
              )}

              {/* Reasoning */}
              {(result.reasoning || result.analysis || result.explanation) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-lightbulb" style={{ color: '#ffd43b', marginRight: 8 }} />
                    AI Reasoning
                  </h3>
                  <div style={s.textBlock}>
                    {String(result.reasoning || result.analysis || result.explanation)
                      .split('\n')
                      .filter(Boolean)
                      .map((p, i) => (
                        <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                      ))}
                  </div>
                </div>
              )}

              {/* Recommended Response */}
              {(result.recommendedResponse || result.responseType) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-ambulance" style={{ color: '#2ed573', marginRight: 8 }} />
                    Recommended Response
                  </h3>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(46,213,115,0.1)',
                    border: '1px solid rgba(46,213,115,0.3)',
                    color: '#2ed573',
                    fontWeight: 600,
                    fontSize: 15,
                  }}>
                    {result.recommendedResponse || result.responseType}
                  </div>
                </div>
              )}

              {/* Key Findings */}
              {(result.keyFindings || result.findings || result.factors) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-tags" style={{ color: '#a29bfe', marginRight: 8 }} />
                    Key Findings
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(Array.isArray(result.keyFindings || result.findings || result.factors)
                      ? (result.keyFindings || result.findings || result.factors)
                      : String(result.keyFindings || result.findings || result.factors).split(',')
                    ).map((f, i) => (
                      <span key={i} style={s.pill}>
                        {typeof f === 'string' ? f.trim() : f.name || f.factor || JSON.stringify(f)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: render any other string fields */}
              {Object.entries(result).map(([key, val]) => {
                if (['priority', 'priorityScore', 'score', 'confidence', 'confidenceLevel',
                  'reasoning', 'analysis', 'explanation', 'recommendedResponse', 'responseType',
                  'keyFindings', 'findings', 'factors', 'priorityLabel'].includes(key)) return null;
                if (typeof val !== 'string' && typeof val !== 'number') return null;
                return (
                  <div key={key} style={s.section}>
                    <h3 style={s.sectionTitle}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</h3>
                    <div style={s.textBlock}><p style={{ margin: 0, lineHeight: 1.7 }}>{String(val)}</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const animations = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseRing {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .ai-pulse-ring {
    width: 60px; height: 60px; border-radius: 50%;
    border: 3px solid #00d4ff;
    animation: pulseRing 1.5s ease-out infinite;
    margin: 0 auto 16px;
  }
  .ai-submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,212,255,0.4) !important;
  }
  .ai-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const s = {
  page: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#fff',
    minHeight: '100vh',
    padding: '24px 32px',
  },
  header: { marginBottom: 32 },
  backLink: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 16,
    transition: 'color 0.2s',
  },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  subtitle: { margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 28,
    backdropFilter: 'blur(12px)',
  },
  cardTitle: { margin: '0 0 24px', fontSize: 17, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center' },
  field: { marginBottom: 18 },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: { resize: 'vertical', minHeight: 72 },
  row: { display: 'flex', gap: 12, marginBottom: 18 },
  submitBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: 8,
  },
  loadingBox: { textAlign: 'center', padding: '48px 0' },
  loadingText: { color: '#00d4ff', fontSize: 16, fontWeight: 600, margin: '0 0 6px' },
  loadingSubtext: { color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 },
  errorBox: {
    background: 'rgba(255,71,87,0.12)',
    border: '1px solid rgba(255,71,87,0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#ff6b6b',
    fontSize: 14,
  },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  section: { marginBottom: 20 },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    display: 'flex',
    alignItems: 'center',
  },
  textBlock: {
    padding: '14px 16px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  pill: {
    display: 'inline-block',
    padding: '5px 14px',
    borderRadius: 20,
    background: 'rgba(162,155,254,0.12)',
    border: '1px solid rgba(162,155,254,0.3)',
    color: '#a29bfe',
    fontSize: 13,
    fontWeight: 500,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 1s ease',
  },
};
