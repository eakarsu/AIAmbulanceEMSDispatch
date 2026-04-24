import React, { useState, useContext, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

const navSections = [
  {
    label: 'OPERATIONS',
    items: [
      { to: '/units', icon: 'fa-ambulance', label: 'Units' },
      { to: '/calls', icon: 'fa-phone-alt', label: 'Calls/Dispatch' },
      { to: '/crew', icon: 'fa-users', label: 'Crew' },
      { to: '/scheduling', icon: 'fa-calendar-alt', label: 'Scheduling' },
    ],
  },
  {
    label: 'CLINICAL',
    items: [
      { to: '/pcr', icon: 'fa-file-medical', label: 'PCR Management' },
      { to: '/hospitals', icon: 'fa-hospital', label: 'Hospitals' },
      { to: '/protocols', icon: 'fa-book-medical', label: 'Protocols' },
    ],
  },
  {
    label: 'AI TOOLS',
    items: [
      { to: '/ai/triage', icon: 'fa-brain', label: 'Triage Scoring' },
      { to: '/ai/unit-selection', icon: 'fa-route', label: 'Unit Selection' },
      { to: '/ai/pcr-draft', icon: 'fa-robot', label: 'PCR Draft' },
      { to: '/ai/protocol', icon: 'fa-laptop-medical', label: 'Protocol AI' },
      { to: '/ai/demand-forecast', icon: 'fa-chart-line', label: 'Demand Forecast' },
      { to: '/ai/fatigue', icon: 'fa-bed', label: 'Fatigue Analysis' },
    ],
  },
  {
    label: 'LOGISTICS',
    items: [
      { to: '/equipment', icon: 'fa-toolbox', label: 'Equipment' },
      { to: '/medications', icon: 'fa-pills', label: 'Medications' },
      { to: '/maintenance', icon: 'fa-wrench', label: 'Maintenance' },
      { to: '/certifications', icon: 'fa-certificate', label: 'Certifications' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { to: '/billing', icon: 'fa-file-invoice-dollar', label: 'Billing' },
      { to: '/incidents', icon: 'fa-exclamation-triangle', label: 'Incidents' },
      { to: '/metrics', icon: 'fa-chart-bar', label: 'Metrics' },
      { to: '/comm-logs', icon: 'fa-headset', label: 'Comm Logs' },
      { to: '/exposure-tracking', icon: 'fa-biohazard', label: 'Exposure Tracking' },
      { to: '/qa-reviews', icon: 'fa-clipboard-check', label: 'QA Reviews' },
      { to: '/mutual-aid', icon: 'fa-handshake', label: 'Mutual Aid' },
    ],
  },
];

/* Inject layout styles once */
const STYLE_ID = 'ems-layout-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-layout { display:flex; min-height:100vh; background:#f0f2f5; }

    .ems-hamburger {
      display:none; position:fixed; top:12px; left:12px; z-index:1100;
      background:#1a2538; color:#fff; border:none; border-radius:8px;
      width:40px; height:40px; font-size:18px; cursor:pointer;
      align-items:center; justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
    }

    .ems-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:999;
    }

    .ems-sidebar {
      width:260px; min-width:260px; background:#1a2538; color:#c2c7d0;
      display:flex; flex-direction:column; height:100vh; position:sticky;
      top:0; overflow-y:auto; z-index:1000; transition:transform .3s ease;
    }

    .ems-sidebar::-webkit-scrollbar { width:4px; }
    .ems-sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }

    .ems-sidebar-header { padding:20px 16px 12px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .ems-logo-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .ems-logo-icon { font-size:22px; color:#3b82f6; }
    .ems-logo-text { font-size:18px; font-weight:700; color:#fff; letter-spacing:.5px; }
    .ems-user-name { font-size:14px; font-weight:600; color:#e2e8f0; }
    .ems-user-role { font-size:12px; color:#94a3b8; text-transform:capitalize; }

    .ems-nav { flex:1; padding:8px 0; overflow-y:auto; }
    .ems-section-label {
      font-size:11px; font-weight:700; color:#64748b;
      letter-spacing:1.2px; padding:12px 20px 4px; text-transform:uppercase;
    }

    .ems-nav-link {
      display:flex; align-items:center; gap:10px; padding:9px 20px;
      color:#94a3b8; text-decoration:none; font-size:13px; font-weight:500;
      border-left:3px solid transparent; transition:all .15s ease;
    }
    .ems-nav-link:hover { color:#cbd5e1; background:rgba(255,255,255,0.04); }
    .ems-nav-link.active {
      color:#fff; background:rgba(59,130,246,0.12);
      border-left-color:#3b82f6;
    }
    .ems-nav-link .nav-icon { width:18px; text-align:center; font-size:14px; color:#64748b; }
    .ems-nav-link.active .nav-icon { color:#3b82f6; }

    .ems-sidebar-footer { padding:12px 16px; border-top:1px solid rgba(255,255,255,0.08); }
    .ems-logout-btn {
      width:100%; padding:10px 12px; background:rgba(239,68,68,0.1);
      color:#f87171; border:1px solid rgba(239,68,68,0.2); border-radius:8px;
      cursor:pointer; font-size:13px; font-weight:600;
      display:flex; align-items:center; justify-content:center; transition:all .15s ease;
    }
    .ems-logout-btn:hover { background:rgba(239,68,68,0.2); }

    .ems-main { flex:1; padding:24px; overflow-y:auto; min-height:100vh; }

    @media (max-width:768px) {
      .ems-hamburger { display:flex; }
      .ems-sidebar { position:fixed; transform:translateX(-100%); }
      .ems-sidebar.open { transform:translateX(0); }
      .ems-main { padding:16px; padding-top:60px; }
    }
  `;
  document.head.appendChild(tag);
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  /* Close sidebar on route change (mobile) */
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="ems-layout">
      <button
        className="ems-hamburger"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} />
      </button>

      {sidebarOpen && (
        <div className="ems-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`ems-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="ems-sidebar-header">
          <div className="ems-logo-row">
            <i className="fas fa-ambulance ems-logo-icon" />
            <span className="ems-logo-text">EMS Dispatch</span>
          </div>
          {user && (
            <div>
              <div className="ems-user-name">{user.name || user.username || 'User'}</div>
              <div className="ems-user-role">{user.role || 'Operator'}</div>
            </div>
          )}
        </div>

        <nav className="ems-nav">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="ems-section-label">{section.label}</div>
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  location.pathname.startsWith(item.to + '/');
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`ems-nav-link${isActive ? ' active' : ''}`}
                  >
                    <i className={`fas ${item.icon} nav-icon`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="ems-sidebar-footer">
          <button className="ems-logout-btn" onClick={logout}>
            <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }} />
            Logout
          </button>
        </div>
      </aside>

      <main className="ems-main">
        <Outlet />
      </main>
    </div>
  );
}
