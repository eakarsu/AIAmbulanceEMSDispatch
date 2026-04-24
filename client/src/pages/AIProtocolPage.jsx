import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIProtocolPage() {
  const [form, setForm] = useState({
    chiefComplaint: '',
    patientAge: '',
    bp: '',
    hr: '',
    rr: '',
    spo2: '',
    allergies: '',
    currentMedications: '',
    symptomsDescription: '',
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
      const res = await fetch('/api/ai/protocol', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Protocol recommendation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSteps = (steps) => {
    if (!steps) return null;
    const list = Array.isArray(steps) ? steps : String(steps).split('\n').filter(Boolean);
    return (
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 10, top: 8, bottom: 8,
          width: 2, background: 'rgba(0,212,255,0.2)', borderRadius: 1,
        }} />
        {list.map((step, i) => {
          const text = typeof step === 'string' ? step : (step.description || step.text || step.step || JSON.stringify(step));
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: -28,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(0,212,255,0.15)',
                border: '2px solid rgba(0,212,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#00d4ff',
                flexShrink: 0, zIndex: 1,
              }}>
                {i + 1}
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                flex: 1, color: 'rgba(255,255,255,0.8)',
                fontSize: 14, lineHeight: 1.6,
              }}>
                {text}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMedications = (meds) => {
    if (!meds) return null;
    const list = Array.isArray(meds) ? meds : String(meds).split('\n').filter(Boolean);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {list.map((med, i) => {
          const isObj = typeof med === 'object' && med !== null;
          const name = isObj ? (med.name || med.medication || '') : med;
          const dosage = isObj ? (med.dosage || med.dose || '') : '';
          const route = isObj ? (med.route || '') : '';
          const notes = isObj ? (med.notes || med.indication || '') : '';
          return (
            <div key={i} style={{
              padding: 14, borderRadius: 12,
              background: 'rgba(46,213,115,0.06)',
              border: '1px solid rgba(46,213,115,0.2)',
            }}>
              <div style={{ fontWeight: 700, color: '#2ed573', fontSize: 14, marginBottom: 4 }}>
                <i className="fas fa-pills" style={{ marginRight: 6 }} />
                {typeof name === 'string' ? name : JSON.stringify(name)}
              </div>
              {dosage && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Dose: {dosage}</div>}
              {route && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Route: {route}</div>}
              {notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontStyle: 'italic' }}>{notes}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderContraindications = (items) => {
    if (!items) return null;
    const list = Array.isArray(items) ? items : String(items).split('\n').filter(Boolean);
    return (
      <div>
        {list.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,71,87,0.08)',
            border: '1px solid rgba(255,71,87,0.2)',
            marginBottom: 8, color: '#ff6b6b', fontSize: 14,
          }}>
            <i className="fas fa-exclamation-circle" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.6 }}>{typeof item === 'string' ? item : (item.description || item.text || JSON.stringify(item))}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={s.page}>
      <style>{animations}</style>

      <div style={s.header}>
        <Link to="/dashboard" style={s.backLink}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />Back to Dashboard
        </Link>
        <h1 style={s.title}>
          <i className="fas fa-book-medical" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI Protocol Recommendation
        </h1>
        <p style={s.subtitle}>
          AI-powered clinical protocol guidance with step-by-step instructions, medication recommendations, and safety considerations.
        </p>
      </div>

      <div style={s.grid}>
        {/* Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-user-md" style={{ color: '#00d4ff', marginRight: 8 }} />
            Clinical Parameters
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Chief Complaint</label>
              <input style={s.input} value={form.chiefComplaint} onChange={set('chiefComplaint')} placeholder="e.g., Chest pain, shortness of breath" required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Patient Age</label>
              <input style={s.input} type="number" value={form.patientAge} onChange={set('patientAge')} placeholder="Age in years" />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ ...s.label, marginBottom: 10 }}>
                <i className="fas fa-heartbeat" style={{ color: '#ff6b6b', marginRight: 6 }} />Vitals
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={s.miniLabel}>BP</span>
                  <input style={{ ...s.input, padding: '8px 10px', fontSize: 13 }} value={form.bp} onChange={set('bp')} placeholder="120/80" />
                </div>
                <div>
                  <span style={s.miniLabel}>HR</span>
                  <input style={{ ...s.input, padding: '8px 10px', fontSize: 13 }} value={form.hr} onChange={set('hr')} placeholder="80" />
                </div>
                <div>
                  <span style={s.miniLabel}>RR</span>
                  <input style={{ ...s.input, padding: '8px 10px', fontSize: 13 }} value={form.rr} onChange={set('rr')} placeholder="16" />
                </div>
                <div>
                  <span style={s.miniLabel}>SpO2</span>
                  <input style={{ ...s.input, padding: '8px 10px', fontSize: 13 }} value={form.spo2} onChange={set('spo2')} placeholder="98%" />
                </div>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Allergies</label>
              <input style={s.input} value={form.allergies} onChange={set('allergies')} placeholder="NKDA or list known allergies" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Current Medications</label>
              <input style={s.input} value={form.currentMedications} onChange={set('currentMedications')} placeholder="List current medications" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Symptoms Description</label>
              <textarea style={{ ...s.input, ...s.textarea, minHeight: 80 }} value={form.symptomsDescription} onChange={set('symptomsDescription')} placeholder="Detailed symptoms description..." required />
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Analyzing protocols...</span>
              ) : (
                <span><i className="fas fa-book-medical" style={{ marginRight: 8 }} />Get Protocol Recommendation</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-sitemap" style={{ color: '#00d4ff', marginRight: 8 }} />
            Protocol Guidance
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is analyzing clinical protocols...</p>
              <p style={s.loadingSubtext}>Matching symptoms to evidence-based guidelines</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-book-open" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Enter clinical parameters to receive AI protocol recommendations
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Protocol header */}
              {(result.protocolName || result.protocol || result.name) && (
                <div style={{
                  padding: '20px 24px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,144,255,0.06))',
                  border: '1px solid rgba(0,212,255,0.25)',
                  marginBottom: 20, textAlign: 'center',
                }}>
                  {(result.protocolNumber || result.number) && (
                    <div style={{
                      display: 'inline-block', padding: '4px 16px', borderRadius: 20,
                      background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)',
                      color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: 1,
                      marginBottom: 10, textTransform: 'uppercase',
                    }}>
                      Protocol {result.protocolNumber || result.number}
                    </div>
                  )}
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    {result.protocolName || result.protocol || result.name}
                  </h2>
                </div>
              )}

              {/* Steps */}
              {(result.steps || result.procedure || result.guidelines) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-list-ol" style={{ color: '#00d4ff', marginRight: 8 }} />
                    Step-by-Step Protocol Guide
                  </h3>
                  {renderSteps(result.steps || result.procedure || result.guidelines)}
                </div>
              )}

              {/* Medications */}
              {(result.medications || result.drugs || result.pharmacology) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-pills" style={{ color: '#2ed573', marginRight: 8 }} />
                    Medications to Consider
                  </h3>
                  {renderMedications(result.medications || result.drugs || result.pharmacology)}
                </div>
              )}

              {/* Contraindications */}
              {(result.contraindications || result.warnings || result.cautions) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-shield-alt" style={{ color: '#ff6b6b', marginRight: 8 }} />
                    Contraindications & Warnings
                  </h3>
                  {renderContraindications(result.contraindications || result.warnings || result.cautions)}
                </div>
              )}

              {/* Special considerations */}
              {(result.specialConsiderations || result.considerations || result.notes) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-info-circle" style={{ color: '#ffa502', marginRight: 8 }} />
                    Special Considerations
                  </h3>
                  <div style={s.textBlock}>
                    {String(result.specialConsiderations || result.considerations || result.notes)
                      .split('\n').filter(Boolean).map((p, i) => (
                        <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                      ))}
                  </div>
                </div>
              )}

              {/* Decision pathway */}
              {(result.decisionTree || result.pathway || result.algorithm) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-project-diagram" style={{ color: '#a29bfe', marginRight: 8 }} />
                    Decision Pathway
                  </h3>
                  {renderSteps(result.decisionTree || result.pathway || result.algorithm)}
                </div>
              )}

              {/* Fallback for other string fields */}
              {Object.entries(result).map(([key, val]) => {
                const skip = ['protocolName', 'protocol', 'name', 'protocolNumber', 'number',
                  'steps', 'procedure', 'guidelines', 'medications', 'drugs', 'pharmacology',
                  'contraindications', 'warnings', 'cautions', 'specialConsiderations',
                  'considerations', 'notes', 'decisionTree', 'pathway', 'algorithm'];
                if (skip.includes(key)) return null;
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
  page: { fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff', minHeight: '100vh', padding: '24px 32px' },
  header: { marginBottom: 32 },
  backLink: { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  subtitle: { margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, backdropFilter: 'blur(12px)' },
  cardTitle: { margin: '0 0 24px', fontSize: 17, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center' },
  field: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  miniLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 0.5 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: 72 },
  submitBtn: { width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', marginTop: 8 },
  loadingBox: { textAlign: 'center', padding: '48px 0' },
  loadingText: { color: '#00d4ff', fontSize: 16, fontWeight: 600, margin: '0 0 6px' },
  loadingSubtext: { color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 },
  errorBox: { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ff6b6b', fontSize: 14 },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  section: { marginBottom: 24 },
  sectionTitle: { margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center' },
  textBlock: { padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
};
