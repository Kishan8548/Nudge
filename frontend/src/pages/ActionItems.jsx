import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  ListChecks, User, Calendar, Clock, CheckCircle2, 
  Bell, ChevronDown, ChevronUp, Users, UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import ActivityLog from '../components/ActivityLog';

const STATUS_FILTERS = [
  { key: null,         label: 'All Status' },
  { key: 'pending',    label: 'Pending' },
  { key: 'in_progress',label: 'In Progress' },
  { key: 'done',       label: 'Done' },
  { key: 'escalated',  label: 'Escalated' },
];

export default function ActionItemsPage() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState(null);
  const [mineOnly,     setMineOnly]     = useState(true);   // ← default: MY tasks
  const [expandedItem, setExpandedItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, mine: mineOnly };
      if (filter) params.status = filter;
      const res = await api.listActionItems(params);
      setItems(res.action_items || []);
    } catch (err) {
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filter, mineOnly]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function toggleExpand(itemId) {
    if (expandedItem === itemId) { setExpandedItem(null); return; }
    setExpandedItem(itemId);
    if (!activityLogs[itemId]) {
      try {
        const data = await api.getActivityLog(itemId);
        setActivityLogs(prev => ({ ...prev, [itemId]: data.activity_log || [] }));
      } catch {
        setActivityLogs(prev => ({ ...prev, [itemId]: [] }));
      }
    }
  }

  async function handleStatusToggle(itemId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await api.updateActionItem(itemId, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      loadItems();
    } catch (err) { toast.error(err.message); }
  }

  async function handleReminder(itemId) {
    try {
      await toast.promise(api.triggerReminder(itemId), {
        loading: 'Sending reminder...',
        success: '📧 Reminder sent!',
        error:   (err) => `❌ ${err.message}`,
      });
      loadItems();
    } catch { /* handled by toast */ }
  }

  function isOverdue(deadline) {
    if (!deadline) return false;
    try { return new Date(deadline) < new Date(); } catch { return false; }
  }

  const pendingCount  = items.filter(i => i.status === 'pending').length;
  const overdueCount  = items.filter(i => isOverdue(i.deadline) && i.status !== 'done').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Action Items</h1>
          <p>
            {mineOnly
              ? 'Your tasks extracted from meetings'
              : 'All tasks from all meeting participants'}
          </p>
        </div>

        {/* Mine / All toggle */}
        <div className="mine-toggle">
          <button
            className={`toggle-btn ${mineOnly ? 'active' : ''}`}
            onClick={() => setMineOnly(true)}
            title="Show only your tasks"
          >
            <UserCheck size={14} /> My Tasks
          </button>
          <button
            className={`toggle-btn ${!mineOnly ? 'active' : ''}`}
            onClick={() => setMineOnly(false)}
            title="Show all participants' tasks"
          >
            <Users size={14} /> All Tasks
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && items.length > 0 && (
        <div className="ai-stats-strip">
          <span className="stat-chip">{items.length} total</span>
          {pendingCount > 0 && (
            <span className="stat-chip pending">{pendingCount} pending</span>
          )}
          {overdueCount > 0 && (
            <span className="stat-chip overdue">⚠️ {overdueCount} overdue</span>
          )}
        </div>
      )}

      {/* Status filters */}
      <div className="filter-bar">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Loading action items..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={
            mineOnly
              ? 'No tasks assigned to you'
              : (filter ? `No ${filter} items` : 'No action items yet')
          }
          description={
            mineOnly
              ? 'Your name was not matched in any meeting, or all your tasks are done. Try switching to "All Tasks".'
              : 'Upload a meeting and process it with AI to extract action items.'
          }
        />
      ) : (
        <div className="ai-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action Item</th>
                <th>Owner</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <>
                  <tr key={item.id} className={`ai-table-row ${item.is_mine ? 'is-mine' : ''}`}>
                    <td className="ai-table-text">
                      {item.is_mine && <span className="mine-dot" title="Your task" />}
                      {item.text}
                    </td>
                    <td>
                      {item.owner_name ? (
                        <span className="ai-owner">
                          <User size={13} /> {item.owner_name}
                        </span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {item.deadline ? (
                        <span className={`ai-deadline ${isOverdue(item.deadline) && item.status !== 'done' ? 'overdue' : ''}`}>
                          <Calendar size={13} />
                          {new Date(item.deadline).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="ai-table-actions">
                        <button
                          className={`btn btn-sm ${item.status === 'done' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleStatusToggle(item.id, item.status)}
                          title={item.status === 'done' ? 'Mark pending' : 'Mark done'}
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        {item.owner_email && item.status !== 'done' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleReminder(item.id)}
                            title="Send reminder email"
                          >
                            <Bell size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(item.id)}>
                        {expandedItem === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expandedItem === item.id && (
                    <tr key={`${item.id}-log`}>
                      <td colSpan={6} className="ai-table-expanded">
                        <div className="ai-expanded-content">
                          <div className="ai-expanded-meta">
                            {item.owner_email && <span>📧 {item.owner_email}</span>}
                            <span><Clock size={12} /> Reminders sent: {item.reminder_count || 0}</span>
                            <span>Confidence: {((item.confidence || 1) * 100).toFixed(0)}%</span>
                            {item.is_mine !== undefined && (
                              <span>{item.is_mine ? '✅ Your task' : '👤 Someone else\'s task'}</span>
                            )}
                          </div>
                          <ActivityLog log={activityLogs[item.id] || []} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
        }
        .mine-toggle {
          display: flex;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .toggle-btn.active {
          background: var(--accent-primary);
          color: white;
        }
        .toggle-btn:hover:not(.active) {
          background: var(--glass-border);
          color: var(--text-primary);
        }
        .ai-stats-strip {
          display: flex;
          gap: 8px;
          margin-bottom: var(--space-md);
          flex-wrap: wrap;
        }
        .stat-chip {
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 500;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
        }
        .stat-chip.pending { color: var(--status-pending); border-color: var(--status-pending); }
        .stat-chip.overdue { color: var(--status-escalated); border-color: var(--status-escalated); }
        .mine-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-primary);
          margin-right: 6px;
          vertical-align: middle;
          flex-shrink: 0;
        }
        .ai-table-row.is-mine td:first-child {
          border-left: 2px solid var(--accent-primary);
        }
        .ai-table-wrapper {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .ai-table-text {
          max-width: 320px;
          font-weight: 500;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }
        .ai-owner {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .ai-deadline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .ai-deadline.overdue {
          color: var(--status-escalated);
          font-weight: 600;
        }
        .ai-table-actions { display: flex; gap: var(--space-xs); }
        .ai-table-expanded { padding: 0 !important; }
        .ai-expanded-content {
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-secondary);
          border-top: 1px solid var(--glass-border);
        }
        .ai-expanded-meta {
          display: flex;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
          flex-wrap: wrap;
        }
        .ai-expanded-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .text-muted { color: var(--text-muted); font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
