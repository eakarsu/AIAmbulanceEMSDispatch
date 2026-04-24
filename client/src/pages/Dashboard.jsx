import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

// ── Card definitions ──────────────────────────────────────────
const operationsCards = [
  { key: 'units', label: 'Unit Status Board', icon: 'fa-truck-medical', color: '#00d4ff', route: '/units', endpoint: '/api/units' },
  { key: 'calls', label: 'CAD Dispatch / Calls', icon: 'fa-phone-volume', color: '#ff6b6b', route: '/calls', endpoint: '/api/calls' },
  { key: 'crew', label: 'Crew Management', icon: 'fa-users', color: '#54a0ff', route: '/crew', endpoint: '/api/crew' },
  { key: 'schedules', label: 'Crew Scheduling', icon: 'fa-calendar-alt', color: '#5f27cd', route: '/schedules', endpoint: '/api/schedules' },
];

const clinicalCards = [
  { key: 'pcr', label: 'Patient Care Reports', icon: 'fa-file-medical', color: '#00d2d3', route: '/pcr', endpoint: '/api/pcr' },
  { key: 'hospitals', label: 'Hospital Management', icon: 'fa-hospital', color: '#ff9ff3', route: '/hospitals', endpoint: '/api/hospitals' },
  { key: 'protocols', label: 'Protocols', icon: 'fa-book-medical', color: '#48dbfb', route: '/protocols', endpoint: '/api/protocols' },
];

const aiCards = [
  { key: 'ai-triage', label: 'Triage Priority Scoring', icon: 'fa-brain', color: '#f368e0', route: '/ai/triage' },
  { key: 'ai-unit', label: 'Optimal Unit Selection', icon: 'fa-route', color: '#ff6348', route: '/ai/unit-selection' },
  { key: 'ai-pcr', label: 'PCR Report Drafting', icon: 'fa-robot', color: '#7bed9f', route: '/ai/pcr-draft' },
  { key: 'ai-protocol', label: 'Protocol Recommendation', icon: 'fa-stethoscope', color: '#70a1ff', route: '/ai/protocol' },
  { key: 'ai-demand', label: 'Resource Demand Forecast', icon: 'fa-chart-line', color: '#ffa502', route: '/ai/demand-forecast' },
  { key: 'ai-fatigue', label: 'Fatigue Risk Analysis', icon: 'fa-bed', color: '#ff4757', route: '/ai/fatigue-analysis' },
];

const logisticsCards = [
  { key: 'equipment', label: 'Equipment Inventory', icon: 'fa-toolbox', color: '#1dd1a1', route: '/equipment', endpoint: '/api/equipment' },
  { key: 'medications', label: 'Medication Tracking', icon: 'fa-pills', color: '#ee5a24', route: '/medications', endpoint: '/api/medications' },
  { key: 'maintenance', label: 'Vehicle Maintenance', icon: 'fa-wrench', color: '#786fa6', route: '/maintenance', endpoint: '/api/maintenance' },
  { key: 'certifications', label: 'Certification Tracking', icon: 'fa-certificate', color: '#f8c291', route: '/certifications', endpoint: '/api/certifications' },
];

const adminCards = [
  { key: 'billing', label: 'Billing', icon: 'fa-file-invoice-dollar', color: '#6ab04c', route: '/billing', endpoint: '/api/billing' },
  { key: 'incidents', label: 'Incident Mapping', icon: 'fa-map-marked-alt', color: '#e056fd', route: '/incidents', endpoint: '/api/incidents' },
  { key: 'metrics', label: 'Performance Metrics', icon: 'fa-chart-bar', color: '#22a6b3', route: '/metrics', endpoint: '/api/metrics' },
  { key: 'comm-logs', label: 'Communication Logs', icon: 'fa-headset', color: '#7158e2', route: '/comm-logs', endpoint: '/api/comm-logs' },
  { key: 'exposure', label: 'Exposure Tracking', icon: 'fa-biohazard', color: '#eb2f06', route: '/exposure', endpoint: '/api/exposure' },
  { key: 'qa-reviews', label: 'QA Reviews', icon: 'fa-clipboard-check', color: '#3ae374', route: '/qa-reviews', endpoint: '/api/qa-reviews' },
  { key: 'mutual-aid', label: 'Mutual Aid', icon: 'fa-handshake', color: '#18dcff', route: '/mutual-aid', endpoint: '/api/mutual-aid' },
];

const allEndpointCards = [...operationsCards, ...clinicalCards, ...logisticsCards, ...adminCards];

