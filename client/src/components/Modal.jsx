import React, { useEffect } from 'react';

const STYLE_ID = 'ems-modal-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.5);
      display:flex; align-items:center; justify-content:center;
      z-index:2000; opacity:0; transition:opacity .2s ease;
      backdrop-filter:blur(2px);
    }
    .ems-modal-overlay.visible { opacity:1; }

    .ems-modal {
      background:#fff; border-radius:12px;
      box-shadow:0 20px 60px rgba(0,0,0,0.2);
      display:flex; flex-direction:column; max-height:90vh;
      transform:translateY(20px) scale(0.97); transition:transform .25s ease;
      overflow:hidden;
    }
    .ems-modal-overlay.visible .ems-modal {
      transform:translateY(0) scale(1);
    }

    .ems-modal.sm { width:400px; max-width:92vw; }
    .ems-modal.md { width:560px; max-width:92vw; }
    .ems-modal.lg { width:800px; max-width:95vw; }

    .ems-modal-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 20px; border-bottom:1px solid #e5e7eb;
    }
    .ems-modal-title { font-size:17px; font-weight:700; color:#1e293b; margin:0; }
    .ems-modal-close {
      background:none; border:none; font-size:18px; color:#94a3b8;
      cursor:pointer; width:32px; height:32px; border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      transition:all .15s ease;
    }
    .ems-modal-close:hover { background:#f1f5f9; color:#475569; }

    .ems-modal-body { padding:20px; overflow-y:auto; flex:1; }
  `;
  document.head.appendChild(tag);
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* Prevent body scroll when open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="ems-modal-overlay visible"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`ems-modal ${size}`} role="dialog" aria-modal="true">
        <div className="ems-modal-header">
          <h2 className="ems-modal-title">{title}</h2>
          <button className="ems-modal-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="ems-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
