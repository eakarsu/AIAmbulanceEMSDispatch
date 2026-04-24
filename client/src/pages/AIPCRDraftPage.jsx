import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AIPCRDraftPage() {
  const [form, setForm] = useState({
    patientName: '',
    patientAge: '',
    patientGender: '',
    chiefComplaint: '',
    callDescription: '',
    bp: '',
    hr: '',
    rr: '',
    spo2: '',
    temp: '',
    gcs: '',
    treatmentsGiven: '',
    procedures: '',
    transportDisposition: '',
    receivingFacility: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/pcr-draft', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PCR draft generation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFullText = () => {
    if (!result) return '';
    const sections = ['subjective', 'objective', 'assessment', 'plan', 'narrative'];
    let text = `PATIENT CARE REPORT\n${'='.repeat(40)}\n`;
    text += `Patient: ${form.patientName || 'N/A'} | Age: ${form.patientAge || 'N/A'} | Gender: ${form.patientGender || 'N/A'}\n`;
    text += `Chief Complaint: ${form.chiefComplaint || 'N/A'}\n${'='.repeat(40)}\n\n`;
    for (const key of sections) {
      const val = result[key] || result[key.charAt(0).toUpperCase() + key.slice(1)];
      if (val) text += `${key.toUpperCase()}\n${'-'.repeat(20)}\n${val}\n\n`;
    }
    // Include any other string fields
    for (const [k, v] of Object.entries(result)) {
      if (sections.includes(k.toLowerCase()) || typeof v !== 'string') continue;
      text += `${k.toUpperCase()}\n${'-'.repeat(20)}\n${v}\n\n`;
    }
    return text.trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = getFullText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pcr', {
        method: 'POST',
        headers: API_HEADERS(),
        body: JSON.stringify({
          patientName: form.patientName,
          patientAge: form.patientAge,
          patientGender: form.patientGender,
          chiefComplaint: form.chiefComplaint,
          narrative: getFullText(),
          vitals: { bp: form.bp, hr: form.hr, rr: form.rr, spo2: form.spo2, temp: form.temp, gcs: form.gcs },
          aiGenerated: true,
          ...result,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Save failed');
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const SOAP_SECTIONS = [
    { key: 'subjective', icon: 'fa-user-injured', color: '#00d4ff', label: 'Subjective' },
    { key: 'objective', icon: 'fa-stethoscope', color: '#2ed573', label: 'Objective' },
    { key: 'assessment', icon: 'fa-diagnoses', color: '#ffa502', label: 'Assessment' },
    { key: 'plan', icon: 'fa-clipboard-check', color: '#a29bfe', label: 'Plan' },
  ];

  const renderSOAP = () => {
    return SOAP_SECTIONS.map(({ key, icon, color, label }) => {
      const val = result[key] || result[label] || result[key.charAt(0).toUpperCase() + key.slice(1)];
      if (!val) return null;
      return (
        <div key={key} style={{
          padding: 18,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid rgba(255,255,255,0.06)`,
          borderLeft: `4px solid ${color}`,
          marginBottom: 14,
        }}>
          <h3 style={{
            margin: '0 0 10px', fontSize: 14, fontWeight: 700,
            color, textTransform: 'uppercase', letterSpacing: 1,
            display: 'flex', alignItems: 'center',
          }}>
            <i className={`fas ${icon}`} style={{ marginRight: 8 }} />{label}
          </h3>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8 }}>
            {String(val).split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: '0 0 6px' }}>{p}</p>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div style={s.page}>
      <style>{animations}</style>

      <div style={s.header}>
        <Link to="/dashboard" style={s.backLink}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />Back to Dashboard
        </Link>
        <h1 style={s.title}>
          <i className="fas fa-file-medical" style={{ color: '#00d4ff', marginRight: 12 }} />
          AI PCR Report Drafting
        </h1>
        <p style={s.subtitle}>
          Generate professional Patient Care Reports in SOAP format using AI. Review, edit, and save directly to your records.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-clipboard-list" style={{ color: '#00d4ff', marginRight: 8 }} />
            Patient & Call Information
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Patient info */}
            <div style={s.row3}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Patient Name</label>
                <input style={s.input} value={form.patientName} onChange={set('patientName')} placeholder="Full name" />
              </div>
              <div style={{ flex: 0.5 }}>
                <label style={s.label}>Age</label>
                <input style={s.input} type="number" value={form.patientAge} onChange={set('patientAge')} placeholder="Age" />
              </div>
              <div style={{ flex: 0.6 }}>
                <label style={s.label}>Gender</label>
                <select style={s.input} value={form.patientGender} onChange={set('patientGender')}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Chief Complaint</label>
              <input style={s.input} value={form.chiefComplaint} onChange={set('chiefComplaint')} placeholder="Primary complaint" required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Call Description</label>
              <textarea style={{ ...s.input, ...s.textarea, minHeight: 80 }} value={form.callDescription} onChange={set('callDescription')} placeholder="Detailed scene and patient description..." required />
            </div>

            {/* Vitals */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ ...s.label, marginBottom: 10 }}>
                <i className="fas fa-heartbeat" style={{ color: '#ff6b6b', marginRight: 6 }} />Vitals
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'bp', placeholder: 'BP (120/80)', label: 'BP' },
                  { key: 'hr', placeholder: 'HR (80)', label: 'HR' },
                  { key: 'rr', placeholder: 'RR (16)', label: 'RR' },
                  { key: 'spo2', placeholder: 'SpO2 (98%)', label: 'SpO2' },
                  { key: 'temp', placeholder: 'Temp (98.6)', label: 'Temp' },
                  { key: 'gcs', placeholder: 'GCS (15)', label: 'GCS' },
                ].map(({ key, placeholder, label: l }) => (
                  <div key={key}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 0.5 }}>{l}</span>
                    <input style={{ ...s.input, padding: '8px 10px', fontSize: 13 }} value={form[key]} onChange={set(key)} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Treatments Given</label>
              <textarea style={{ ...s.input, ...s.textarea }} value={form.treatmentsGiven} onChange={set('treatmentsGiven')} placeholder="Medications, interventions, etc." />
            </div>

            <div style={s.field}>
              <label style={s.label}>Procedures</label>
              <textarea style={{ ...s.input, ...s.textarea }} value={form.procedures} onChange={set('procedures')} placeholder="IV access, intubation, splinting, etc." />
            </div>

            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Transport Disposition</label>
                <select style={s.input} value={form.transportDisposition} onChange={set('transportDisposition')}>
                  <option value="">Select...</option>
                  <option value="Transported - Emergency">Transported - Emergency</option>
                  <option value="Transported - Non-Emergency">Transported - Non-Emergency</option>
                  <option value="Refused Transport">Refused Transport</option>
                  <option value="No Transport - DOA">No Transport - DOA</option>
                  <option value="Mutual Aid">Mutual Aid</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Receiving Facility</label>
                <input style={s.input} value={form.receivingFacility} onChange={set('receivingFacility')} placeholder="Hospital name" />
              </div>
            </div>

            <button type="submit" style={s.submitBtn} disabled={loading} className="ai-submit-btn">
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Generating report...</span>
              ) : (
                <span><i className="fas fa-magic" style={{ marginRight: 8 }} />Generate PCR Draft</span>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>
            <i className="fas fa-file-medical-alt" style={{ color: '#00d4ff', marginRight: 8 }} />
            Generated PCR Report
          </h2>

          {loading && (
            <div style={s.loadingBox}>
              <div className="ai-pulse-ring" />
              <p style={s.loadingText}>AI is drafting your PCR report...</p>
              <p style={s.loadingSubtext}>Compiling clinical narrative in SOAP format</p>
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={s.emptyState}>
              <i className="fas fa-file-medical" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Fill in patient and call information to generate a PCR report
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
              {/* Report header */}
              <div style={{
                padding: '16px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,144,255,0.05))',
                border: '1px solid rgba(0,212,255,0.2)',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    Patient Care Report
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    {form.patientName || 'Patient'}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                    {form.patientAge && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Age: {form.patientAge}</span>}
                    {form.patientGender && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Gender: {form.patientGender}</span>}
                    {form.chiefComplaint && <span style={{ fontSize: 13, color: '#ffa502' }}>CC: {form.chiefComplaint}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.bp && <span style={s.vitalPill}>BP {form.bp}</span>}
                  {form.hr && <span style={s.vitalPill}>HR {form.hr}</span>}
                  {form.spo2 && <span style={s.vitalPill}>SpO2 {form.spo2}</span>}
                </div>
              </div>

              {/* SOAP sections */}
              {renderSOAP()}

              {/* Narrative (if present as separate field) */}
              {(result.narrative || result.fullNarrative) && (
                <div style={{
                  padding: 18, borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 14,
                }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>
                    <i className="fas fa-align-left" style={{ marginRight: 8 }} />Full Narrative
                  </h3>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8 }}>
                    {String(result.narrative || result.fullNarrative).split('\n').filter(Boolean).map((p, i) => (
                      <p key={i} style={{ margin: '0 0 6px' }}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback for other fields */}
              {Object.entries(result).map(([key, val]) => {
                if (['subjective', 'Subjective', 'objective', 'Objective', 'assessment', 'Assessment',
                  'plan', 'Plan', 'narrative', 'fullNarrative'].includes(key)) return null;
                if (typeof val !== 'string') return null;
                return (
                  <div key={key} style={{
                    padding: 18, borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 14,
                  }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                    </h3>
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8 }}>
                      {val.split('\n').filter(Boolean).map((p, i) => (
                        <p key={i} style={{ margin: '0 0 6px' }}>{p}</p>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button onClick={handleCopy} style={{
                  ...s.actionBtn,
                  background: copied ? 'rgba(46,213,115,0.15)' : 'rgba(255,255,255,0.06)',
                  borderColor: copied ? 'rgba(46,213,115,0.4)' : 'rgba(255,255,255,0.1)',
                  color: copied ? '#2ed573' : 'rgba(255,255,255,0.7)',
                }} className="ai-submit-btn">
                  <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 8 }} />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button onClick={handleSave} disabled={saving || saved} style={{
                  ...s.actionBtn,
                  background: saved ? 'rgba(46,213,115,0.15)' : 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)',
                  borderColor: saved ? 'rgba(46,213,115,0.4)' : 'transparent',
                  color: '#fff',
                  opacity: saving ? 0.6 : 1,
                }} className="ai-submit-btn">
                  <i className={`fas ${saved ? 'fa-check-circle' : saving ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 8 }} />
                  {saved ? 'Saved to PCR' : saving ? 'Saving...' : 'Save as PCR'}
                </button>
              </div>
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
    box-shadow: 0 8px 25px rgba(0,212,255,0.3) !important;
  }
  .ai-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const s = {
  page: { fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff', minHeight: '100vh', padding: '24px 32px' },
  header: { marginBottom: 32 },
  backLink: { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  subtitle: { margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, backdropFilter: 'blur(12px)' },
  cardTitle: { margin: '0 0 24px', fontSize: 17, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center' },
  field: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: 72 },
  row: { display: 'flex', gap: 12, marginBottom: 18 },
  row3: { display: 'flex', gap: 10, marginBottom: 18 },
  submitBtn: { width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', marginTop: 8 },
  loadingBox: { textAlign: 'center', padding: '48px 0' },
  loadingText: { color: '#00d4ff', fontSize: 16, fontWeight: 600, margin: '0 0 6px' },
  loadingSubtext: { color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 },
  errorBox: { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ff6b6b', fontSize: 14 },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  vitalPill: {
    padding: '4px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: 500, fontFamily: "'Inter', monospace",
  },
  actionBtn: {
    flex: 1, padding: '12px 16px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.3s', fontFamily: "'Inter', sans-serif",
  },
};
