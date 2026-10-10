import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchIncidentDetail } from '../api/springApi';
import { EvidencePanel } from '../components/EvidencePanel';
import { StatusControls } from '../components/StatusControls';







export function IncidentDetailPage({ incidentId, onBack }) {
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchIncidentDetail(user.token, incidentId);
      setIncident(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, incidentId]);

  useEffect(() => {load();}, [load]);

  if (loading) {
    return <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>Loading incident...</div>;
  }
  if (!incident) {
    return <div style={{ padding: '3rem', color: 'var(--danger)' }}>Incident not found.</div>;
  }

  const code = incident.incidentCode || incident.incident_code || '';
  const summary = incident.rootCauseSummary || incident.root_cause_summary;
  const confidence = incident.rootCauseConfidence ?? incident.root_cause_confidence;
  const timeline = incident.timeline || [];
  const anomalies = incident.anomalies || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
            ← Back to incidents
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title text-mono">{code}</h1>
            <span className={`severity-badge severity-${incident.severity}`}>{incident.severity}</span>
            <span className={`status-badge status-${incident.status}`}>{incident.status}</span>
          </div>
          <p className="page-sub" style={{ marginTop: '0.25rem' }}>
            Detected: {new Date(incident.createdAt || incident.created_at || '').toLocaleString()}
          </p>
        </div>

        {/* Status transition controls (operator/admin only) */}
        <StatusControls incident={incident} onUpdated={setIncident} />
      </div>

      <div className="section-gap">
        {/* AI Summary panel */}
        {summary &&
        <div className="ai-summary-box">
            <div className="ai-summary-header">
              <span className="ai-label">🤖 AI Root Cause Summary</span>
              {confidence !== undefined && confidence !== null &&
            <span
              className="confidence-badge"
              title="Confidence is computed from structured evidence — not from the LLM">
              
                  {Math.round(Number(confidence) * 100)}% confidence
                </span>
            }
            </div>
            <p className="ai-summary-text">{summary}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              ℹ️ Confidence score computed from evidence heuristics — independent of the LLM narrative above.
            </p>
          </div>
        }

        {/* Evidence panel */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <span className="card-title">Anomaly Evidence</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{anomalies.length} correlated anomalies</span>
          </div>
          <EvidencePanel anomalies={anomalies} />
        </div>

        {/* Timeline */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <span className="card-title">Incident Timeline</span>
          </div>
          {timeline.length === 0 ?
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>No timeline entries.</p> :

          <div className="timeline">
              {timeline.map((entry, i) => {
              const desc = entry.eventDescription || entry.event_description || '';
              const time = new Date(entry.occurredAt || entry.occurred_at || '').toLocaleString();
              return (
                <div key={i} className="timeline-entry">
                    <div className="timeline-time">{time}</div>
                    <div className="timeline-desc">{desc}</div>
                  </div>);

            })}
            </div>
          }
        </div>
      </div>
    </div>);

}