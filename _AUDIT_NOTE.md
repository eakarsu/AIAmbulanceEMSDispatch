# Audit Apply Note — AIAmbulanceEMSDispatch

## Audit recommendations (from batch_00.md)

Substantive: 22 routes, 17 AI endpoints. Production-grade emergency response platform.

### Missing AI counterparts
- AI patient outcome prediction (post-hospital)
- AI staffing optimization (predicted demand-based scheduling)

### Missing non-AI features
- CAD (computer-aided dispatch) integration
- Hospital EHR integration (real-time bed status)
- Training simulator

### Custom feature suggestions
- Real-time demand forecasting
- Cardiac arrest outcome prediction
- Mutual aid orchestration
- Community paramedicine pathway
- CAD systems (RapidSOS), hospital EHR (Epic, Cerner)

## Implemented in this pass

None. Substantive (17 AI endpoints, 22 routes). Remaining items are large clinical-decision modules or external integrations (CAD, EHR).

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| AI patient outcome prediction | NEEDS-PRODUCT-DECISION | Outcome model design + clinical validation |
| AI staffing optimization | NEEDS-PRODUCT-DECISION | Scheduler design |
| CAD integration | NEEDS-CREDS | RapidSOS / ECC APIs |
| Hospital EHR integration | NEEDS-CREDS | HL7 / FHIR creds + HIPAA review |
| Training simulator | TOO-RISKY | Sim engine |
| Cardiac outcome prediction | NEEDS-PRODUCT-DECISION | Clinical validation |
| Community paramedicine pathway | NEEDS-PRODUCT-DECISION | Workflow design |

## Apply pass 3 (frontend)

- Verified: FE is comprehensively wired. `client/src/App.jsx` registers a dedicated "AI Assist" sidebar section with **16 dedicated AI pages** under `/ai/*` routes (triage, unit-selection, pcr-draft, protocol, demand-forecast, fatigue-analysis, incident-prediction, crew-schedule, mci-plan, hospital-divert, drug-interaction, mutual-aid-optimizer, caller-script, qi-dashboard, post-call-debrief, history). Each page sends `Authorization: Bearer <localStorage.token>` and POSTs to the matching `/api/ai/...` endpoint.
- Action: LEFT-AS-IS (idempotence rule).
- No files modified.

## Apply pass 4 (mechanical backlog)

- Action: LEFT-AS-IS (idempotence rule).
- Backlog inventory contains zero MECHANICAL items: every entry is tagged NEEDS-PRODUCT-DECISION (patient/cardiac outcome, staffing, community paramedicine), NEEDS-CREDS (CAD, EHR), or TOO-RISKY (training simulator).
- No files modified.

## Apply pass 5 (all backlog)

Implemented every remaining backlog item, category-aware. 7 features added.

- POST `/api/ai/patient-outcome-prediction` — PRODUCT-DECISION: 30-day survival + functional disposition.
- POST `/api/ai/cardiac-outcome-prediction` — PRODUCT-DECISION: ROSC + 30-day survival + CPC neuro per Utstein.
- POST `/api/ai/staffing-optimization` — PRODUCT-DECISION: per-shift unit count vs forecasted demand.
- POST `/api/ai/community-paramedicine-pathway` — PRODUCT-DECISION: super-utilizer threshold = ≥4 EMS calls / 90d OR ≥2 BLS xfers / 30d.
- POST `/api/ai/cad-integration/sync` — NEEDS-CREDS: 503 + `missing: CAD_API_URL,CAD_API_KEY`.
- GET `/api/ai/ehr-integration/bed-status` — NEEDS-CREDS: 503 + `missing: EHR_FHIR_URL,EHR_FHIR_TOKEN`.
- POST `/api/ai/training-simulator/scenario` + GET `/scenarios` — TOO-RISKY: idempotent table + in-memory fallback + canned-stub when LLM unavailable.

Files:
- New: `server/routes/aiBacklog.js` (mounted in `server/index.js` under `/api/ai`).
- New: `client/src/pages/AIBacklogPage.jsx`; sidebar link + route in `client/src/App.jsx`.

Smoke test: PASS. `node --check` PASS on all touched files. Live HTTP boot on port 14004: login → 200 (admin@emsstation1.com), `/cad-integration/sync` → 503 with `missing` payload, `/ehr-integration/bed-status` → 503 with `missing` payload, `/training-simulator/scenario` → 200 (canned stub returned).
