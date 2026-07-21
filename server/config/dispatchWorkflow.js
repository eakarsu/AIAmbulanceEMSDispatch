'use strict';

module.exports = {
  table: 'governed_dispatch_workflows',
  initialStatus: 'received',
  statuses: ['received', 'validated', 'recommendation_ready', 'dispatcher_review', 'dispatched', 'closed', 'cancelled'],
  editableStatuses: ['received', 'validated', 'recommendation_ready'],
  transitions: {
    received: ['validated', 'cancelled'], validated: ['received', 'recommendation_ready', 'cancelled'],
    recommendation_ready: ['validated', 'dispatcher_review', 'cancelled'],
    dispatcher_review: ['recommendation_ready', 'dispatched', 'cancelled'], dispatched: ['closed'], closed: [], cancelled: [],
  },
  approvalStatuses: ['dispatched'],
  approverRoles: ['dispatcher', 'supervisor', 'admin'],
  evidenceRoles: ['integration', 'dispatcher', 'supervisor', 'admin'],
  syncRoles: ['integration', 'admin'],
  providerRequirementsByStatus: { dispatched: { allOf: ['cad', 'radio_messaging'] } },
  requiredFields: ['incidentReference', 'acuity', 'locationGrid', 'unitRequirements', 'failSafeProcedure'],
  requiredEvidence: ['cad_incident', 'unit_status', 'traffic', 'hospital_capacity'],
  deterministicChecks: [
    { code: 'INCIDENT_VALIDATED', test: (p) => p.incidentValidated === true },
    { code: 'UNIT_AVAILABLE', test: (p) => p.unitAvailable === true },
    { code: 'NO_PATIENT_DETAILS_IN_WORKFLOW', test: (p) => !p.patientName && !p.dateOfBirth },
  ],
  providers: ['cad', 'avl_gps', 'gis_traffic', 'hospital_status', 'radio_messaging', 'audit_export'],
  providerEnv: {
    cad: 'CAD_API_URL', avl_gps: 'AVL_API_URL', gis_traffic: 'TRAFFIC_API_URL',
    hospital_status: 'HOSPITAL_STATUS_API_URL', radio_messaging: 'RADIO_API_URL', audit_export: 'AUDIT_EXPORT_URL',
  },
};
