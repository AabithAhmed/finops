import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiLogin } from '../api/springApi';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login({ email, role: data.role, token: data.token });
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h1 className="login-title">FinOps Sentinel</h1>
          <p className="login-sub">Payment operations intelligence platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@finops.io"
              required
              autoFocus />
            
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required />
            
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary full-width"
            style={{ marginTop: '1.25rem', justifyContent: 'center', padding: '0.75rem' }}
            disabled={loading}>
            
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>);

}