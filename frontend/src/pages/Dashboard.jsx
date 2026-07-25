import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  FileAudio, ListChecks, CheckCircle2, AlertTriangle,
  Calendar, Clock, ChevronRight, Upload 
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [meetingRes, itemRes] = await Promise.all([
          api.listMeetings(0, 50),
          api.listActionItems({ limit: 100 }),
        ]);
        setMeetings(meetingRes.meetings || []);
        setActionItems(itemRes.action_items || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const stats = {
    totalMeetings: meetings.length,
    pendingItems: actionItems.filter(i => i.status === 'pending').length,
    completedItems: actionItems.filter(i => i.status === 'done').length,
    escalatedItems: actionItems.filter(i => i.status === 'escalated').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your meetings and action items</p>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-children">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(108, 99, 255, 0.15)' }}>
            <FileAudio size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <div className="stat-value">{stats.totalMeetings}</div>
            <div className="stat-label">Meetings</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-pending-bg)' }}>
            <ListChecks size={22} color="var(--status-pending)" />
          </div>
          <div>
            <div className="stat-value">{stats.pendingItems}</div>
            <div className="stat-label">Pending Items</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-done-bg)' }}>
            <CheckCircle2 size={22} color="var(--status-done)" />
          </div>
          <div>
            <div className="stat-value">{stats.completedItems}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-escalated-bg)' }}>
            <AlertTriangle size={22} color="var(--status-escalated)" />
          </div>
          <div>
            <div className="stat-value">{stats.escalatedItems}</div>
            <div className="stat-label">Escalated</div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <EmptyState
          icon={FileAudio}
          title="No meetings yet"
          description="Upload your first meeting recording to get started with AI-powered action item extraction."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>
              <Upload size={16} /> Upload Meeting
            </button>
          }
        />
      ) : (
        <div className="meetings-grid stagger-children">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="glass-card meeting-card"
              onClick={() => navigate(`/meetings/${meeting.id}`)}
            >
              <div className="meeting-card-header">
                <FileAudio size={18} className="meeting-card-icon" />
                <h3 className="meeting-card-title">{meeting.title}</h3>
                <ChevronRight size={16} className="meeting-card-arrow" />
              </div>
              <div className="meeting-card-meta">
                <span className="meeting-meta-item">
                  <Calendar size={13} />
                  {new Date(meeting.created_at).toLocaleDateString()}
                </span>
                {meeting.duration_seconds && (
                  <span className="meeting-meta-item">
                    <Clock size={13} />
                    {Math.round(meeting.duration_seconds / 60)} min
                  </span>
                )}
                {meeting.language && (
                  <span className="meeting-meta-item">
                    {meeting.language.toUpperCase()}
                  </span>
                )}
              </div>
              {meeting.decisions && meeting.decisions.length > 0 && (
                <div className="meeting-card-badge">
                  <CheckCircle2 size={12} />
                  {meeting.decisions.length} decisions
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .meetings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: var(--space-md);
        }
        .meeting-card {
          cursor: pointer;
          padding: var(--space-lg);
        }
        .meeting-card-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .meeting-card-icon {
          color: var(--accent-secondary);
          flex-shrink: 0;
        }
        .meeting-card-title {
          flex: 1;
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meeting-card-arrow {
          color: var(--text-muted);
          transition: transform var(--transition-fast);
        }
        .meeting-card:hover .meeting-card-arrow {
          transform: translateX(3px);
          color: var(--accent-primary);
        }
        .meeting-card-meta {
          display: flex;
          gap: var(--space-md);
          margin-top: var(--space-md);
          flex-wrap: wrap;
        }
        .meeting-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .meeting-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: var(--space-md);
          font-size: 0.75rem;
          color: var(--status-done);
          background: var(--status-done-bg);
          padding: 2px 8px;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
