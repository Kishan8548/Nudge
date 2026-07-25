import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, CheckCircle2, AlertTriangle,
  Users, Clock, FileAudio, ListChecks
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Minimal SVG bar chart — no external charting lib needed ──────────────────
function BarChart({ data, labelKey, valueKey, color = 'var(--accent-primary)' }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">No data yet — process some meetings first</div>
    );
  }
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-value">{d[valueKey]}</div>
          <div
            className="bar-fill"
            style={{
              height: `${Math.round((d[valueKey] / max) * 100)}%`,
              background: color,
            }}
          />
          <div className="bar-label">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

// ── Donut / Pie chart using SVG ───────────────────────────────────────────────
const STATUS_COLORS = {
  pending: '#f59e0b',
  in_progress: '#0D9488',
  done: '#10b981',
  escalated: '#ef4444',
  unknown: '#64748b',
};

function DonutChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  let cumulative = 0;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 28;

  const segments = data.map((d) => {
    const pct = d.count / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });

  const polarToXY = (pct) => {
    const angle = pct * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const describeArc = (startPct, endPct) => {
    const start = polarToXY(startPct);
    const end = polarToXY(endPct);
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <div className="donut-wrap">
      <svg width={size} height={size}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(seg.start, seg.start + seg.pct)}
            fill="none"
            stroke={STATUS_COLORS[seg.status] || '#64748b'}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary)">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">
          total items
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: STATUS_COLORS[seg.status] || '#64748b' }} />
            <span className="legend-label">{seg.status}</span>
            <span className="legend-count">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Analytics Page ───────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;
  if (error) return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Analytics</h1></div>
      <div className="glass-card" style={{ color: 'var(--status-escalated)', padding: 'var(--space-xl)' }}>
        ⚠️ Failed to load analytics: {error}
      </div>
    </div>
  );

  const s = data?.summary || {};
  const owners = data?.owner_stats || [];
  const weeklyMeetings = data?.meetings_per_week || [];
  const statusBreakdown = data?.status_breakdown || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Completion rates, owner performance, and meeting trends</p>
      </div>

      {/* Top KPI cards */}
      <div className="stats-grid stagger-children" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-done-bg)' }}>
            <TrendingUp size={22} color="var(--status-done)" />
          </div>
          <div>
            <div className="stat-value">{s.completion_rate_pct ?? 0}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}>
            <FileAudio size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <div className="stat-value">{s.total_meetings ?? 0}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-pending-bg)' }}>
            <ListChecks size={22} color="var(--status-pending)" />
          </div>
          <div>
            <div className="stat-value">{s.total_action_items ?? 0}</div>
            <div className="stat-label">Total Action Items</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--status-escalated-bg)' }}>
            <AlertTriangle size={22} color="var(--status-escalated)" />
          </div>
          <div>
            <div className="stat-value">{s.escalation_rate_pct ?? 0}%</div>
            <div className="stat-label">Escalation Rate</div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="analytics-charts-row">
        {/* Weekly meetings bar chart */}
        <div className="glass-card analytics-chart-card">
          <div className="analytics-card-header">
            <BarChart3 size={18} color="var(--accent-secondary)" />
            <h3>Meetings per Week</h3>
          </div>
          <BarChart
            data={weeklyMeetings}
            labelKey="week"
            valueKey="count"
            color="var(--accent-primary)"
          />
        </div>

        {/* Status donut */}
        <div className="glass-card analytics-chart-card">
          <div className="analytics-card-header">
            <CheckCircle2 size={18} color="var(--status-done)" />
            <h3>Action Item Status</h3>
          </div>
          <DonutChart data={statusBreakdown} />
        </div>
      </div>

      {/* Owner leaderboard */}
      {owners.length > 0 && (
        <div className="glass-card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="analytics-card-header" style={{ marginBottom: 'var(--space-lg)' }}>
            <Users size={18} color="var(--accent-secondary)" />
            <h3>Owner Performance</h3>
          </div>
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Pending</th>
                  <th>Escalated</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o, i) => (
                  <tr key={i}>
                    <td className="owner-name">{o.owner}</td>
                    <td>{o.total}</td>
                    <td style={{ color: 'var(--status-done)' }}>{o.done}</td>
                    <td style={{ color: 'var(--status-pending)' }}>{o.pending}</td>
                    <td style={{ color: 'var(--status-escalated)' }}>{o.escalated}</td>
                    <td>
                      <div className="completion-bar-wrap">
                        <div
                          className="completion-bar-fill"
                          style={{
                            width: `${o.completion_rate_pct}%`,
                            background:
                              o.completion_rate_pct >= 80
                                ? 'var(--status-done)'
                                : o.completion_rate_pct >= 50
                                ? '#f59e0b'
                                : 'var(--status-escalated)',
                          }}
                        />
                        <span className="completion-bar-label">{o.completion_rate_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .analytics-charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-xl);
          margin-bottom: var(--space-xl);
        }
        @media (max-width: 900px) {
          .analytics-charts-row { grid-template-columns: 1fr; }
        }
        .analytics-chart-card {
          padding: var(--space-xl);
        }
        .analytics-card-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }
        .analytics-card-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        .chart-empty {
          color: var(--text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: var(--space-xl);
        }

        /* Bar Chart */
        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 160px;
          padding-top: var(--space-sm);
        }
        .bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 4px;
        }
        .bar-value {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .bar-fill {
          width: 100%;
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          transition: height 0.5s ease;
          opacity: 0.85;
        }
        .bar-fill:hover { opacity: 1; }
        .bar-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }

        /* Donut */
        .donut-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-xl);
          flex-wrap: wrap;
        }
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.85rem;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-label {
          flex: 1;
          color: var(--text-secondary);
          text-transform: capitalize;
        }
        .legend-count {
          font-weight: 600;
          color: var(--text-primary);
          min-width: 24px;
          text-align: right;
        }

        /* Owner table */
        .owner-table-wrap {
          overflow-x: auto;
        }
        .owner-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .owner-table th {
          text-align: left;
          padding: var(--space-sm) var(--space-md);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--glass-border);
        }
        .owner-table td {
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .owner-table tr:last-child td { border-bottom: none; }
        .owner-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .completion-bar-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .completion-bar-fill {
          height: 6px;
          border-radius: 3px;
          min-width: 4px;
          max-width: 80px;
          transition: width 0.4s ease;
        }
        .completion-bar-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 36px;
        }
      `}</style>
    </div>
  );
}
