import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine } from
'recharts';






function getEventType(e) {
  return e.eventType || e.event_type || 'PAYMENT_SUCCESS';
}

function getOccurredAt(e) {
  return e.occurredAt || e.occurred_at || '';
}

/**
 * Bucket the last 10 minutes of events into 30-second windows,
 * compute failure rate per bucket, and return as chart data.
 */
function buildChartData(events) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const bucketMs = 30 * 1000; // 30-second buckets

  const buckets = {};
  const numBuckets = windowMs / bucketMs;

  for (let i = 0; i < numBuckets; i++) {
    const bucketTime = now - windowMs + i * bucketMs;
    buckets[bucketTime] = { total: 0, failures: 0 };
  }

  events.forEach((e) => {
    const t = new Date(getOccurredAt(e)).getTime();
    if (!t || t < now - windowMs) return;
    const bucketTime = Math.floor((t - (now - windowMs)) / bucketMs) * bucketMs + (now - windowMs);
    const rounded = Math.floor(bucketTime / bucketMs) * bucketMs;
    if (buckets[rounded] === undefined) return;
    buckets[rounded].total++;
    if (getEventType(e) !== 'PAYMENT_SUCCESS') buckets[rounded].failures++;
  });

  return Object.entries(buckets).
  sort(([a], [b]) => Number(a) - Number(b)).
  map(([ts, { total, failures }]) => ({
    time: new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    failureRate: total > 0 ? parseFloat((failures / total * 100).toFixed(1)) : 0
  }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '0.5rem 0.875rem',
        fontFamily: 'var(--mono)',
        fontSize: '0.75rem'
      }}>
        <div style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>
          {payload[0].value}% failure
        </div>
      </div>);

  }
  return null;
};

export function FailureRateChart({ events }) {
  const data = useMemo(() => buildChartData(events), [events]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--mono)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd" />
        
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--mono)' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`} />
        
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={10} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="failureRate"
          stroke="var(--danger)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--danger)' }} />
        
      </LineChart>
    </ResponsiveContainer>);

}