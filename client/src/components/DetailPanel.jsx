import React, { useState } from 'react';
import Modal from './Modal';

const STYLE_ID = 'ems-detail-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-detail-fields { display:flex; flex-direction:column; gap:14px; }
    .ems-detail-field {
      display:flex; flex-direction:column; gap:2px;
      padding:10px 14px; background:#f8fafc; border-radius:8px;
      border:1px solid #f1f5f9;
    }
    .ems-detail-label {
      font-size:11px; font-weight:700; color:#64748b;
      text-transform:uppercase; letter-spacing:.8px;
    }
    .ems-detail-value { font-size:14px; color:#1e293b; font-weight:500; word-break:break-word; }

    .ems-detail-actions {
      display:flex; gap:10px; margin-top:20px; padding-top:16px;
      border-top:1px solid #e5e7eb;
    }
    .ems-detail-btn {
      flex:1; padding:10px 16px; border-radius:8px; font-size:14px;
      font-weight:600; cursor:pointer; border:none; transition:all .15s ease;
      display:flex; align-items:center; justify-content:center; gap:6px;
    }
    .ems-detail-btn.edit { background:#3b82f6; color:#fff; }
    .ems-detail-btn.edit:hover { background:#2563eb; }
    .ems-detail-btn.delete { background:#fef2f2; color:#ef4444; border:1px solid #fecaca; }
    .ems-detail-btn.delete:hover { background:#fee2e2; }

    .ems-confirm-overlay {
      position:absolute; inset:0; background:rgba(255,255,255,0.95);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      border-radius:12px; z-index:10; gap:12px; padding:20px;
    }
    .ems-confirm-text { font-size:15px; font-weight:600; color:#1e293b; text-align:center; }
    .ems-confirm-sub { font-size:13px; color:#64748b; text-align:center; }
    .ems-confirm-actions { display:flex; gap:10px; margin-top:8px; }
    .ems-confirm-btn {
      padding:8px 20px; border-radius:8px; font-size:13px; font-weight:600;
      cursor:pointer; border:none; transition:all .15s ease;
    }
    .ems-confirm-btn.yes { background:#ef4444; color:#fff; }
    .ems-confirm-btn.yes:hover { background:#dc2626; }
    .ems-confirm-btn.no { background:#f1f5f9; color:#475569; }
    .ems-confirm-btn.no:hover { background:#e2e8f0; }
  `;
  document.head.appendChild(tag);
}

export default function DetailPanel({
  isOpen,
  onClose,
  title,
  data,
  fields = [],
  onEdit,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete && onDelete(data);
  };

  if (!data) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <div style={{ position: 'relative' }}>
        {/* Delete confirmation overlay */}
        {confirmDelete && (
          <div className="ems-confirm-overlay">
            <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#f59e0b' }} />
            <div className="ems-confirm-text">Are you sure you want to delete this record?</div>
            <div className="ems-confirm-sub">This action cannot be undone.</div>
            <div className="ems-confirm-actions">
              <button className="ems-confirm-btn no" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button className="ems-confirm-btn yes" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="ems-detail-fields">
          {fields.map((field) => {
            const value = data[field.key];
            return (
              <div key={field.key} className="ems-detail-field">
                <span className="ems-detail-label">{field.label}</span>
                <span className="ems-detail-value">
                  {field.render
                    ? field.render(value, data)
                    : value != null
                    ? String(value)
                    : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="ems-detail-actions">
            {onEdit && (
              <button className="ems-detail-btn edit" onClick={() => onEdit(data)}>
                <i className="fas fa-pen" /> Edit
              </button>
            )}
            {onDelete && (
              <button
                className="ems-detail-btn delete"
                onClick={() => setConfirmDelete(true)}
              >
                <i className="fas fa-trash-alt" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
