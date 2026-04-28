ALTER TABLE telemetry_sessions
ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

UPDATE telemetry_sessions
SET firebase_uid = 'legacy-unassigned'
WHERE firebase_uid IS NULL;

ALTER TABLE telemetry_sessions
ALTER COLUMN firebase_uid SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_telemetry_sessions_firebase_uid
ON telemetry_sessions (firebase_uid);

CREATE INDEX IF NOT EXISTS ix_telemetry_sessions_firebase_uid_created_at
ON telemetry_sessions (firebase_uid, created_at DESC);
