# Completeness Review: AIAmbulanceEMSDispatch

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad emergency medical dispatch surface (107 source files and 37 route modules), but the static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path for ingest validated incidents, unit status, capabilities, traffic, and hospital capacity to support dispatch.

## Why it is not complete

- 21 files are explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- 15 files reference model-provider or chat-completion behavior; these generic LLM paths are not a substitute for deterministic domain execution, grounding, or evaluation.
- 50 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- No recognizable application test files were found in the inspected tree.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to ingest validated incidents, unit status, capabilities, traffic, and hospital capacity to support dispatch.
- 2. Connect CAD, AVL/GPS, GIS/traffic, hospital status, radio/messaging, and audit systems; replace seed/demo records with durable, synchronized data and explicit failure handling.
- 3. Replay incidents to validate routing, prioritization, latency, and failure modes.
- 4. Enforce dispatcher authority, location/health privacy, fail-safe rules, and continuous availability.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- Credential/secret fallback or demo-password patterns occur in 3 files and must be removed or made development-only.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `client/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `package.json` — declared scripts, runtime dependencies, and application boundaries.
- `client/src/App.jsx` — front-end navigation and visible workflow surface.
- `server/index.js` — service composition, middleware, and registered routes.
- `server/routes/ai.js` — implemented API surface and domain/AI request handling.
- `server/routes/aiBacklog.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: select one narrow emergency medical dispatch outcome, remove or quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress (2026-07-18)

- **1 — Implemented locally for a dispatcher-governed support slice.** `server/routes/dispatchWorkflow.js`, `server/services/governedWorkflow.js`, and `server/config/dispatchWorkflow.js` persist tenant-scoped opaque incident, acuity, location-grid, capability, fail-safe, evidence-validation, recommendation-review, dispatch, and closure states. The workflow supports dispatch decisions; it does not autonomously dispatch.
- **2 — Partially implemented / externally blocked.** CAD, AVL/GPS, GIS/traffic, hospital-status, radio/messaging, and audit-export contracts record configured state and explicit success/failure/retry events without claiming live connectivity. Agency agreements, credentials, schemas, uptime targets, security review, and outage fixtures remain external; generated CAD/bridge/gap routes are inactive.
- **3 — Partially implemented.** Deterministic readiness checks validate incident and unit availability plus authoritative checksummed incident/unit/traffic/hospital snapshots; patient name/date-of-birth fields fail readiness. Incident replay, latency/load tests, routing accuracy, priority calibration, and failover exercises require approved de-identified histories and agency scenarios.
- **4 — Implemented locally with operational certification external.** Public registration can no longer self-provision dispatcher/supervisor authority, dispatch requires a provisioned dispatcher attestation, tenant scope derives from identity, patient identifiers are excluded from the bounded workflow, and audit records are immutable. Enterprise identity, field-level encryption/KMS, continuous availability, radio fallback, privacy/retention approval, and EMS medical/dispatch sign-off remain external.
- **5 — Implemented locally for the bounded slice.** Additive checksum-tracked migrations, policy/authorization tests, migration/build CI, environment and run documentation, explicit bootstrap/migrate/guarded seed, and non-destructive startup were added. Database route, agency integration, availability/load, and browser end-to-end tests await an isolated secured environment and approved fixtures.

Risk remediation: JWT/database configuration fails closed, database TLS verifies certificates, default new-user authority is `medic`, generated gap/provider routes are inactive, and normal startup no longer installs, kills ports, creates users/databases, migrates, seeds, or starts PostgreSQL. Validation completed with 10 passing policy/authorization tests plus JavaScript, JSON, and shell syntax checks; no database, provider, radio, unit, hospital, or dispatch action was executed.
