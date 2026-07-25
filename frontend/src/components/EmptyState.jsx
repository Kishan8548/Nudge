import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = 'Nothing here yet', 
  description = '',
  action = null 
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-2xl) var(--space-lg);
          text-align: center;
          animation: fadeIn 0.4s ease;
        }
        .empty-state-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: var(--space-lg);
        }
        .empty-state-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-sm);
        }
        .empty-state-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          max-width: 360px;
        }
        .empty-state-action {
          margin-top: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
