-- -- ============================================================
-- -- CA Firm Internal App - PostgreSQL Schema (Neon)
-- -- Run this file once to set up all tables
-- -- ============================================================

-- -- Users table (Firebase UID as primary identifier)
-- CREATE TABLE IF NOT EXISTS users (
--   id           SERIAL PRIMARY KEY,
--   firebase_uid VARCHAR(128) UNIQUE NOT NULL,    -- Firebase UID
--   email        VARCHAR(255) UNIQUE NOT NULL,
--   full_name    VARCHAR(255) NOT NULL,
--   role         VARCHAR(20)  NOT NULL DEFAULT 'employee', -- 'employee' | 'admin'
--   designation  VARCHAR(255),
--   department   VARCHAR(255),
--   phone        VARCHAR(20),
--   avatar_url   TEXT,                             -- Firebase Storage URL
--   created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Services / Skills table
-- CREATE TABLE IF NOT EXISTS services (
--   id          SERIAL PRIMARY KEY,
--   title       VARCHAR(255) NOT NULL,
--   description TEXT,
--   category    VARCHAR(100),
--   created_by  VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE SET NULL,
--   created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Employee ↔ Service (who KNOWS what)
-- CREATE TABLE IF NOT EXISTS employee_services (
--   id           SERIAL PRIMARY KEY,
--   firebase_uid VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE CASCADE,
--   service_id   INT         REFERENCES services(id) ON DELETE CASCADE,
--   proficiency  VARCHAR(50) DEFAULT 'beginner', -- beginner | intermediate | expert
--   added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   UNIQUE(firebase_uid, service_id)
-- );

-- -- Learning interest (who WANTS to learn what)
-- CREATE TABLE IF NOT EXISTS learning_interests (
--   id           SERIAL PRIMARY KEY,
--   firebase_uid VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE CASCADE,
--   service_id   INT         REFERENCES services(id) ON DELETE CASCADE,
--   status       VARCHAR(50) DEFAULT 'interested', -- interested | in_progress | completed
--   added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   UNIQUE(firebase_uid, service_id)
-- );

-- -- Resources / Learning materials
-- CREATE TABLE IF NOT EXISTS resources (
--   id           SERIAL PRIMARY KEY,
--   title        VARCHAR(255) NOT NULL,
--   description  TEXT,
--   url          TEXT NOT NULL,                   -- YouTube / Drive / External link
--   resource_type VARCHAR(50) DEFAULT 'video',    -- video | article | pdf | other
--   service_id   INT REFERENCES services(id) ON DELETE SET NULL,
--   added_by     VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE SET NULL,
--   created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ─── Indexes ────────────────────────────────────────────────────────────────
-- CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
-- CREATE INDEX IF NOT EXISTS idx_employee_services_uid ON employee_services(firebase_uid);
-- CREATE INDEX IF NOT EXISTS idx_learning_interests_uid ON learning_interests(firebase_uid);
-- CREATE INDEX IF NOT EXISTS idx_resources_service ON resources(service_id);












-- ============================================================
-- CA Firm Internal App - PostgreSQL Schema (Neon)
-- Run this file once to set up all tables
-- ============================================================

-- Users table (Firebase UID as primary identifier)
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  full_name    VARCHAR(255) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'employee',
  designation  VARCHAR(255),
  department   VARCHAR(255),
  phone        VARCHAR(20),
  avatar_url   TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services / Skills table
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  created_by  VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee ↔ Service (who KNOWS what)
CREATE TABLE IF NOT EXISTS employee_services (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE CASCADE,
  service_id   INT         REFERENCES services(id) ON DELETE CASCADE,
  proficiency  VARCHAR(50) DEFAULT 'beginner',
  added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(firebase_uid, service_id)
);

-- Learning interest (who WANTS to learn what)
CREATE TABLE IF NOT EXISTS learning_interests (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE CASCADE,
  service_id   INT         REFERENCES services(id) ON DELETE CASCADE,
  status       VARCHAR(50) DEFAULT 'interested',
  added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(firebase_uid, service_id)
);

-- Resources / Learning materials
CREATE TABLE IF NOT EXISTS resources (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  url           TEXT NOT NULL,                  -- YouTube / Drive / External link
  pdf_url       TEXT,                           -- Google Drive PDF link (used when type=pdf OR article with attached PDF)
  resource_type VARCHAR(50) DEFAULT 'video',    -- video | article | pdf | other
  service_id    INT REFERENCES services(id) ON DELETE SET NULL,
  added_by      VARCHAR(128) REFERENCES users(firebase_uid) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid    ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_employee_services_uid ON employee_services(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_learning_interests_uid ON learning_interests(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_resources_service     ON resources(service_id);