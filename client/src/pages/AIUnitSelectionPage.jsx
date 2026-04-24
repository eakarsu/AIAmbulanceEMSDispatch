import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const CALL_TYPES = ['Cardiac', 'Trauma', 'Medical', 'Pediatric', 'OB', 'Behavioral'];
const PRIORITIES = [
  { value: '1', label: 'Priority 1 - Critical' },
  { value: '2', label: 'Priority 2 - Emergent' },
  { value: '3', label: 'Priority 3 - Urgent' },
  { value: '4', label: 'Priority 4 - Non-urgent' },
];

export default function AIUnitSelectionPage() {
  const [form, setForm] = useState({
    callType: '',
    priority: '',
    locationAddress: '',
    specialRequirements: '',
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
      const res = await fetch('/api/ai/unit-selection', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unit selection failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderUnit = (unit, idx, isPrimary) => {
    if (!unit) return null;
    const name = typeof unit === 'string' ? unit : (unit.name || unit.unitId || unit.unit || `Unit ${idx + 1}`);
    const eta = unit.eta || unit.ETA || unit.estimatedTime;
    const distance = unit.distance;
    const capabilities = unit.capabilities || unit.features || [];
    const reason = unit.reason || unit.reasoning || unit.matchExplanation;

    return (
      <div key={idx} style={{
        padding: 18,
        borderRadius: 14,
        background: isPrimary ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isPrimary ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
        marginBottom: 12,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isPrimary && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            padding: '4px 14px', borderRadius: '0 12px 0 10px',
            background: 'linear-gradient(135deg, #00d4ff, #0090ff)',
            fontSize: 11, fontWeight: 700, color: '#fff',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Recommended
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: isPrimary ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fas fa-ambulance" style={{ color: isPrimary ? '#00d4ff' : 'rgba(255,255,255,0.4)', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{name}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
              {eta && (
                <span style={{ fontSize: 13, color: '#2ed573', fontWeight: 600 }}>
                  <i className="fas fa-clock" style={{ marginRight: 4 }} />ETA: {eta}
                </span>
              )}
              {distance && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  <i className="fas fa-route" style={{ marginRight: 4 }} />{distance}
                </span>
              )}
            </div>
          </div>
        </div>
        {Array.isArray(capabilities) && capabilities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {capabilities.map((c, ci) => (
              <span key={ci} style={{
                padding: '3px 10px', borderRadius: 12,
                background: 'rgba(46,213,115,0.1)',
                border: '1px solid rgba(46,213,115,0.25)',
                color: '#2ed573', fontSize: 11, fontWeight: 500,
              }}>
                {typeof c === 'string' ? c : c.name || JSON.stringify(c)}
              </span>
            ))}
          </div>
        )}
        {reason && (
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{reason}</p>
        )}
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
          <i className="fas fa-crosshairs" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI Optimal Unit Selection
        </h1>
        <p style={s.subtitle}>
          AI-driven analysis to recommend the best available unit based on call type, location, capabilities, and availability.
        </p>
      </div>

      <div style={s.grid}>
        {/* Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-search-location" style={{ color: '#00d4ff', marginRight: 8 }} />
            Call Parameters
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Call Type</label>
              <select style={s.input} value={form.callType} onChange={set('callType')} required>
                <option value="">Select call type...</option>
                {CALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Priority Level</label>
              <select style={s.input} value={form.priority} onChange={set('priority')} required>
                <option value="">Select priority...</option>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Location Address</label>
              <input
                style={s.input}
                type="text"
                value={form.locationAddress}
                onChange={set('locationAddress')}
                placeholder="e.g., 1234 Main St, Springfield"
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Special Requirements</label>
              <textarea
                style={{ ...s.input, ...s.textarea }}
                value={form.specialRequirements}
                onChange={set('specialRequirements')}
                placeholder="e.g., Bariatric equipment, pediatric supplies, ALS required..."
              />
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Finding optimal unit...</span>
              ) : (
                <span><i className="fas fa-crosshairs" style={{ marginRight: 8 }} />Find Best Unit</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-bullseye" style={{ color: '#00d4ff', marginRight: 8 }} />
            Selection Results
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is evaluating available units...</p>
              <p style={s.loadingSubtext}>Analyzing proximity, capabilities, and workload</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-map-marked-alt" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Enter call parameters to find the optimal response unit
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Primary recommendation */}
              {(result.recommendedUnit || result.primary || result.bestUnit) &&
                renderUnit(result.recommendedUnit || result.primary || result.bestUnit, 0, true)}

              {/* Reasoning */}
              {(result.reasoning || result.explanation) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-lightbulb" style={{ color: '#ffd43b', marginRight: 8 }} />
                    Selection Reasoning
                  </h3>
                  <div style={s.textBlock}>
                    {String(result.reasoning || result.explanation).split('\n').filter(Boolean).map((p, i) => (
                      <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {(result.alternatives || result.alternativeUnits || result.otherUnits) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-list-ol" style={{ color: '#a29bfe', marginRight: 8 }} />
                    Alternative Units
                  </h3>
                  {(result.alternatives || result.alternativeUnits || result.otherUnits).map((u, i) =>
                    renderUnit(u, i, false)
                  )}
                </div>
              )}

              {/* Capability match */}
              {(result.capabilityMatch || result.matchScore) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Capability Match</h3>
                  <div style={s.textBlock}>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>
                      {result.capabilityMatch || `${result.matchScore}% match`}
                    </p>
                  </div>
                </div>
              )}

              {/* Fallback fields */}
              {Object.entries(result).map(([key, val]) => {
                if (['recommendedUnit', 'primary', 'bestUnit', 'reasoning', 'explanation',
                  'alternatives', 'alternativeUnits', 'otherUnits', 'capabilityMatch', 'matchScore'].includes(key)) return null;
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
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, backdropFilter: 'blur(12px)' },
  cardTitle: { margin: '0 0 24px', fontSize: 17, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center' },
  field: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: 72 },
  submitBtn: { width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', marginTop: 8 },
  loadingBox: { textAlign: 'center', padding: '48px 0' },
  loadingText: { color: '#00d4ff', fontSize: 16, fontWeight: 600, margin: '0 0 6px' },
  loadingSubtext: { color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 },
  errorBox: { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ff6b6b', fontSize: 14 },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  section: { marginBottom: 20 },
  sectionTitle: { margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center' },
  textBlock: { padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
};
