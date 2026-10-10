-- FinOps Sentinel AI — Supabase schema
-- Run in the Supabase SQL editor. Enable pgvector first.

create extension if not exists vector;

-- ==========================================================
-- Users (minimal auth; Supabase auth.users can replace this
-- if you use Supabase Auth directly instead of custom login)
-- ==========================================================
create table if not exists app_users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null,
    role text not null default 'viewer' check (role in ('admin', 'operator', 'viewer')),
    created_at timestamptz not null default now()
);

-- ==========================================================
-- Raw payment events (written by the Node.js realtime service)
-- ==========================================================
create table if not exists events (
    id bigserial primary key,
    event_id text unique not null,
    event_type text not null check (event_type in ('PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_TIMEOUT')),
    payment_id text not null,
    amount numeric(12,2) not null,
    currency text not null default 'INR',
    gateway text not null,
    latency_ms integer not null,
    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_events_occurred_at on events (occurred_at desc);
create index if not exists idx_events_type on events (event_type);

-- ==========================================================
-- Anomalies detected by the Python AI service
-- ==========================================================
create table if not exists anomalies (
    id bigserial primary key,
    anomaly_type text not null,          -- e.g. 'FAILURE_RATE_SPIKE', 'LATENCY_SPIKE'
    metric_name text not null,
    metric_value numeric not null,
    baseline_value numeric not null,
    deviation_pct numeric not null,
    anomaly_score numeric not null,      -- Isolation Forest score
    evidence jsonb not null,             -- structured evidence used for explainability
    window_start timestamptz not null,
    window_end timestamptz not null,
    created_at timestamptz not null default now()
);

-- ==========================================================
-- Incidents (correlated groups of anomalies)
-- ==========================================================
create table if not exists incidents (
    id bigserial primary key,
    incident_code text unique not null,   -- e.g. 'INC-2026-001'
    severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status text not null default 'DETECTED'
        check (status in ('DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED')),
    affected_services text[] not null default '{}',
    root_cause_summary text,              -- LLM-generated narrative
    root_cause_confidence numeric,        -- evidence-based score, computed, not from the LLM
    embedding vector(384),                -- for similar-incident retrieval (stretch feature)
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

-- ==========================================================
-- Incident <-> anomaly link table (one incident, many correlated anomalies)
-- ==========================================================
create table if not exists incident_anomalies (
    incident_id bigint references incidents(id) on delete cascade,
    anomaly_id bigint references anomalies(id) on delete cascade,
    primary key (incident_id, anomaly_id)
);

-- ==========================================================
-- Incident timeline / status transitions (for the lifecycle view)
-- ==========================================================
create table if not exists incident_events (
    id bigserial primary key,
    incident_id bigint references incidents(id) on delete cascade,
    event_description text not null,
    occurred_at timestamptz not null default now()
);

-- Helpful view for the dashboard's rolling baseline calculations
create or replace view rolling_failure_rate as
select
    date_trunc('minute', occurred_at) as minute_bucket,
    count(*) filter (where event_type = 'PAYMENT_FAILED') as failures,
    count(*) as total,
    round(
        100.0 * count(*) filter (where event_type = 'PAYMENT_FAILED') / nullif(count(*), 0),
        2
    ) as failure_rate_pct
from events
group by 1
order by 1 desc;
