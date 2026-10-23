-- Required extensions for the haversine/GIST spatial matching (ll_to_earth)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
-- ============================================================================
-- Emergency Home Services Auto-Dispatch System - PostgreSQL Schema
-- ============================================================================

-- Users: single auth table with role-based access (customer / technician / admin)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('customer','technician','admin')),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT         NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Customers: profile extension of user
CREATE TABLE IF NOT EXISTS customers (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address           TEXT,
  default_lat       DOUBLE PRECISION,
  default_lng       DOUBLE PRECISION,
  emergency_contact VARCHAR(20)
);

-- Technicians: profile + live state (location, availability, skills)
CREATE TABLE IF NOT EXISTS technicians (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  skill_category      VARCHAR(50)    NOT NULL,
  current_lat         DOUBLE PRECISION NOT NULL,
  current_lng         DOUBLE PRECISION NOT NULL,
  availability_status VARCHAR(20)    NOT NULL DEFAULT 'offline'
                      CHECK (availability_status IN ('online','available','on_job','offline')),
  rating              NUMERIC(3,2)   NOT NULL DEFAULT 5.00,
  jobs_completed      INTEGER        NOT NULL DEFAULT 0,
  avg_speed_kmh       INTEGER        NOT NULL DEFAULT 32,
  hourly_rate         NUMERIC(10,2)  NOT NULL DEFAULT 0
);

-- Service categories the platform supports
CREATE TABLE IF NOT EXISTS service_categories (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  label       VARCHAR(100) NOT NULL,
  icon        VARCHAR(20),
  description TEXT,
  base_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_emergency_supported BOOLEAN NOT NULL DEFAULT TRUE
);

-- Service requests raised by customers
CREATE TABLE IF NOT EXISTS service_requests (
  id                    SERIAL PRIMARY KEY,
  customer_id           INTEGER      NOT NULL REFERENCES customers(id),
  category_id           INTEGER      NOT NULL REFERENCES service_categories(id),
  title                 VARCHAR(200),
  description           TEXT,
  image_url             TEXT,
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  address               TEXT,
  priority              VARCHAR(10)  NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('emergency','high','normal','low')),
  status                VARCHAR(30)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','assigned','on_the_way','in_progress',
                                          'completed','cancelled','reassigned')),
  assigned_technician_id INTEGER REFERENCES technicians(id),
  requested_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  assigned_at           TIMESTAMPTZ,
  accepted_at           TIMESTAMPTZ,
  eta_seconds           INTEGER,      -- expected travel time at assignment
  distance_km           DOUBLE PRECISION, -- distance at assignment
  started_at            TIMESTAMPTZ,  -- work physically started
completed_at          TIMESTAMPTZ,
  response_time_seconds INTEGER,      -- requested_at -> accepted_at (KPI)
  feedback_rating       INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment      TEXT
);

-- Every dispatch decision (assigned / notified / accepted / declined / timed_out / reassigned)
CREATE TABLE IF NOT EXISTS dispatch_events (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  technician_id INTEGER REFERENCES technicians(id),
  attempt       INTEGER NOT NULL DEFAULT 1,
  event         VARCHAR(30) NOT NULL
                CHECK (event IN ('assigned','notified','accepted','declined','timed_out','reassigned','cancelled')),
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full status-change history for every request
CREATE TABLE IF NOT EXISTS status_logs (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  actor      VARCHAR(20),
  note       TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technicians' live GPS ping history (tracking trail)
CREATE TABLE IF NOT EXISTS technician_location_logs (
  id              SERIAL PRIMARY KEY,
  technician_id   INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  on_job_request_id INTEGER REFERENCES service_requests(id),
  position_time   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generic system activity log for admin audit
CREATE TABLE IF NOT EXISTS system_logs (
  id         SERIAL PRIMARY KEY,
  log_type   VARCHAR(50),
  message    TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_requests_status        ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_technician    ON service_requests(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_requests_customer      ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_requested_at  ON service_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_technicians_skill      ON technicians(skill_category);
CREATE INDEX IF NOT EXISTS idx_technicians_avail      ON technicians(availability_status);
-- GIST spatial index on technician live coordinates (avoids full-table radius scans)
CREATE INDEX IF NOT EXISTS idx_technicians_location   ON technicians USING GIST (ll_to_earth(current_lat, current_lng));
CREATE INDEX IF NOT EXISTS idx_dispatch_request       ON dispatch_events(request_id, attempt);
CREATE INDEX IF NOT EXISTS idx_location_technician    ON technician_location_logs(technician_id, position_time DESC);