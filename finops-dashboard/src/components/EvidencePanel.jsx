





const METRIC_LABELS = {
  failure_rate: 'Failure Rate',
  latency_ms: 'Latency',
  mean_latency: 'Latency',
  event_volume: 'Event Volume'
};

const METRIC_UNITS = {
  failure_rate: '%',
  latency_ms: 'ms',
  mean_latency: 'ms',
  event_volume: 'events'
};

/**
 * Renders anomaly evidence as metric cards — NOT a raw JSON dump.
 * Each card shows: metric name, current value vs baseline, % deviation.
 *
 * This is what the dashboard spec requires:
 * "render the evidence JSON as readable metric cards, NOT a raw JSON dump"
 */
export function EvidencePanel({ anomalies }) {
  if (!anomalies || anomalies.length === 0) {
    return <p className="text-muted" style={{ fontSize: '0.875rem' }}>No anomaly evidence available.</p>;
  }

  // Flatten all evidence entries from all linked anomalies
  const entries = [];

  anomalies.forEach((a) => {
    const evidence = a.evidence || {};
    Object.entries(evidence).forEach(([key, data]) => {
      if (data && typeof data === 'object' && 'value' in data) {
        entries.push({
          key,
          value: Number(data.value),
          baseline: Number(data.baseline),
          deviation: Number(data.deviation_pct)
        });
      }
    });
  });

  if (entries.length === 0) {
    return <p className="text-muted" style={{ fontSize: '0.875rem' }}>Evidence data unavailable.</p>;
  }

  return (
    <div className="evidence-grid">
      {entries.map((entry, i) => {
        const label = METRIC_LABELS[entry.key] || entry.key;
        const unit = METRIC_UNITS[entry.key] || '';
        return (
          <div key={i} className="evidence-card">
            <div className="evidence-metric">{label}</div>
            <div className="evidence-value">
              {entry.value.toLocaleString()}{unit}
            </div>
            <div className="evidence-baseline">
              Baseline: {entry.baseline.toLocaleString()}{unit}
            </div>
            <div className="evidence-deviation">
              ↑ {entry.deviation.toLocaleString()}% deviation
            </div>
          </div>);

      })}
    </div>);

}