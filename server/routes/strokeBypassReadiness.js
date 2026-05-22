const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Stroke Bypass Readiness',
    summary: { activeStrokeAlerts: 3, bypassCandidates: 2, avgDoorNeedleDeltaMin: 11, diversionRisk: 'Moderate' },
    hospitals: [
      { name: 'Mercy Comprehensive Stroke Center', etaMin: 14, ctQueueMin: 6, status: 'Preferred' },
      { name: 'North General', etaMin: 8, ctQueueMin: 28, status: 'Bypass candidate' },
      { name: 'River Valley Medical', etaMin: 19, ctQueueMin: 10, status: 'Accepting' },
    ],
    protocolChecks: [
      'Confirm last-known-well time before routing to thrombectomy-capable center.',
      'Bypass closer facility when CT queue pushes treatment beyond protocol target.',
      'Attach stroke scale and anticoagulant status to pre-arrival notification.',
    ],
  });
});

module.exports = router;
