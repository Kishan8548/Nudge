import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 24, text = '' }) {
  return (
    <div className="loading-spinner-container">
      <Loader2 size={size} className="loading-spinner-icon" />
      {text && <span className="loading-spinner-text">{text}</span>}

      <style>{`
        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
          padding: var(--space-2xl);
        }
        .loading-spinner-icon {
          color: var(--accent-primary);
          animation: spin 1s linear infinite;
        }
        .loading-spinner-text {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
