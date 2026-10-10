import { useMemo, useState } from 'react';
import { useEventStream } from '../hooks/useEventStream';
import { EventFeed } from '../components/EventFeed';
import { FailureRateChart } from '../components/FailureRateChart';
import { injectIncident } from '../api/springApi';


function getEventType(e) {
  return e.eventType || e.event_type || 'PAYMENT_SUCCESS';
}

export function DashboardPage() {
  const { events, status } = useEventStream(50);
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);

  // Compute live stats from the streamed events
  const stats = useMemo(() => {
    const lastHour = events; // all events in the buffer (up to 50)
    const failures = lastHour.filter((e) => getEventType(e) !== 'PAYMENT_SUCCESS');
    const failureRate = lastHour.length > 0 ?
    (failures.length / lastHour.length * 100).toFixed(1) :
    '0.0';

    return {
      eventCount: lastHour.length,
      failureRate,
      failures: failures.length
    };
  }, [events]);

  const handleInjectIncident = async () => {
    setInjecting(true);
    try {
      await injectIncident(60);
      setInjected(true);
      setTimeout(() => setInjected(false), 5000);
    } catch (e) {
      console.error('Failed to inject incident:', e);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Live Dashboard</h1>
          <p className="page-sub">Real-time payment event monitoring</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Connection status indicator */}
          <div className={`connection-status status-${status}`}>
            <div className="status-dot" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {status === 'connected' ? 'Live' : status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
            </span>
          </div>

          {/* Demo trigger — the star of the live demo */}
          <button
            id="inject-incident-btn"
            className="inject-btn"
            onClick={handleInjectIncident}
            disabled={injecting}>
            
            {injected ? '⚡ Incident Active!' : injecting ? 'Triggering...' : '🔴 Inject Incident'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Events in buffer</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.eventCount}</div>
          <div className="stat-sub">last ~50 events</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failure rate</div>
          <div className="stat-value" style={{ color: Number(stats.failureRate) > 10 ? 'var(--danger)' : 'var(--success)' }}>
            {stats.failureRate}%
          </div>
          <div className="stat-sub">{stats.failures} failed events</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stream status</div>
          <div className="stat-value" style={{ fontSize: '1.2rem', marginTop: '0.5rem', color: status === 'connected' ? 'var(--success)' : 'var(--warning)' }}>
            {status.toUpperCase()}
          </div>
          <div className="stat-sub">WebSocket to Node service</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Live event feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Live Event Stream</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {events.length} events
            </span>
          </div>
          <EventFeed events={events} />
        </div>

        {/* Failure rate chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Failure Rate — Last 10 min</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>30s buckets</span>
          </div>
          <FailureRateChart events={events} />
          <div style={{ marginTop: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <span className="card-title">Recent Feed</span>
            </div>
            <EventFeed events={events.slice(0, 10)} />
          </div>
        </div>
      </div>
    </div>);

}