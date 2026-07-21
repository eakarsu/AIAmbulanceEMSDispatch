-- Additive, tenant-scoped workflow schema. Apply explicitly with scripts/migrate.sh.
BEGIN;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'medic';

CREATE TABLE IF NOT EXISTS governed_dispatch_workflows (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  status TEXT NOT NULL CHECK (status IN ('received','validated','recommendation_ready','dispatcher_review','dispatched','closed','cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  idempotency_key TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS governed_dispatch_workflows_tenant_idempotency_idx
  ON governed_dispatch_workflows(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS governed_dispatch_workflows_tenant_status_idx ON governed_dispatch_workflows(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS governed_dispatch_workflows_approvals (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES governed_dispatch_workflows(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  target_status TEXT NOT NULL CHECK (target_status = 'dispatched'),
  workflow_version INTEGER NOT NULL CHECK (workflow_version > 0),
  attestation TEXT NOT NULL CHECK (length(trim(attestation)) >= 10),
  evidence_ids JSONB NOT NULL CHECK (jsonb_typeof(evidence_ids) = 'array' AND jsonb_array_length(evidence_ids) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS governed_dispatch_workflows_approvals_tenant_idx ON governed_dispatch_workflows_approvals(tenant_id, workflow_id);

CREATE TABLE IF NOT EXISTS governed_dispatch_workflows_sync_events (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES governed_dispatch_workflows(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('cad','avl_gps','gis_traffic','hospital_status','radio_messaging','audit_export')),
  external_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('succeeded','failed','retrying')),
  error_code TEXT,
  retry_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS governed_dispatch_workflows_sync_tenant_idx ON governed_dispatch_workflows_sync_events(tenant_id, workflow_id, created_at DESC);

CREATE TABLE IF NOT EXISTS governed_dispatch_workflows_audit (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES governed_dispatch_workflows(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS governed_dispatch_workflows_audit_tenant_idx ON governed_dispatch_workflows_audit(tenant_id, workflow_id, created_at DESC);

CREATE OR REPLACE FUNCTION governed_dispatch_workflows_audit_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit records are immutable';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS governed_dispatch_workflows_audit_immutable_trigger ON governed_dispatch_workflows_audit;
CREATE TRIGGER governed_dispatch_workflows_audit_immutable_trigger
  BEFORE UPDATE OR DELETE ON governed_dispatch_workflows_audit
  FOR EACH ROW EXECUTE FUNCTION governed_dispatch_workflows_audit_immutable();

DROP TRIGGER IF EXISTS governed_dispatch_workflows_approvals_immutable_trigger ON governed_dispatch_workflows_approvals;
CREATE TRIGGER governed_dispatch_workflows_approvals_immutable_trigger
  BEFORE UPDATE OR DELETE ON governed_dispatch_workflows_approvals
  FOR EACH ROW EXECUTE FUNCTION governed_dispatch_workflows_audit_immutable();
DROP TRIGGER IF EXISTS governed_dispatch_workflows_sync_immutable_trigger ON governed_dispatch_workflows_sync_events;
CREATE TRIGGER governed_dispatch_workflows_sync_immutable_trigger
  BEFORE UPDATE OR DELETE ON governed_dispatch_workflows_sync_events
  FOR EACH ROW EXECUTE FUNCTION governed_dispatch_workflows_audit_immutable();

COMMIT;
