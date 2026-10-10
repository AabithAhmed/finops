





function getEventType(e) {
  return e.eventType || e.event_type || 'PAYMENT_SUCCESS';
}

function getAmount(e) {
  return `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function getLatency(e) {
  const ms = e.latencyMs ?? e.latency_ms ?? 0;
  return `${ms}ms`;
}

function getGateway(e) {
  return (e.gateway || '').replace('_simulated', '');
}

function badgeClass(type) {
  if (type === 'PAYMENT_SUCCESS') return 'badge-success';
  if (type === 'PAYMENT_TIMEOUT') return 'badge-timeout';
  return 'badge-failed';
}

export function EventFeed({ events }) {
  return (
    <div className="event-feed">
      {events.length === 0 &&
      <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          Waiting for events...
        </div>
      }
      {events.map((e, i) => {
        const type = getEventType(e);
        return (
          <div key={e.eventId || e.event_id || i} className="event-row">
            <span className={`event-type-badge ${badgeClass(type)}`}>
              {type.replace('PAYMENT_', '')}
            </span>
            <span className="event-amount">{getAmount(e)}</span>
            <span className="event-gateway">{getGateway(e)}</span>
            <span className="event-latency">{getLatency(e)}</span>
          </div>);

      })}
    </div>);

}