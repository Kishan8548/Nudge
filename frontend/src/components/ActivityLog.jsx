import { useState } from 'react';
import { 
  Bot, ChevronDown, ChevronUp, Clock, CheckCircle2, 
  AlertTriangle, UserCheck, Bell, Eye
} from 'lucide-react';

const EVENT_CONFIG = {
  created: { icon: CheckCircle2, color: 'var(--status-done)', label: 'Created' },
  updated: { icon: Eye, color: 'var(--accent-secondary)', label: 'Updated' },
  reminder_sent: { icon: Bell, color: 'var(--status-pending)', label: 'Reminder Sent' },
  manual_reminder: { icon: Bell, color: 'var(--status-in-progress)', label: 'Manual Reminder' },
  human_approved: { icon: UserCheck, color: 'var(--status-done)', label: 'Approved' },
  human_rejected: { icon: AlertTriangle, color: 'var(--status-escalated)', label: 'Rejected' },
};

export default function ActivityLog({ log = [] }) {
  const [expanded, setExpanded] = useState(false);
  const displayLog = expanded ? log : log.slice(0, 3);

  if (!log.length) {
    return (
      <div className="activity-log-empty">
        <Bot size={16} />
        <span>No activity yet</span>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <div className="activity-log-header" onClick={() => setExpanded(!expanded)}>
        <div className="activity-log-title">
          <Bot size={16} />
          <span>Agent Activity Log ({log.length} events)</span>
        </div>
        {log.length > 3 && (
          expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
        )}
      </div>

      <div className="activity-timeline">
        {displayLog.map((entry, i) => {
          const config = EVENT_CONFIG[entry.event] || EVENT_CONFIG.created;
          const EventIcon = config.icon;
          return (
            <div key={i} className="timeline-item" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="timeline-dot" style={{ background: config.color }}>
                <EventIcon size={10} color="#fff" />
              </div>
              <div className="timeline-content">
                <div className="timeline-label" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="timeline-detail">{entry.detail}</div>
                <div className="timeline-time">
                  <Clock size={10} />
                  {new Date(entry.ts).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {log.length > 3 && !expanded && (
        <button className="btn btn-ghost btn-sm activity-show-more" onClick={() => setExpanded(true)}>
          Show {log.length - 3} more events
        </button>
      )}

      <style>{`
        .activity-log {
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .activity-log-empty {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-muted);
          font-size: 0.85rem;
          padding: var(--space-md);
        }
        .activity-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          cursor: pointer;
          transition: background var(--transition-fast);
          border-bottom: 1px solid var(--glass-border);
        }
        .activity-log-header:hover {
          background: var(--glass-bg);
        }
        .activity-log-title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-accent);
        }
        .activity-timeline {
          padding: var(--space-md);
        }
        .timeline-item {
          display: flex;
          gap: var(--space-md);
          padding: var(--space-sm) 0;
          position: relative;
          animation: fadeIn 0.3s ease forwards;
          opacity: 0;
        }
        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 9px;
          top: 28px;
          bottom: -4px;
          width: 1px;
          background: var(--glass-border);
        }
        .timeline-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .timeline-content {
          flex: 1;
          min-width: 0;
        }
        .timeline-label {
          font-size: 0.8rem;
          font-weight: 600;
        }
        .timeline-detail {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-top: 2px;
          word-break: break-word;
        }
        .timeline-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .activity-show-more {
          width: 100%;
          justify-content: center;
          border-top: 1px solid var(--glass-border);
          border-radius: 0;
          padding: var(--space-sm);
        }
      `}</style>
    </div>
  );
}
