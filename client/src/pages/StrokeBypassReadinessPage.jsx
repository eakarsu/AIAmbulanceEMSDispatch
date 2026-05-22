import React, { useEffect, useState } from 'react';

export default function StrokeBypassReadinessPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/stroke-bypass-readiness', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Unable to load stroke bypass readiness.' }));
  }, []);

  if (!data) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Stroke Bypass Readiness</h1>
        <p>Hospital routing readiness for stroke alerts, CT queue pressure, and bypass protocol checks.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span>Stroke Alerts</span><strong>{data.summary?.activeStrokeAlerts}</strong></div>
        <div className="stat-card"><span>Bypass Candidates</span><strong>{data.summary?.bypassCandidates}</strong></div>
        <div className="stat-card"><span>Door-Needle Delta</span><strong>{data.summary?.avgDoorNeedleDeltaMin} min</strong></div>
        <div className="stat-card"><span>Diversion Risk</span><strong>{data.summary?.diversionRisk}</strong></div>
      </div>
      <div className="card">
        {data.hospitals?.map((hospital) => (
          <div key={hospital.name} className="list-row">
            <strong>{hospital.name}</strong>
            <span>ETA {hospital.etaMin} min</span>
            <span>CT queue {hospital.ctQueueMin} min</span>
            <span>{hospital.status}</span>
          </div>
        ))}
      </div>
      <div className="card"><h2>Protocol Checks</h2><ul>{data.protocolChecks?.map((check) => <li key={check}>{check}</li>)}</ul></div>
    </div>
  );
}
