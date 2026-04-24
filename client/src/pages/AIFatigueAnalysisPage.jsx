import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const RISK_CONFIG = {
  low: { color: '#2ed573', bg: 'rgba(46,213,115,0.12)', border: 'rgba(46,213,115,0.35)', label: 'Low Risk' },
  moderate: { color: '#ffa502', bg: 'rgba(255,165,2,0.12)', border: 'rgba(255,165,2,0.35)', label: 'Moderate Risk' },
  high: { color: '#ff6348', bg: 'rgba(255,99,72,0.12)', border: 'rgba(255,99,72,0.35)', label: 'High Risk' },
  critical: { color: '#ff4757', bg: 'rgba(255,71,87,0.15)', border: 'rgba(255,71,87,0.4)', label: 'Critical Risk' },
};

function getRiskLevel(score) {
  if (score === undefined || score === null) return 'moderate';
  const n = Number(score);
  if (n <= 25) return 'low';
  if (n <= 50) return 'moderate';
  if (n <= 75) return 'high';
  return 'critical';
}

function CircularProgress({ score, color }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 36, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

export default function AIFatigueAnalysisPage() {
  const [form, setForm] = useState({
    crewMember: '',
    analyzeAll: false,
    shiftDuration: '',
    consecutiveHoursWorked: '',
    numberOfCalls: '',
    timeSinceLastRest: '',
  });
  const [crewList, setCrewList] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const res = await fetch('/api/crew', { headers: API_HEADERS() });
        if (res.ok) {
          const data = await res.json();
          setCrewList(Array.isArray(data) ? data : (data.crew || data.data || []));
        }
      } catch {
        // silently fail - user can still type
      }
    };
    fetchCrew();
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setCheck = (field) => (e) => setForm({ ...form, [field]: e.target.checked });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/fatigue-analysis', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fatigue analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskScore = result?.riskScore ?? result?.score ?? result?.fatigueScore;
  const riskLevelKey = result?.riskLevel
    ? String(result.riskLevel).toLowerCase()
    : getRiskLevel(riskScore);
  const riskConf = RISK_CONFIG[riskLevelKey] || RISK_CONFIG.moderate;

  const renderFactors = (factors) => {
    if (!factors) return null;
    const list = Array.isArray(factors) ? factors : String(factors).split('\n').filter(Boolean);
    return (
      <div>
        {list.map((f, i) => {
          const isObj = typeof f === 'object' && f !== null;
          const text = isObj ? (f.factor || f.name || f.description || JSON.stringify(f)) : f;
          const severity = isObj ? (f.severity || f.level || '') : '';
          const sevLower = String(severity).toLowerCase();
          const icon = sevLower.includes('high') || sevLower.includes('critical')
            ? 'fa-exclamation-circle' : sevLower.includes('mod') ? 'fa-exclamation-triangle' : 'fa-info-circle';
          const iconColor = sevLower.includes('high') || sevLower.includes('critical')
            ? '#ff4757' : sevLower.includes('mod') ? '#ffa502' : '#00d4ff';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 8,
            }}>
              <i className={`fas ${icon}`} style={{ color: iconColor, marginTop: 2, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{text}</span>
              {severity && (
                <span style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: `${iconColor}15`, border: `1px solid ${iconColor}40`,
                  color: iconColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {severity}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRecommendations = (recs) => {
    if (!recs) return null;
    const list = Array.isArray(recs) ? recs : String(recs).split('\n').filter(Boolean);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {list.map((r, i) => {
          const isObj = typeof r === 'object' && r !== null;
          const text = isObj ? (r.recommendation || r.action || r.text || r.description || JSON.stringify(r)) : r;
          const priority = isObj ? (r.priority || r.urgency || '') : '';
          return (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.15)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(0,212,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <i className="fas fa-check" style={{ color: '#00d4ff', fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>{text}</div>
                {priority && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(162,155,254,0.1)', border: '1px solid rgba(162,155,254,0.25)',
                    color: '#a29bfe', fontSize: 11, fontWeight: 600,
                  }}>
                    {priority}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
          <i className="fas fa-bed" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI Crew Fatigue Risk Analysis
        </h1>
        <p style={s.subtitle}>
          Assess crew fatigue levels and safety risks using AI analysis of shift data, workload, and rest patterns.
        </p>
      </div>

      <div style={s.grid}>
        {/* Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-user-clock" style={{ color: '#00d4ff', marginRight: 8 }} />
            Crew & Shift Data
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Crew Member</label>
              <select
                style={s.input}
                value={form.crewMember}
                onChange={set('crewMember')}
                disabled={form.analyzeAll}
              >
                <option value="">Select crew member...</option>
                {crewList.map((c, i) => (
                  <option key={c._id || c.id || i} value={c._id || c.id || c.name}>
                    {c.name || c.firstName
                      ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name
                      : `Crew #${i + 1}`}
                    {c.role ? ` - ${c.role}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...s.field, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="analyzeAll"
                checked={form.analyzeAll}
                onChange={setCheck('analyzeAll')}
                style={{ width: 18, height: 18, accentColor: '#00d4ff' }}
              />
              <label htmlFor="analyzeAll" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', margin: 0 }}>
                Analyze all crew members
              </label>
            </div>

            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Shift Duration (hrs)</label>
                <input style={s.input} type="number" value={form.shiftDuration} onChange={set('shiftDuration')} placeholder="e.g., 12" min="0" max="48" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Consecutive Hours</label>
                <input style={s.input} type="number" value={form.consecutiveHoursWorked} onChange={set('consecutiveHoursWorked')} placeholder="e.g., 16" min="0" max="72" />
              </div>
            </div>

            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Calls This Shift</label>
                <input style={s.input} type="number" value={form.numberOfCalls} onChange={set('numberOfCalls')} placeholder="e.g., 8" min="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Hours Since Rest</label>
                <input style={s.input} type="number" value={form.timeSinceLastRest} onChange={set('timeSinceLastRest')} placeholder="e.g., 6" min="0" />
              </div>
            </div>

            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Analyzing fatigue risk...</span>
              ) : (
                <span><i className="fas fa-shield-alt" style={{ marginRight: 8 }} />Analyze Fatigue Risk</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-heartbeat" style={{ color: '#00d4ff', marginRight: 8 }} />
            Fatigue Analysis Results
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is assessing fatigue risk factors...</p>
              <p style={s.loadingSubtext}>Evaluating workload, rest cycles, and safety thresholds</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-user-shield" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Enter crew and shift data to assess fatigue risk levels
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Risk gauge + score */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 32, marginBottom: 24, flexWrap: 'wrap',
              }}>
                {/* Circular score */}
                {riskScore !== undefined && (
                  <CircularProgress score={Number(riskScore)} color={riskConf.color} />
                )}

                {/* Risk level badge */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    padding: '10px 28px', borderRadius: 14,
                    background: riskConf.bg,
                    border: `2px solid ${riskConf.border}`,
                    marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 20, fontWeight: 800, color: riskConf.color,
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {riskConf.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                    Overall Fatigue Risk Level
                  </p>
                </div>
              </div>

              {/* Contributing factors */}
              {(result.contributingFactors || result.factors || result.riskFactors) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-list-ul" style={{ color: '#ffa502', marginRight: 8 }} />
                    Contributing Factors
                  </h3>
                  {renderFactors(result.contributingFactors || result.factors || result.riskFactors)}
                </div>
              )}

              {/* Recommendations */}
              {(result.recommendations || result.actions || result.mitigations) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-tasks" style={{ color: '#00d4ff', marginRight: 8 }} />
                    Recommendations
                  </h3>
                  {renderRecommendations(result.recommendations || result.actions || result.mitigations)}
                </div>
              )}

              {/* Safety recommendations */}
              {(result.safetyRecommendations || result.safetyNotes) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-hard-hat" style={{ color: '#2ed573', marginRight: 8 }} />
                    Safety Recommendations
                  </h3>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(46,213,115,0.06)',
                    border: '1px solid rgba(46,213,115,0.2)',
                    color: 'rgba(255,255,255,0.8)', fontSize: 14,
                  }}>
                    {String(result.safetyRecommendations || result.safetyNotes)
                      .split('\n').filter(Boolean).map((p, i) => (
                        <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                      ))}
                  </div>
                </div>
              )}

              {/* NFPA compliance */}
              {(result.nfpaCompliance || result.nfpa1500 || result.complianceNotes) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-gavel" style={{ color: '#a29bfe', marginRight: 8 }} />
                    NFPA 1500 Compliance
                  </h3>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(162,155,254,0.06)',
                    border: '1px solid rgba(162,155,254,0.2)',
                    color: 'rgba(255,255,255,0.8)', fontSize: 14,
                  }}>
                    {String(result.nfpaCompliance || result.nfpa1500 || result.complianceNotes)
                      .split('\n').filter(Boolean).map((p, i) => (
                        <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                      ))}
                  </div>
                </div>
              )}

              {/* Fallback */}
              {Object.entries(result).map(([key, val]) => {
                const skip = ['riskScore', 'score', 'fatigueScore', 'riskLevel',
                  'contributingFactors', 'factors', 'riskFactors',
                  'recommendations', 'actions', 'mitigations',
                  'safetyRecommendations', 'safetyNotes',
                  'nfpaCompliance', 'nfpa1500', 'complianceNotes'];
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
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' },
  row: { display: 'flex', gap: 12, marginBottom: 18 },
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