// ── Main Component ────────────────────────────────────────────
export default function Dashboard() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [quickStats, setQuickStats] = useState({
    activeCalls: 0,
    availableUnits: 0,
    enRouteUnits: 0,
    avgResponseTime: '0:00',
  });

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch data
  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
      const results = {};
      await Promise.allSettled(
        allEndpointCards.map(async (card) => {
          try {
            const res = await fetch(card.endpoint, { headers });
            if (res.ok) {
              const data = await res.json();
              const arr = Array.isArray(data) ? data : data.data || data.results || [];
              results[card.key] = Array.isArray(arr) ? arr.length : 0;
            } else {
              results[card.key] = 0;
            }
          } catch {
            results[card.key] = 0;
          }
        })
      );

      setCounts(results);

      // Derive quick stats from units & calls
      try {
        const unitsRes = await fetch('/api/units', { headers });
        if (unitsRes.ok) {
          const units = await unitsRes.json();
          const arr = Array.isArray(units) ? units : units.data || [];
          if (Array.isArray(arr)) {
            setQuickStats((prev) => ({
              ...prev,
              availableUnits: arr.filter((u) => u.status === 'available' || u.status === 'Available').length,
              enRouteUnits: arr.filter((u) => u.status === 'en_route' || u.status === 'En Route' || u.status === 'enroute').length,
            }));
          }
        }
      } catch {}

      try {
        const callsRes = await fetch('/api/calls', { headers });
        if (callsRes.ok) {
          const calls = await callsRes.json();
          const arr = Array.isArray(calls) ? calls : calls.data || [];
          if (Array.isArray(arr)) {
            const active = arr.filter((c) => c.status === 'active' || c.status === 'dispatched' || c.status === 'en_route');
            setQuickStats((prev) => ({ ...prev, activeCalls: active.length }));
            // Avg response time
            const times = arr.filter((c) => c.response_time_minutes).map((c) => c.response_time_minutes);
            if (times.length > 0) {
              const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
              setQuickStats((prev) => ({ ...prev, avgResponseTime: `${avg}:${String(0).padStart(2, '0')}` }));
            }
          }
        }
      } catch {}

      setLoading(false);
    };

    fetchAll();
  }, [token]);

  const formatDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Render helpers ────────────────────────────────────────
  const SkeletonCard = () => (
    <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
      <div style={{ width: '70%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
      <div style={{ width: '40%', height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );

  const renderCard = (card, isAI = false) => (
    <div
      key={card.key}
      onClick={() => navigate(card.route)}
      className="dash-card"
      style={{
        ...cardStyle,
        cursor: 'pointer',
        borderColor: `${card.color}22`,
        ...(isAI ? { border: `1px solid ${card.color}44`, boxShadow: `0 0 20px ${card.color}15, inset 0 0 20px ${card.color}08` } : {}),
      }}
    >
      {isAI && <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 9, color: card.color, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 }}>AI</div>}
      <div style={{ ...iconWrapStyle, background: `${card.color}18`, color: card.color, boxShadow: isAI ? `0 0 16px ${card.color}30` : 'none' }}>
        <i className={`fas ${card.icon}`} style={{ fontSize: 20 }} />
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 4 }}>{card.label}</div>
      {card.endpoint ? (
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{counts[card.key] ?? '--'}</div>
      ) : (
        <div style={{ fontSize: 12, color: `${card.color}99`, fontWeight: 500 }}>Open Tool</div>
      )}
    </div>
  );

  const renderSection = (title, cards, isAI = false) => (
    <div style={{ marginBottom: 36 }}>
      <h2 style={sectionTitleStyle}>
        {isAI && <i className="fas fa-sparkles" style={{ marginRight: 8, color: '#f368e0' }} />}
        {title}
      </h2>
      <div style={gridStyle}>
        {loading ? Array.from({ length: cards.length }).map((_, i) => <SkeletonCard key={i} />) : cards.map((c) => renderCard(c, isAI))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 0 40px', minHeight: '100vh' }}>
      {/* FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      <style>{`
        .dash-card { transition: all 0.25s ease; position: relative; }
        .dash-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; border-color: rgba(255,255,255,0.15) !important; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .blink { animation: blink 1s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
            <i className="fas fa-satellite-dish" style={{ marginRight: 10, color: '#00d4ff' }} />
            Command Center Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {formatDate(now)} &mdash; {formatTime(now)}
          </p>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div style={statsBarStyle}>
        <div style={statItemStyle}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Active Calls</span>
          <span className={quickStats.activeCalls > 0 ? 'blink' : ''} style={{ fontSize: 28, fontWeight: 700, color: quickStats.activeCalls > 0 ? '#ff6b6b' : '#fff' }}>
            {loading ? '--' : quickStats.activeCalls}
          </span>
        </div>
        <div style={statDivider} />
        <div style={statItemStyle}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Available Units</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#1dd1a1' }}>{loading ? '--' : quickStats.availableUnits}</span>
        </div>
        <div style={statDivider} />
        <div style={statItemStyle}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Units En Route</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#ffa502' }}>{loading ? '--' : quickStats.enRouteUnits}</span>
        </div>
        <div style={statDivider} />
        <div style={statItemStyle}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Avg Response</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#48dbfb' }}>{loading ? '--' : quickStats.avgResponseTime}</span>
        </div>
      </div>

      {/* Sections */}
      <div style={{ padding: '0 28px' }}>
        {renderSection('Operations', operationsCards)}
        {renderSection('Clinical', clinicalCards)}
        {renderSection('AI-Powered Tools', aiCards, true)}
        {renderSection('Logistics', logisticsCards)}
        {renderSection('Administration', adminCards)}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────
const headerStyle = {
  padding: '28px 28px 0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 20,
};

const statsBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  margin: '0 28px 32px',
  padding: '20px 32px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
};

const statItemStyle = {
  flex: 1,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const statDivider = {
  width: 1,
  height: 48,
  background: 'rgba(255,255,255,0.08)',
  margin: '0 16px',
  flexShrink: 0,
};

const sectionTitleStyle = {
  fontSize: 15,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
  gap: 16,
};

const cardStyle = {
  padding: '22px 20px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  backdropFilter: 'blur(8px)',
};

const iconWrapStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 14,
};
