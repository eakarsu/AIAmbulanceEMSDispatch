import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const HEADERS = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export default function AIHistoryPage() {
  const [items, setItems] = useState([]);
  const [pag, setPag] = useState({ page: 1, total_pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/ai/history?page=${page}&limit=20`, { headers: HEADERS() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setItems(data.data || []);
      setPag(data.pagination || { page: 1, total_pages: 1, total: 0, limit: 20 });
    } catch (err) { setError(err.message); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 32, color: '#fff' }}>
      <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>&larr; Back</Link>
      <h1 style={{ fontSize: 26, margin: '12px 0 4px' }}>
        <i className="fas fa-history" style={{ color: '#00d4ff', marginRight: 8 }} />
        AI Analysis History
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Past AI runs by you.</p>

      {error && <div style={errBox}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <>
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={th}>Type</th><th style={th}>Created</th><th style={th}>Input Summary</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} onClick={() => setSelected(it)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={td}><strong>{it.analysis_type}</strong></td>
                  <td style={td}>{new Date(it.created_at).toLocaleString()}</td>
                  <td style={{ ...td, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {typeof it.input_data === 'string' ? it.input_data : JSON.stringify(it.input_data)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td style={td} colSpan={3}>No analyses yet.</td></tr>}
            </tbody>
          </table>

          {pag.total_pages > 1 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, justifyContent: 'center' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={btn}>Prev</button>
              <span>Page {pag.page} of {pag.total_pages} ({pag.total} total)</span>
              <button onClick={() => setPage((p) => Math.min(pag.total_pages, p + 1))} disabled={page >= pag.total_pages} style={btn}>Next</button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#0f172a', padding: 24, borderRadius: 12, maxWidth: 800, width: '90%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#fff' }}>{selected.analysis_type}</h2>
            <h4>Input</h4>
            <pre style={{ color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.input_data, null, 2)}</pre>
            <h4>Result</h4>
            <pre style={{ color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.result, null, 2)}</pre>
            <button onClick={() => setSelected(null)} style={btn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase' };
const td = { padding: 12, color: '#fff' };
const btn = { padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' };
const errBox = { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 12, color: '#ff6b6b', marginTop: 16 };
