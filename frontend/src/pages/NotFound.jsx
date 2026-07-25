import { useNavigate } from 'react-router';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <div className="notfound-icon">
          <AlertCircle size={48} />
        </div>
        <h1 className="notfound-title">404</h1>
        <p className="notfound-desc">The page you're looking for doesn't exist.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Home size={16} /> Back to Dashboard
        </button>
      </div>

      <style>{`
        .notfound-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }
        .notfound-content {
          text-align: center;
        }
        .notfound-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin: 0 auto var(--space-lg);
        }
        .notfound-title {
          font-size: 3rem;
          font-weight: 800;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--space-sm);
        }
        .notfound-desc {
          color: var(--text-secondary);
          margin-bottom: var(--space-xl);
        }
      `}</style>
    </div>
  );
}
