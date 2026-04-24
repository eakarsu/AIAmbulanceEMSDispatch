import React, { createContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

// ── Page imports ──────────────────────────────────────────────
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UnitsPage from './pages/UnitsPage';
import CallsPage from './pages/CallsPage';
import CrewPage from './pages/CrewPage';
import SchedulesPage from './pages/SchedulesPage';
import PCRPage from './pages/PCRPage';
import HospitalsPage from './pages/HospitalsPage';
import EquipmentPage from './pages/EquipmentPage';
import MedicationsPage from './pages/MedicationsPage';
import MaintenancePage from './pages/MaintenancePage';
import CertificationsPage from './pages/CertificationsPage';
import BillingPage from './pages/BillingPage';
import IncidentsPage from './pages/IncidentsPage';
import MetricsPage from './pages/MetricsPage';
import ProtocolsPage from './pages/ProtocolsPage';
import CommLogsPage from './pages/CommLogsPage';
import ExposurePage from './pages/ExposurePage';
import QAReviewsPage from './pages/QAReviewsPage';
import MutualAidPage from './pages/MutualAidPage';
import AITriagePage from './pages/AITriagePage';
import AIUnitSelectionPage from './pages/AIUnitSelectionPage';
import AIPCRDraftPage from './pages/AIPCRDraftPage';
import AIProtocolPage from './pages/AIProtocolPage';
import AIDemandForecastPage from './pages/AIDemandForecastPage';
import AIFatigueAnalysisPage from './pages/AIFatigueAnalysisPage';

// ── Auth context ──────────────────────────────────────────────
export const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Protected route wrapper ───────────────────────────────────
function ProtectedRoute({ children }) {
  const { token } = React.useContext(AuthContext);
  if (!token) return <Navigate to="/" replace />;
  return children;
}

// ── Navigation items ──────────────────────────────────────────
const navSections = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', icon: '📊', text: 'Dashboard' },
      { to: '/calls', icon: '📞', text: 'Calls / Dispatch' },
      { to: '/units', icon: '🚑', text: 'Units' },
      { to: '/crew', icon: '👥', text: 'Crew' },
      { to: '/schedules', icon: '📅', text: 'Schedules' },
      { to: '/incidents', icon: '🔔', text: 'Incidents' },
      { to: '/comm-logs', icon: '📡', text: 'Comm Logs' },
      { to: '/mutual-aid', icon: '🤝', text: 'Mutual Aid' },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { to: '/pcr', icon: '📋', text: 'PCR' },
      { to: '/protocols', icon: '📖', text: 'Protocols' },
      { to: '/hospitals', icon: '🏥', text: 'Hospitals' },
      { to: '/medications', icon: '💊', text: 'Medications' },
      { to: '/exposure', icon: '⚠️', text: 'Exposure Logs' },
      { to: '/qa-reviews', icon: '✅', text: 'QA Reviews' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/equipment', icon: '🔧', text: 'Equipment' },
      { to: '/maintenance', icon: '🛠️', text: 'Maintenance' },
      { to: '/certifications', icon: '🎓', text: 'Certifications' },
      { to: '/billing', icon: '💰', text: 'Billing' },
      { to: '/metrics', icon: '📈', text: 'Metrics' },
    ],
  },
  {
    label: 'AI Assist',
    items: [
      { to: '/ai/triage', icon: '🧠', text: 'AI Triage' },
      { to: '/ai/unit-selection', icon: '🎯', text: 'AI Unit Selection' },
      { to: '/ai/pcr-draft', icon: '📝', text: 'AI PCR Draft' },
      { to: '/ai/protocol', icon: '💡', text: 'AI Protocol' },
      { to: '/ai/demand-forecast', icon: '📉', text: 'AI Demand Forecast' },
      { to: '/ai/fatigue-analysis', icon: '😴', text: 'AI Fatigue Analysis' },
    ],
  },
];

// ── Layout with sidebar ───────────────────────────────────────
function Layout({ children }) {
  const { user, logout } = React.useContext(AuthContext);
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/ems-icon.svg" alt="EMS" className="sidebar-logo-icon" />
          <span className="sidebar-logo-text">EMS Dispatch</span>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-link${location.pathname === item.to ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.text}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.full_name || 'User'}</span>
            <span className="sidebar-user-role">{user?.role || 'Dispatcher'}</span>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicHome />} />

        {/* Authenticated */}
        <Route path="/dashboard" element={<Auth><Dashboard /></Auth>} />
        <Route path="/units" element={<Auth><UnitsPage /></Auth>} />
        <Route path="/calls" element={<Auth><CallsPage /></Auth>} />
        <Route path="/crew" element={<Auth><CrewPage /></Auth>} />
        <Route path="/schedules" element={<Auth><SchedulesPage /></Auth>} />
        <Route path="/pcr" element={<Auth><PCRPage /></Auth>} />
        <Route path="/hospitals" element={<Auth><HospitalsPage /></Auth>} />
        <Route path="/equipment" element={<Auth><EquipmentPage /></Auth>} />
        <Route path="/medications" element={<Auth><MedicationsPage /></Auth>} />
        <Route path="/maintenance" element={<Auth><MaintenancePage /></Auth>} />
        <Route path="/certifications" element={<Auth><CertificationsPage /></Auth>} />
        <Route path="/billing" element={<Auth><BillingPage /></Auth>} />
        <Route path="/incidents" element={<Auth><IncidentsPage /></Auth>} />
        <Route path="/metrics" element={<Auth><MetricsPage /></Auth>} />
        <Route path="/protocols" element={<Auth><ProtocolsPage /></Auth>} />
        <Route path="/comm-logs" element={<Auth><CommLogsPage /></Auth>} />
        <Route path="/exposure" element={<Auth><ExposurePage /></Auth>} />
        <Route path="/qa-reviews" element={<Auth><QAReviewsPage /></Auth>} />
        <Route path="/mutual-aid" element={<Auth><MutualAidPage /></Auth>} />
        <Route path="/ai/triage" element={<Auth><AITriagePage /></Auth>} />
        <Route path="/ai/unit-selection" element={<Auth><AIUnitSelectionPage /></Auth>} />
        <Route path="/ai/pcr-draft" element={<Auth><AIPCRDraftPage /></Auth>} />
        <Route path="/ai/protocol" element={<Auth><AIProtocolPage /></Auth>} />
        <Route path="/ai/demand-forecast" element={<Auth><AIDemandForecastPage /></Auth>} />
        <Route path="/ai/fatigue-analysis" element={<Auth><AIFatigueAnalysisPage /></Auth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

/* Convenience wrappers */
function PublicHome() {
  const { token } = React.useContext(AuthContext);
  return token ? <Navigate to="/dashboard" replace /> : <Login />;
}

function Auth({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}
