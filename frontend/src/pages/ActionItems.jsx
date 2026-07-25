import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  ListChecks, User, Calendar, Clock, CheckCircle2, 
  Bell, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import ActivityLog from '../components/ActivityLog';

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'escalated', label: 'Escalated' },
];

export default function ActionItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState({});

  useEffect(() => {
    loadItems();
  }, [filter]);

  async function loadItems() {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter) params.status = filter;
      const res = await api.listActionItems(params);
      setItems(res.action_items || []);
    } catch (err) {
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(itemId) {
    if (expandedItem === itemId) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(itemId);
    // Load activity log if not cached
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
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleReminder(itemId) {
    try {
      await toast.promise(
        api.triggerReminder(itemId),
        {
          loading: 'Sending reminder...',
          success: '📧 Reminder sent!',
          error: (err) => `❌ ${err.message}`,
        }
      );
      loadItems();
    } catch {
      // handled by toast
    }
  }

  function isOverdue(deadline) {
    if (!deadline) return false;
    try {
      return new Date(deadline) < new Date();
    } catch { return false; }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Action Items</h1>
        <p>Track and manage all extracted action items</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {FILTERS.map(f => (
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
          title={filter ? `No ${filter} items` : 'No action items yet'}
          description="Upload a meeting and process it with AI to extract action items."
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
                  <tr key={item.id} className="ai-table-row">
                    <td className="ai-table-text">{item.text}</td>
                    <td>
                      {item.owner_name ? (
                        <span className="ai-owner">
                          <User size={13} /> {item.owner_name}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {item.deadline ? (
                        <span className={`ai-deadline ${isOverdue(item.deadline) ? 'overdue' : ''}`}>
                          <Calendar size={13} />
                          {item.deadline}
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
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        {item.owner_email && item.status !== 'done' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleReminder(item.id)}>
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
                            {item.owner_email && (
                              <span>📧 {item.owner_email}</span>
                            )}
                            <span>
                              <Clock size={12} /> Reminders sent: {item.reminder_count || 0}
                            </span>
                            <span>
                              Confidence: {((item.confidence || 1) * 100).toFixed(0)}%
                            </span>
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
        .ai-table-wrapper {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .ai-table-row {
          cursor: default;
        }
        .ai-table-text {
          max-width: 320px;
          font-weight: 500;
          font-size: 0.9rem;
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
        .ai-table-actions {
          display: flex;
          gap: var(--space-xs);
        }
        .ai-table-expanded {
          padding: 0 !important;
        }
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
        .text-muted {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
