import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const FORECAST_PERIODS = [
  { value: 'next_4_hours', label: 'Next 4 Hours' },
  { value: 'next_8_hours', label: 'Next 8 Hours' },
  { value: 'next_12_hours', label: 'Next 12 Hours' },
  { value: 'next_24_hours', label: 'Next 24 Hours' },
  { value: 'next_week', label: 'Next Week' },
];

const WEATHER_OPTIONS = ['Clear', 'Rain', 'Snow', 'Heat Wave', 'Cold Wave'];

const HISTORICAL_PERIODS = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_year', label: 'Last Year' },
];

export default function AIDemandForecastPage() {
  const [form, setForm] = useState({
    forecastPeriod: '',
    dayOfWeekConsideration: false,
    specialEvents: '',
    weatherConditions: '',
    historicalPeriod: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setCheck = (field) => (e) => setForm({ ...form, [field]: e.target.checked });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/demand-forecast', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demand forecast failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTrendArrow = (trend) => {
    if (!trend) return null;
    const t = String(trend).toLowerCase();
    if (t.includes('up') || t.includes('increas') || t.includes('high')) {
      return <i className="fas fa-arrow-up" style={{ color: '#ff6b6b', marginLeft: 8, fontSize: 18 }} />;
    }
    if (t.includes('down') || t.includes('decreas') || t.includes('low')) {
      return <i className="fas fa-arrow-down" style={{ color: '#2ed573', marginLeft: 8, fontSize: 18 }} />;
    }
    return <i className="fas fa-arrow-right" style={{ color: '#ffa502', marginLeft: 8, fontSize: 18 }} />;
  };

  const renderPeakHours = (hours) => {
    if (!hours) return null;
    const list = Array.isArray(hours) ? hours : String(hours).split(',').map(h => h.trim()).filter(Boolean);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {list.map((h, i) => (
          <div key={i} style={{
            padding: '8px 16px', borderRadius: 10,
            background: 'rgba(255,165,2,0.1)',
            border: '1px solid rgba(255,165,2,0.3)',
            color: '#ffa502', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="fas fa-clock" style={{ fontSize: 12 }} />
            {typeof h === 'string' ? h : (h.time || h.hour || JSON.stringify(h))}
          </div>
        ))}
      </div>
    );
  };

  const renderRiskFactors = (factors) => {
    if (!factors) return null;
    const list = Array.isArray(factors) ? factors : String(factors).split('\n').filter(Boolean);
    return (
      <div>
        {list.map((f, i) => {
          const isObj = typeof f === 'object' && f !== null;
          const text = isObj ? (f.factor || f.name || f.description || JSON.stringify(f)) : f;
          const severity = isObj ? (f.severity || f.level || f.risk || '') : '';
          const sevColor = String(severity).toLowerCase().includes('high') ? '#ff6b6b' :
            String(severity).toLowerCase().includes('med') ? '#ffa502' : '#2ed573';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 8,
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: sevColor, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.5 }}>{text}</span>
              {severity && (
                <span style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: `${sevColor}15`, border: `1px solid ${sevColor}40`,
                  color: sevColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
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

  return (
    <div style={s.page}>
      <style>{animations}</style>

      <div style={s.header}>
        <Link to="/dashboard" style={s.backLink}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />Back to Dashboard
        </Link>
        <h1 style={s.title}>
          <i className="fas fa-chart-line" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI Resource Demand Forecasting
        </h1>
        <p style={s.subtitle}>
          Predict call volumes, staffing needs, and resource allocation using AI analysis of historical patterns and contextual factors.
        </p>
      </div>

      <div style={s.grid}>
        {/* Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-sliders-h" style={{ color: '#00d4ff', marginRight: 8 }} />
            Forecast Parameters
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Forecast Period</label>
              <select style={s.input} value={form.forecastPeriod} onChange={set('forecastPeriod')} required>
                <option value="">Select period...</option>
                {FORECAST_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div style={{ ...s.field, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="dow"
                checked={form.dayOfWeekConsideration}
                onChange={setCheck('dayOfWeekConsideration')}
                style={{ width: 18, height: 18, accentColor: '#00d4ff' }}
              />
              <label htmlFor="dow" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', margin: 0 }}>
                Factor in day-of-week patterns
              </label>
            </div>

            <div style={s.field}>
              <label style={s.label}>Special Events</label>
              <input style={s.input} value={form.specialEvents} onChange={set('specialEvents')} placeholder="e.g., Stadium concert, marathon, festival" />
            </div>

            <div style={s.field}>
              <label style={s.label}>Weather Conditions</label>
              <select style={s.input} value={form.weatherConditions} onChange={set('weatherConditions')}>
                <option value="">Select weather...</option>
                {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Historical Period to Analyze</label>
              <select style={s.input} value={form.historicalPeriod} onChange={set('historicalPeriod')}>
                <option value="">Select period...</option>
                {HISTORICAL_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Generating forecast...</span>
              ) : (
                <span><i className="fas fa-chart-line" style={{ marginRight: 8 }} />Generate Forecast</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-chart-area" style={{ color: '#00d4ff', marginRight: 8 }} />
            Forecast Results
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is analyzing demand patterns...</p>
              <p style={s.loadingSubtext}>Processing historical data, events, and environmental factors</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-chart-bar" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Configure forecast parameters to generate demand predictions
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Predicted call volume */}
              {(result.predictedCallVolume !== undefined || result.callVolume !== undefined || result.predictedCalls !== undefined) && (
                <div style={{
                  padding: '24px 28px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,144,255,0.04))',
                  border: '1px solid rgba(0,212,255,0.2)',
                  marginBottom: 20, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                    Predicted Call Volume
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 56, fontWeight: 800, color: '#00d4ff', lineHeight: 1 }}>
                      {result.predictedCallVolume ?? result.callVolume ?? result.predictedCalls}
                    </span>
                    {renderTrendArrow(result.trend || result.direction)}
                  </div>
                  {(result.trend || result.direction) && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                      Trend: {result.trend || result.direction}
                    </div>
                  )}
                </div>
              )}

              {/* Confidence bar */}
              {(result.confidence || result.confidenceLevel) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Confidence Level</h3>
                  <div style={{
                    height: 10, borderRadius: 5,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden', marginBottom: 6,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      width: `${result.confidence || result.confidenceLevel}%`,
                      background: 'linear-gradient(90deg, #00d4ff, #2ed573)',
                      transition: 'width 1.5s ease',
                    }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    {result.confidence || result.confidenceLevel}% confidence
                  </span>
                </div>
              )}

              {/* Staffing levels */}
              {(result.recommendedStaffing || result.staffingLevels || result.staffing) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-users" style={{ color: '#a29bfe', marginRight: 8 }} />
                    Recommended Staffing
                  </h3>
                  <div style={s.textBlock}>
                    {typeof (result.recommendedStaffing || result.staffingLevels || result.staffing) === 'string' ? (
                      String(result.recommendedStaffing || result.staffingLevels || result.staffing)
                        .split('\n').filter(Boolean).map((p, i) => (
                          <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                        ))
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {Object.entries(result.recommendedStaffing || result.staffingLevels || result.staffing).map(([k, v]) => (
                          <div key={k} style={{
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(162,155,254,0.08)',
                            border: '1px solid rgba(162,155,254,0.2)',
                          }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#a29bfe' }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Peak hours */}
              {(result.peakHours || result.peakTimes) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-fire" style={{ color: '#ffa502', marginRight: 8 }} />
                    Peak Hours
                  </h3>
                  {renderPeakHours(result.peakHours || result.peakTimes)}
                </div>
              )}

              {/* Resource allocation */}
              {(result.resourceAllocation || result.recommendations || result.allocation) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-th-large" style={{ color: '#2ed573', marginRight: 8 }} />
                    Resource Allocation Recommendations
                  </h3>
                  <div style={s.textBlock}>
                    {(() => {
                      const val = result.resourceAllocation || result.recommendations || result.allocation;
                      if (typeof val === 'string') {
                        return val.split('\n').filter(Boolean).map((p, i) => (
                          <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{p}</p>
                        ));
                      }
                      if (Array.isArray(val)) {
                        return val.map((r, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
                          }}>
                            <i className="fas fa-check-circle" style={{ color: '#2ed573', marginTop: 3, flexShrink: 0 }} />
                            <span style={{ lineHeight: 1.6 }}>{typeof r === 'string' ? r : (r.recommendation || r.text || JSON.stringify(r))}</span>
                          </div>
                        ));
                      }
                      return <p style={{ margin: 0 }}>{JSON.stringify(val)}</p>;
                    })()}
                  </div>
                </div>
              )}

              {/* Risk factors */}
              {(result.riskFactors || result.risks) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <i className="fas fa-shield-alt" style={{ color: '#ff6b6b', marginRight: 8 }} />
                    Risk Factors Identified
                  </h3>
                  {renderRiskFactors(result.riskFactors || result.risks)}
                </div>
              )}

              {/* Fallback */}
              {Object.entries(result).map(([key, val]) => {
                const skip = ['predictedCallVolume', 'callVolume', 'predictedCalls', 'trend', 'direction',
                  'confidence', 'confidenceLevel', 'recommendedStaffing', 'staffingLevels', 'staffing',
                  'peakHours', 'peakTimes', 'resourceAllocation', 'recommendations', 'allocation',
                  'riskFactors', 'risks'];
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
