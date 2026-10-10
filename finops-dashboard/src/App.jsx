import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import './index.css';



function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectIncident = (id) => {
    setSelectedIncidentId(id);
    setCurrentPage('incident-detail');
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <a className="navbar-brand" href="#" onClick={() => setCurrentPage('dashboard')}>
          FinOps <span>Sentinel</span>
        </a>
        <div className="navbar-nav">
          <a
            href="#"
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}>
            
            Dashboard
          </a>
          <a
            href="#"
            className={`nav-link ${currentPage === 'incidents' || currentPage === 'incident-detail' ? 'active' : ''}`}
            onClick={() => setCurrentPage('incidents')}>
            
            Incidents
          </a>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {user?.email} · {user?.role}
          </span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
            onClick={logout}>
            
            Sign out
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'incidents' &&
        <IncidentsPage onSelectIncident={handleSelectIncident} />
        }
        {currentPage === 'incident-detail' && selectedIncidentId !== null &&
        <IncidentDetailPage
          incidentId={selectedIncidentId}
          onBack={() => setCurrentPage('incidents')} />

        }
      </main>
    </div>);

}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>);

}