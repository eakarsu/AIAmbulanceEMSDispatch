import React from 'react';

const UNIT_STATUS_COLORS = {
  available:        { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  en_route:         { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  on_scene:         { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  at_hospital:      { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  out_of_service:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

const PRIORITY_COLORS = {
  1: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  2: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  3: { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  4: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
};

const GENERAL_COLORS = {
  active:     { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  inactive:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  pending:    { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  completed:  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  cancelled:  { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  in_progress:{ bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  expired:    { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' },
  critical:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  warning:    { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  dispatched: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  resolved:   { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
};

const DEFAULT_STYLE = { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };

export default function StatusBadge({ status, type = 'general' }) {
  if (status == null) return null;

  const normalized = String(status).toLowerCase().replace(/[\s-]+/g, '_');
  let colorSet;

  if (type === 'unit_status') {
    colorSet = UNIT_STATUS_COLORS[normalized];
  } else if (type === 'priority') {
    colorSet = PRIORITY_COLORS[status] || PRIORITY_COLORS[normalized];
  } else {
    colorSet = GENERAL_COLORS[normalized];
  }

  if (!colorSet) colorSet = DEFAULT_STYLE;

  const displayLabel = String(status).replace(/[_-]/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'capitalize',
        backgroundColor: colorSet.bg,
        color: colorSet.color,
        border: `1px solid ${colorSet.border}`,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: colorSet.color,
          marginRight: 6,
          flexShrink: 0,
        }}
      />
      {displayLabel}
    </span>
  );
}
