-- Additive only. Execute exclusively in a separately provisioned V2 development database.
CREATE TABLE IF NOT EXISTS dc2_snapshots (
 room_id UUID NOT NULL REFERENCES dc2_rooms(id),
 revision INTEGER NOT NULL CHECK (revision > 0),
 state JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(room_id,revision)
);
CREATE TABLE IF NOT EXISTS dc2_migrations (
 version VARCHAR(80) PRIMARY KEY,
 checksum CHAR(64) NOT NULL,
 applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Snapshot rows are append-only in application code; no UPDATE or DELETE is issued.
-- Legacy dc2_contributions and dc_* tables remain untouched.
