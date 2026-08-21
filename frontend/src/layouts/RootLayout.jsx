import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { 
  LayoutDashboard, Upload, ListChecks, Menu, X, 
  Zap, Bot, BarChart3
} from 'lucide-react';

import NudgeLogo from '../components/NudgeLogo';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/upload', icon: Upload, label: 'Upload Meeting' },
  { to: '/dashboard/action-items', icon: ListChecks, label: 'Action Items' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function RootLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <NudgeLogo size={34} />
            <div className="logo-text">
              <span className="logo-name">Nudge</span>
              <span className="logo-tag">AI Agent</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-badge">
            <Zap size={14} />
            <span>Powered by Groq + LangGraph</span>
          </div>
        </div>
      </aside>

      {/* Mobile toggle */}
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .sidebar {
          width: 260px;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 10;
          box-shadow: var(--shadow-sm);
        }
        .sidebar-header {
          padding: var(--space-lg);
          border-bottom: 1px solid var(--glass-border);
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: var(--shadow-glow);
        }
        .logo-name {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
        .logo-tag {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .sidebar-nav {
          flex: 1;
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all var(--transition-fast);
          text-decoration: none;
        }
        .sidebar-link:hover {
          color: var(--text-primary);
          background: var(--glass-bg);
        }
        .sidebar-link-active {
          color: var(--accent-primary) !important;
          background: rgba(13, 148, 136, 0.1) !important;
        }
        .sidebar-link-active::before {
          content: '';
          position: absolute;
          left: 0;
          width: 3px;
          height: 24px;
          background: var(--accent-primary);
          border-radius: 0 3px 3px 0;
        }
        .sidebar-footer {
          padding: var(--space-md);
          border-top: 1px solid var(--glass-border);
        }
        .sidebar-badge {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.7rem;
          color: var(--text-muted);
          padding: var(--space-sm);
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 99;
        }
        .mobile-toggle {
          display: none;
          position: fixed;
          top: var(--space-md);
          right: var(--space-md);
          z-index: 101;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar-open {
            transform: translateX(0);
          }
          .mobile-toggle {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}
