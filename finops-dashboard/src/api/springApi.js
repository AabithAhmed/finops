/**
 * REST API client for the Spring Boot service.
 * All requests attach the Authorization: Bearer <token> header.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const NODE_BASE = import.meta.env.VITE_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3000';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json();
}

export async function apiRegister(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export async function fetchRecentEvents(token, n = 50) {
  const res = await fetch(`${API_BASE}/api/events/recent?n=${n}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function fetchIncidents(
token,
params = {})
{
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.severity) qs.set('severity', params.severity);
  if (params.page !== undefined) qs.set('page', String(params.page));

  const res = await fetch(`${API_BASE}/api/incidents?${qs}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchIncidentDetail(token, id) {
  const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Incident not found');
  return res.json();
}

export async function patchIncidentStatus(token, id, status) {
  const res = await fetch(`${API_BASE}/api/incidents/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Status transition failed');
  }
  return res.json();
}

export async function injectIncident(durationSeconds = 60) {
  const res = await fetch(`${NODE_BASE}/simulator/inject-incident`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationSeconds })
  });
  if (!res.ok) throw new Error('Failed to inject incident');
  return res.json();
}