import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: false } 
});

export async function insertEvent(event) {
  await pool.query(
    `INSERT INTO events (event_id, event_type, payment_id, amount, currency, gateway, latency_ms, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (event_id) DO NOTHING`,
    [
    event.eventId,
    event.eventType,
    event.paymentId,
    event.amount,
    event.currency,
    event.gateway,
    event.latencyMs,
    event.occurredAt]

  );
}

export async function getRecentEvents(limit = 20) {
  const result = await pool.query(
    `SELECT * FROM events ORDER BY occurred_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getEventWindow(seconds = 60) {
  const result = await pool.query(
    `SELECT * FROM events WHERE occurred_at > NOW() - INTERVAL '${seconds} seconds' ORDER BY occurred_at ASC`
  );
  return result.rows;
}