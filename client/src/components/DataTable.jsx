import React, { useState, useMemo } from 'react';

const STYLE_ID = 'ems-datatable-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-table-wrap {
      background:#fff; border-radius:12px; overflow:hidden;
      box-shadow:0 1px 3px rgba(0,0,0,0.06);
      border:1px solid #e5e7eb;
    }
    .ems-table { width:100%; border-collapse:collapse; }

    .ems-table th {
      text-align:left; padding:12px 16px; font-size:12px; font-weight:700;
      color:#64748b; text-transform:uppercase; letter-spacing:.5px;
      background:#f8fafc; border-bottom:2px solid #e5e7eb;
      cursor:pointer; user-select:none; white-space:nowrap;
      transition:color .15s ease;
    }
    .ems-table th:hover { color:#3b82f6; }
    .ems-table th .sort-icon { margin-left:4px; font-size:10px; opacity:0.4; }
    .ems-table th .sort-icon.active { opacity:1; color:#3b82f6; }

    .ems-table td {
      padding:12px 16px; font-size:14px; color:#334155;
      border-bottom:1px solid #f1f5f9;
    }

    .ems-table tbody tr { transition:background .1s ease; }
    .ems-table tbody tr.clickable { cursor:pointer; }
    .ems-table tbody tr.clickable:hover { background:#f8fafc; }

    .ems-table-empty {
      padding:48px 20px; text-align:center; color:#94a3b8; font-size:15px;
    }
    .ems-table-empty i { font-size:32px; display:block; margin-bottom:12px; color:#cbd5e1; }

    /* Skeleton */
    .ems-skel-row td { padding:14px 16px; }
    .ems-skel-bar {
      height:14px; border-radius:6px; background:linear-gradient(90deg,#e5e7eb 25%,#f1f5f9 50%,#e5e7eb 75%);
      background-size:200% 100%; animation:ems-shimmer 1.5s infinite;
    }
    @keyframes ems-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `;
  document.head.appendChild(tag);
}

export default function DataTable({ columns = [], data = [], onRowClick, loading }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="ems-table-wrap">
        <table className="ems-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="ems-skel-row">
                {columns.map((col) => (
                  <td key={col.key}>
                    <div
                      className="ems-skel-bar"
                      style={{ width: `${55 + Math.random() * 35}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* Empty state */
  if (!data || data.length === 0) {
    return (
      <div className="ems-table-wrap">
        <table className="ems-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="ems-table-empty">
          <i className="fas fa-inbox" />
          No records found
        </div>
      </div>
    );
  }

  return (
    <div className="ems-table-wrap" style={{ overflowX: 'auto' }}>
      <table className="ems-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                <span
                  className={`sort-icon${sortKey === col.key ? ' active' : ''}`}
                >
                  <i
                    className={`fas ${
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? 'fa-sort-up'
                          : 'fa-sort-down'
                        : 'fa-sort'
                    }`}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id ?? row._id ?? idx}
              className={onRowClick ? 'clickable' : ''}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
