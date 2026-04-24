import React, { useState, useEffect } from 'react';

const QAReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const emptyForm = {
    call_id: '', pcr_id: '', reviewer_name: '', review_date: '', category: '',
    score: '', findings: '', recommendations: '', action_required: false, action_taken: '', status: 'pending'
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/qa-reviews', { headers });
      const data = await res.json();
      setReviews(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editData ? 'PUT' : 'POST';
    const url = editData ? `/api/qa-reviews/${editData.id}` : '/api/qa-reviews';
    try {
      await fetch(url, { method, headers, body: JSON.stringify(form) });
      setShowForm(false); setEditData(null); setForm(emptyForm);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/qa-reviews/${selected.id}`, { method: 'DELETE', headers });
      setSelected(null); setShowDeleteConfirm(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const openEdit = (item) => {
    setEditData(item);
    setForm({
      call_id: item.call_id || '', pcr_id: item.pcr_id || '',
      reviewer_name: item.reviewer_name || '', review_date: item.review_date?.split('T')[0] || '',
      category: item.category || '', score: item.score || '',
      findings: item.findings || '', recommendations: item.recommendations || '',
      action_required: item.action_required || false, action_taken: item.action_taken || '',
      status: item.status || 'pending'
    });
    setShowForm(true); setSelected(null);
  };

  const scoreColor = (s) => {
    if (s >= 90) return '#2ed573';
    if (s >= 70) return '#ffa502';
    return '#ff4757';
  };

  const filtered = reviews.filter(r =>
    (r.reviewer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-clipboard-check" style={{color:'#3ae374',marginRight:10}}></i>QA Reviews</h1>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditData(null); setShowForm(true); }}>
          <i className="fas fa-plus"></i> New Review
        </button>
      </div>

      <div style={{marginBottom:16}}>
        <input className="form-input" placeholder="Search by reviewer or category..." value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:400}} />
      </div>

      {loading ? <div className="loading-spinner"></div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Call ID</th><th>Reviewer</th><th>Date</th><th>Category</th><th>Score</th><th>Action Required</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)} style={{cursor:'pointer'}}>
                <td>{r.id}</td>
                <td>{r.call_id || '-'}</td>
                <td>{r.reviewer_name}</td>
                <td>{r.review_date?.split('T')[0]}</td>
                <td>{r.category}</td>
                <td><span className="badge" style={{background: scoreColor(r.score), minWidth:40, textAlign:'center'}}>{r.score}</span></td>
                <td>{r.action_required ? <span style={{color:'#ff4757'}}>Yes</span> : 'No'}</td>
                <td><span className="badge" style={{background: r.status === 'completed' ? '#2ed573' : r.status === 'in_review' ? '#00d4ff' : '#ffa502'}}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>QA Review #{selected.id}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {[
                  ['Call ID', selected.call_id], ['PCR ID', selected.pcr_id],
                  ['Reviewer', selected.reviewer_name], ['Date', selected.review_date?.split('T')[0]],
                  ['Category', selected.category],
                  ['Score', selected.score],
                  ['Status', selected.status], ['Action Required', selected.action_required ? 'Yes' : 'No'],
                ].map(([label, val], i) => (
                  <div className="detail-row" key={i}>
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">
                      {label === 'Score' ? <span className="badge" style={{background: scoreColor(val)}}>{val}</span> : (val || '-')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="detail-row"><span className="detail-label">Findings</span><span className="detail-value">{selected.findings || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Recommendations</span><span className="detail-value">{selected.recommendations || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Action Taken</span><span className="detail-value">{selected.action_taken || '-'}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit</button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </div>
            {showDeleteConfirm && (
              <div style={{padding:16,background:'#2a1a1a',borderRadius:8,margin:16,textAlign:'center'}}>
                <p>Delete this QA review?</p>
                <button className="btn btn-danger" onClick={handleDelete} style={{marginRight:8}}>Yes, Delete</button>
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editData ? 'Edit' : 'New'} QA Review</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Call ID</label>
                    <input className="form-input" type="number" value={form.call_id} onChange={e => setForm({...form, call_id: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">PCR ID</label>
                    <input className="form-input" type="number" value={form.pcr_id} onChange={e => setForm({...form, pcr_id: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Reviewer Name</label>
                    <input className="form-input" required value={form.reviewer_name} onChange={e => setForm({...form, reviewer_name: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Review Date</label>
                    <input className="form-input" type="date" value={form.review_date} onChange={e => setForm({...form, review_date: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="">Select...</option>
                      <option>Clinical</option><option>Documentation</option><option>Response Time</option><option>Protocol Compliance</option>
                    </select></div>
                  <div className="form-group"><label className="form-label">Score (1-100)</label>
                    <input className="form-input" type="number" min="1" max="100" value={form.score} onChange={e => setForm({...form, score: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="pending">Pending</option><option value="in_review">In Review</option>
                      <option value="completed">Completed</option><option value="follow_up">Follow Up</option>
                    </select></div>
                  <div className="form-group" style={{display:'flex',alignItems:'center',gap:8,paddingTop:24}}>
                    <input type="checkbox" checked={form.action_required} onChange={e => setForm({...form, action_required: e.target.checked})} />
                    <label className="form-label" style={{margin:0}}>Action Required</label>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Findings</label>
                  <textarea className="form-textarea" rows={3} value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Recommendations</label>
                  <textarea className="form-textarea" rows={3} value={form.recommendations} onChange={e => setForm({...form, recommendations: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Action Taken</label>
                  <textarea className="form-textarea" rows={2} value={form.action_taken} onChange={e => setForm({...form, action_taken: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editData ? 'Update' : 'Create'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAReviewsPage;
