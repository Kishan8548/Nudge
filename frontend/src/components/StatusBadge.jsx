export default function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Pending', className: 'badge-pending' },
    in_progress: { label: 'In Progress', className: 'badge-in-progress' },
    done: { label: 'Done', className: 'badge-done' },
    escalated: { label: 'Escalated', className: 'badge-escalated' },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <>
      <span className={`status-badge ${className}`}>{label}</span>
      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .badge-pending {
          background: var(--status-pending-bg);
          color: var(--status-pending);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .badge-in-progress {
          background: var(--status-in-progress-bg);
          color: var(--status-in-progress);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .badge-done {
          background: var(--status-done-bg);
          color: var(--status-done);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge-escalated {
          background: var(--status-escalated-bg);
          color: var(--status-escalated);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </>
  );
}
