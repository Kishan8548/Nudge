import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Bot, Sparkles, CheckCircle2, AlertTriangle, 
  Clock, User, Calendar, Bell, FileText, Loader2
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ActivityLog from '../components/ActivityLog';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activityLogs, setActivityLogs] = useState({});

  useEffect(() => {
    loadMeeting();
  }, [id]);

  async function loadMeeting() {
    try {
      const data = await api.getMeeting(id);
      setMeeting(data);
      // Load activity logs for each action item
      if (data.action_items?.length) {
        const logs = {};
        for (const item of data.action_items) {
          try {
            const logData = await api.getActivityLog(item.id);
            logs[item.id] = logData.activity_log || [];
          } catch {
            logs[item.id] = [];
          }
        }
        setActivityLogs(logs);
      }
    } catch (err) {
      toast.error(`Failed to load meeting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      await toast.promise(
        api.processMeeting(id),
        {
          loading: '🤖 AI is analyzing the transcript...',
          success: '✅ Extraction complete!',
          error: (err) => `❌ ${err.message}`,
        }
      );
      // Reload meeting to get fresh data
      await loadMeeting();
    } finally {
      setProcessing(false);
    }
  }

  async function handleStatusToggle(itemId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await api.updateActionItem(itemId, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      loadMeeting();
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
      loadMeeting();
    } catch {
      // handled by toast.promise
    }
  }

  async function handleReview(itemId, approved) {
    try {
      await api.reviewActionItem(itemId, { approved });
      toast.success(approved ? 'Item approved!' : 'Item rejected');
      loadMeeting();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <LoadingSpinner text="Loading meeting..." />;
  if (!meeting) return <div>Meeting not found</div>;

  const hasActionItems = meeting.action_items?.length > 0;
  const hasDecisions = meeting.decisions?.length > 0;
  const needsProcessing = !hasActionItems && !hasDecisions;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="detail-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="page-header">
        <h1>{meeting.title}</h1>
        <p>
          <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {new Date(meeting.created_at).toLocaleString()}
          {meeting.duration_seconds && ` • ${Math.round(meeting.duration_seconds / 60)} min`}
          {meeting.language && ` • ${meeting.language.toUpperCase()}`}
        </p>
      </div>

      {/* Process Button */}
      {needsProcessing && meeting.raw_transcript && (
        <div className="process-cta glass-card">
          <div className="process-cta-content">
            <Sparkles size={24} className="process-cta-icon" />
            <div>
              <h3>Ready for AI Analysis</h3>
              <p>Extract decisions and action items from this transcript</p>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleProcess}
            disabled={processing}
          >
            {processing ? (
              <><Loader2 size={16} className="spin" /> Processing...</>
            ) : (
              <><Bot size={16} /> Process with AI</>
            )}
          </button>
        </div>
      )}

      {/* Decisions */}
      {hasDecisions && (
        <section className="detail-section">
          <h2 className="section-title">
            <CheckCircle2 size={18} />
            Decisions ({meeting.decisions.length})
          </h2>
          <div className="decisions-list stagger-children">
            {meeting.decisions.map((d, i) => (
              <div key={i} className="decision-item glass-card">
                <CheckCircle2 size={14} className="decision-icon" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action Items */}
      {hasActionItems && (
        <section className="detail-section">
          <h2 className="section-title">
            <FileText size={18} />
            Action Items ({meeting.action_items.length})
            {meeting.needs_human_review && (
              <span className="review-flag">
                <AlertTriangle size={14} /> Needs Review
              </span>
            )}
          </h2>
          <div className="action-items-list stagger-children">
            {meeting.action_items.map((item) => (
              <div key={item.id} className="action-item-card glass-card">
                <div className="ai-card-top">
                  <div className="ai-card-text">
                    <p className="ai-card-desc">{item.text}</p>
                    <div className="ai-card-meta">
                      {item.owner_name && (
                        <span><User size={12} /> {item.owner_name}</span>
                      )}
                      {item.deadline && (
                        <span><Calendar size={12} /> {item.deadline}</span>
                      )}
                      <span><Clock size={12} /> Reminders: {item.reminder_count || 0}</span>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Low confidence review */}
                {item.confidence < 0.7 && item.status !== 'done' && (
                  <div className="ai-card-review">
                    <AlertTriangle size={14} />
                    <span>Low confidence ({(item.confidence * 100).toFixed(0)}%) — needs human review</span>
                    <div className="ai-card-review-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleReview(item.id, true)}>
                        Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleReview(item.id, false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="ai-card-actions">
                  <button
                    className={`btn btn-sm ${item.status === 'done' ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleStatusToggle(item.id, item.status)}
                  >
                    <CheckCircle2 size={14} />
                    {item.status === 'done' ? 'Reopen' : 'Mark Done'}
                  </button>
                  {item.owner_email && item.status !== 'done' && (
                    <button className="btn btn-sm btn-secondary" onClick={() => handleReminder(item.id)}>
                      <Bell size={14} /> Send Reminder
                    </button>
                  )}
                </div>

                {/* Activity Log */}
                {activityLogs[item.id]?.length > 0 && (
                  <div className="ai-card-log">
                    <ActivityLog log={activityLogs[item.id]} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcript */}
      {meeting.raw_transcript && (
        <section className="detail-section">
          <h2 className="section-title">
            <FileText size={18} />
            Full Transcript
          </h2>
          <div className="transcript-box glass-card">
            <pre className="transcript-text">{meeting.raw_transcript}</pre>
          </div>
        </section>
      )}

      <style>{`
        .detail-header {
          margin-bottom: var(--space-md);
        }
        .process-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-xl);
          gap: var(--space-lg);
          flex-wrap: wrap;
        }
        .process-cta-content {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .process-cta-icon {
          color: var(--accent-secondary);
        }
        .process-cta h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .process-cta p {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .detail-section {
          margin-bottom: var(--space-xl);
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: var(--space-md);
          color: var(--text-primary);
        }
        .review-flag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--status-pending);
          background: var(--status-pending-bg);
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: var(--space-sm);
        }
        .decisions-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .decision-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          padding: var(--space-md);
        }
        .decision-icon {
          color: var(--status-done);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .action-items-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .action-item-card {
          padding: var(--space-lg);
        }
        .ai-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-md);
        }
        .ai-card-desc {
          font-weight: 500;
          margin-bottom: var(--space-sm);
        }
        .ai-card-meta {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        .ai-card-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .ai-card-review {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          padding: var(--space-md);
          background: var(--status-pending-bg);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          color: var(--status-pending);
          flex-wrap: wrap;
        }
        .ai-card-review-actions {
          display: flex;
          gap: var(--space-sm);
          margin-left: auto;
        }
        .ai-card-actions {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--glass-border);
        }
        .ai-card-log {
          margin-top: var(--space-md);
        }
        .transcript-box {
          max-height: 400px;
          overflow-y: auto;
        }
        .transcript-text {
          font-family: inherit;
          font-size: 0.88rem;
          line-height: 1.8;
          color: var(--text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
