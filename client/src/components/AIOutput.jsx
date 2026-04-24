import React, { useState, useEffect } from 'react';

const STYLE_ID = 'ems-ai-output-styles';
if (!document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    .ems-ai-wrap {
      border-radius:14px; overflow:hidden;
      background:linear-gradient(135deg,#f8fafc 0%,#f0f4ff 100%);
      border:1px solid #e0e7ff;
      box-shadow:0 4px 16px rgba(59,130,246,0.06);
    }

    .ems-ai-header {
      padding:16px 20px; display:flex; align-items:center; gap:10px;
      background:linear-gradient(135deg,#3b82f6,#6366f1);
      color:#fff;
    }
    .ems-ai-header-icon {
      width:32px; height:32px; background:rgba(255,255,255,0.2);
      border-radius:8px; display:flex; align-items:center; justify-content:center;
      font-size:14px;
    }
    .ems-ai-header-title { font-size:15px; font-weight:700; }

    .ems-ai-body { padding:20px; }

    /* Loading */
    .ems-ai-loading {
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; padding:40px 20px; gap:16px;
    }
    .ems-ai-dots { display:flex; gap:6px; }
    .ems-ai-dot {
      width:10px; height:10px; border-radius:50%;
      background:#3b82f6; animation:ems-ai-pulse 1.4s infinite ease-in-out;
    }
    .ems-ai-dot:nth-child(2) { animation-delay:0.2s; }
    .ems-ai-dot:nth-child(3) { animation-delay:0.4s; }
    @keyframes ems-ai-pulse {
      0%,80%,100% { transform:scale(0.6); opacity:0.4; }
      40% { transform:scale(1); opacity:1; }
    }
    .ems-ai-loading-text {
      font-size:14px; color:#6366f1; font-weight:600;
      animation:ems-ai-fade 1.5s infinite alternate;
    }
    @keyframes ems-ai-fade { from{opacity:0.5} to{opacity:1} }

    /* Content fade-in */
    .ems-ai-content {
      animation:ems-ai-slideUp .4s ease-out;
    }
    @keyframes ems-ai-slideUp {
      from { opacity:0; transform:translateY(12px); }
      to { opacity:1; transform:translateY(0); }
    }

    /* Key-value pair */
    .ems-ai-pair {
      display:flex; flex-direction:column; gap:4px;
      padding:12px 16px; background:#fff; border-radius:10px;
      border:1px solid #e5e7eb; margin-bottom:10px;
      animation:ems-ai-slideUp .4s ease-out backwards;
    }
    .ems-ai-pair-key {
      font-size:11px; font-weight:700; color:#6366f1;
      text-transform:uppercase; letter-spacing:.8px;
    }
    .ems-ai-pair-value { font-size:14px; color:#1e293b; line-height:1.6; }

    /* Score badge / meter */
    .ems-ai-score-wrap { display:flex; align-items:center; gap:10px; }
    .ems-ai-score {
      display:inline-flex; align-items:center; justify-content:center;
      min-width:48px; height:32px; padding:0 12px; border-radius:20px;
      font-size:16px; font-weight:800; color:#fff;
    }
    .ems-ai-meter {
      flex:1; height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden;
      max-width:160px;
    }
    .ems-ai-meter-fill { height:100%; border-radius:4px; transition:width .6s ease; }

    /* List */
    .ems-ai-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px; }
    .ems-ai-list li {
      padding:8px 12px; background:rgba(59,130,246,0.04); border-radius:8px;
      font-size:13px; color:#334155; display:flex; align-items:flex-start; gap:8px;
    }
    .ems-ai-list li::before { display:none; }
    .ems-ai-list-bullet {
      width:6px; height:6px; min-width:6px; border-radius:50%;
      background:#3b82f6; margin-top:6px;
    }

    /* Nested card */
    .ems-ai-nested {
      background:rgba(99,102,241,0.04); border:1px solid #e0e7ff;
      border-radius:10px; padding:14px; margin-bottom:10px;
    }
    .ems-ai-nested-title {
      font-size:13px; font-weight:700; color:#4f46e5; margin-bottom:10px;
      text-transform:capitalize;
    }

    /* Formatted text */
    .ems-ai-text { font-size:14px; color:#334155; line-height:1.7; white-space:pre-wrap; }
    .ems-ai-text strong { font-weight:700; color:#1e293b; }
  `;
  document.head.appendChild(tag);
}

function getScoreColor(value, max = 10) {
  const ratio = typeof max === 'number' && max > 0 ? value / max : value / 10;
  if (ratio <= 0.3) return '#22c55e';
  if (ratio <= 0.6) return '#f59e0b';
  if (ratio <= 0.8) return '#f97316';
  return '#ef4444';
}

function formatText(text) {
  if (typeof text !== 'string') return text;
  /* bold: **text** */
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  /* bullet points: lines starting with - or * */
  const lines = html.split('\n');
  const parts = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      parts.push(
        '<ul class="ems-ai-list">' +
          currentList
            .map(
              (item) =>
                `<li><span class="ems-ai-list-bullet"></span><span>${item}</span></li>`
            )
            .join('') +
          '</ul>'
      );
      currentList = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      currentList.push(trimmed.replace(/^[-*]\s+/, ''));
    } else {
      flushList();
      if (trimmed) parts.push(`<span>${trimmed}</span>`);
    }
  });
  flushList();

  return <span className="ems-ai-text" dangerouslySetInnerHTML={{ __html: parts.join('<br/>') }} />;
}

function RenderValue({ value, depth = 0 }) {
  if (value == null) return <span style={{ color: '#94a3b8' }}>N/A</span>;

  /* Number - score/priority badge */
  if (typeof value === 'number') {
    const color = getScoreColor(value);
    const pct = Math.min((value / 10) * 100, 100);
    return (
      <div className="ems-ai-score-wrap">
        <span className="ems-ai-score" style={{ background: color }}>
          {value}
        </span>
        <div className="ems-ai-meter">
          <div
            className="ems-ai-meter-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  }

  /* Boolean */
  if (typeof value === 'boolean') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: value ? '#16a34a' : '#dc2626',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <i className={`fas ${value ? 'fa-check-circle' : 'fa-times-circle'}`} />
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  /* Array */
  if (Array.isArray(value)) {
    return (
      <ul className="ems-ai-list">
        {value.map((item, i) => (
          <li key={i}>
            <span className="ems-ai-list-bullet" />
            <span>
              {typeof item === 'object' ? (
                <RenderValue value={item} depth={depth + 1} />
              ) : (
                formatText(String(item))
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  /* Nested object */
  if (typeof value === 'object') {
    return (
      <div className="ems-ai-nested">
        {Object.entries(value).map(([k, v], i) => (
          <div key={k} className="ems-ai-pair" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="ems-ai-pair-key">{k.replace(/[_-]/g, ' ')}</span>
            <span className="ems-ai-pair-value">
              <RenderValue value={v} depth={depth + 1} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  /* String */
  return <span className="ems-ai-pair-value">{formatText(String(value))}</span>;
}

export default function AIOutput({ result, loading, title = 'AI Analysis' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result && !loading) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [result, loading]);

  return (
    <div className="ems-ai-wrap">
      <div className="ems-ai-header">
        <div className="ems-ai-header-icon">
          <i className="fas fa-brain" />
        </div>
        <span className="ems-ai-header-title">{title}</span>
      </div>

      <div className="ems-ai-body">
        {/* Loading state */}
        {loading && (
          <div className="ems-ai-loading">
            <div className="ems-ai-dots">
              <div className="ems-ai-dot" />
              <div className="ems-ai-dot" />
              <div className="ems-ai-dot" />
            </div>
            <div className="ems-ai-loading-text">AI is analyzing...</div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="ems-ai-content" style={{ opacity: visible ? 1 : 0 }}>
            {typeof result === 'string' ? (
              <div className="ems-ai-pair">
                <span className="ems-ai-pair-value">{formatText(result)}</span>
              </div>
            ) : typeof result === 'object' && !Array.isArray(result) ? (
              Object.entries(result).map(([key, value], i) => (
                <div
                  key={key}
                  className="ems-ai-pair"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <span className="ems-ai-pair-key">{key.replace(/[_-]/g, ' ')}</span>
                  <span className="ems-ai-pair-value">
                    <RenderValue value={value} />
                  </span>
                </div>
              ))
            ) : (
              <RenderValue value={result} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>
            <i className="fas fa-robot" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            Submit data to get AI analysis
          </div>
        )}
      </div>
    </div>
  );
}
