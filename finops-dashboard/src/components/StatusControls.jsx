import { useState } from 'react';

import { patchIncidentStatus } from '../api/springApi';
import { useAuth } from '../context/AuthContext';






// Valid next statuses for each current status (mirrors Spring Boot logic)
const NEXT_STATUSES = {
  DETECTED: ['OPEN'],
  OPEN: ['ACKNOWLEDGED', 'RESOLVED'],
  ACKNOWLEDGED: ['INVESTIGATING', 'RESOLVED'],
  INVESTIGATING: ['MITIGATED', 'RESOLVED'],
  MITIGATED: ['RESOLVED'],
  RESOLVED: []
};

/**
 * Renders transition buttons for the incident status workflow.
 * Only visible to OPERATOR and ADMIN roles.
 * Disabled/hidden for VIEWER role.
 */
export function StatusControls({ incident, onUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  // Viewers cannot transition status — hide entirely
  if (!user || user.role === 'viewer') return null;

  const currentStatus = incident.status || incident.status;
  const nextStatuses = NEXT_STATUSES[currentStatus] || [];

  if (nextStatuses.length === 0) {
    return <span className="text-muted" style={{ fontSize: '0.8rem' }}>Incident resolved</span>;
  }

  const handleTransition = async (newStatus) => {
    setLoading(newStatus);
    setError(null);
    try {
      const updated = await patchIncidentStatus(user.token, incident.id, newStatus);
      onUpdated(updated);
    } catch (e) {
      setError(e.message || 'Transition failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {nextStatuses.map((status) =>
        <button
          key={status}
          id={`status-btn-${status.toLowerCase()}`}
          className={status === 'RESOLVED' ? 'btn btn-ghost' : 'btn btn-primary'}
          onClick={() => handleTransition(status)}
          disabled={loading !== null}>
          
            {loading === status ? 'Updating...' : `→ ${status}`}
          </button>
        )}
      </div>
      {error && <div className="form-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
    </div>);

}