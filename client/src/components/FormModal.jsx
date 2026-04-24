import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const STYLE_ID = 'ems-form-modal-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-form { display:flex; flex-direction:column; gap:16px; }

    .ems-form-group { display:flex; flex-direction:column; gap:4px; }
    .ems-form-label {
      font-size:13px; font-weight:600; color:#374151;
    }
    .ems-form-label .req { color:#ef4444; margin-left:2px; }

    .ems-form-input,
    .ems-form-select,
    .ems-form-textarea {
      padding:10px 12px; border:1px solid #d1d5db; border-radius:8px;
      font-size:14px; color:#1e293b; background:#fff;
      transition:border-color .15s ease, box-shadow .15s ease;
      font-family:inherit; outline:none;
    }
    .ems-form-input:focus,
    .ems-form-select:focus,
    .ems-form-textarea:focus {
      border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1);
    }
    .ems-form-textarea { min-height:90px; resize:vertical; }

    .ems-form-checkbox-row {
      display:flex; align-items:center; gap:8px; padding:4px 0;
    }
    .ems-form-checkbox {
      width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;
    }

    .ems-form-actions {
      display:flex; gap:10px; justify-content:flex-end;
      margin-top:8px; padding-top:16px; border-top:1px solid #e5e7eb;
    }
    .ems-form-btn {
      padding:10px 24px; border-radius:8px; font-size:14px;
      font-weight:600; cursor:pointer; border:none; transition:all .15s ease;
    }
    .ems-form-btn.cancel { background:#f1f5f9; color:#475569; }
    .ems-form-btn.cancel:hover { background:#e2e8f0; }
    .ems-form-btn.submit { background:#3b82f6; color:#fff; }
    .ems-form-btn.submit:hover { background:#2563eb; }
  `;
  document.head.appendChild(tag);
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  fields = [],
  initialData = {},
  onSubmit,
}) {
  const [formData, setFormData] = useState({});

  /* Reset form when opening or when initialData changes */
  useEffect(() => {
    if (isOpen) {
      const defaults = {};
      fields.forEach((f) => {
        if (initialData[f.key] !== undefined) {
          defaults[f.key] = initialData[f.key];
        } else if (f.type === 'checkbox') {
          defaults[f.key] = false;
        } else {
          defaults[f.key] = '';
        }
      });
      setFormData(defaults);
    }
  }, [isOpen, initialData, fields]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit(formData);
  };

  const renderField = (field) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'select':
        return (
          <select
            className="ems-form-select"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            required={field.required}
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={optValue} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            className="ems-form-textarea"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder || ''}
          />
        );

      case 'checkbox':
        return (
          <div className="ems-form-checkbox-row">
            <input
              type="checkbox"
              className="ems-form-checkbox"
              checked={!!formData[field.key]}
              onChange={(e) => handleChange(field.key, e.target.checked)}
            />
            <span style={{ fontSize: 14, color: '#475569' }}>
              {field.checkboxLabel || field.label}
            </span>
          </div>
        );

      default:
        return (
          <input
            className="ems-form-input"
            type={field.type || 'text'}
            value={value}
            onChange={(e) =>
              handleChange(
                field.key,
                field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
              )
            }
            required={field.required}
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form className="ems-form" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.key} className="ems-form-group">
            {field.type !== 'checkbox' && (
              <label className="ems-form-label">
                {field.label}
                {field.required && <span className="req">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}

        <div className="ems-form-actions">
          <button type="button" className="ems-form-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ems-form-btn submit">
            {initialData && Object.keys(initialData).length > 0 ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
