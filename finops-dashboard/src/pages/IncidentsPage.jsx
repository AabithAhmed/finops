import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchIncidents } from '../api/springApi';






export function IncidentsPage({ onSelectIncident }) {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchIncidents(user.token, {
        status: statusFilter || undefined,
        severity: severityFilter || undefined
      });
      // Spring Boot returns a Page object
      setIncidents(data.content || data);
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, severityFilter]);

  useEffect(() => {load();}, [load]);

  const code = (i) => i.incidentCode || i.incident_code || '';
  const createdAt = (i) => new Date(i.createdAt || i.created_at || '').toLocaleString();
  const services = (i) => (i.affectedServices || i.affected_services || []).join(', ') || '—';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Incidents</h1>
        <p className="page-sub">Correlated payment anomaly incidents</p>
      </div>

      <div className="filter-row" style={{ marginBottom: '1rem' }}>
        <select
          id="status-filter"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          
          <option value="">All statuses</option>
          {['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'].map((s) =>
          <option key={s} value={s}>{s}</option>
          )}
        </select>

        <select
          id="severity-filter"
          className="filter-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}>
          
          <option value="">All severities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) =>
          <option key={s} value={s}>{s}</option>
          )}
        </select>

        <button className="btn btn-ghost" onClick={load} style={{ fontSize: '0.8rem' }}>
          ↻ Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ?
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> :
        incidents.length === 0 ?
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No incidents yet — click "Inject Incident" on the dashboard to trigger one.
          </div> :

        <table className="incidents-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Affected</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) =>
            <tr key={incident.id} onClick={() => onSelectIncident(incident.id)}>
                  <td><span className="incident-code">{code(incident)}</span></td>
                  <td>
                    <span className={`severity-badge severity-${incident.severity}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${incident.status}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{services(incident)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--mono)' }}>{createdAt(incident)}</td>
                </tr>
            )}
            </tbody>
          </table>
        }
      </div>
    </div>);

}