import React, { useState, useEffect } from 'react';

const MutualAidPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const emptyForm = {
    request_type: 'given', agency_name: '', call_id: '', unit_sent: '',
    request_time: '', arrival_time: '', clear_time: '', reason: '', status: 'active'
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/mutual-aid', { headers });
      const data = await res.json();
      setRecords(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editData ? 'PUT' : 'POST';
    const url = editData ? `/api/mutual-aid/${editData.id}` : '/api/mutual-aid';
    try {
      await fetch(url, { method, headers, body: JSON.stringify(form) });
      setShowForm(false); setEditData(null); setForm(emptyForm);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/mutual-aid/${selected.id}`, { method: 'DELETE', headers });
      setSelected(null); setShowDeleteConfirm(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const openEdit = (item) => {
    setEditData(item);
    setForm({
      request_type: item.request_type || 'given', agency_name: item.agency_name || '',
      call_id: item.call_id || '', unit_sent: item.unit_sent || '',
      request_time: item.request_time ? new Date(item.request_time).toISOString().slice(0,16) : '',
      arrival_time: item.arrival_time ? new Date(item.arrival_time).toISOString().slice(0,16) : '',
      clear_time: item.clear_time ? new Date(item.clear_time).toISOString().slice(0,16) : '',
      reason: item.reason || '', status: item.status || 'active'
    });
    setShowForm(true); setSelected(null);
  };

  const filtered = records.filter(r =>
    (r.agency_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.request_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDT = (d) => d ? new Date(d).toLocaleString() : '-';

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-handshake" style={{color:'#18dcff',marginRight:10}}></i>Mutual Aid</h1>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditData(null); setShowForm(true); }}>
          <i className="fas fa-plus"></i> New Mutual Aid Request
        </button>
      </div>

      <div style={{marginBottom:16}}>
        <input className="form-input" placeholder="Search by agency or type..." value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:400}} />
      </div>

      {loading ? <div className="loading-spinner"></div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Type</th><th>Agency</th><th>Unit Sent</th><th>Request Time</th><th>Arrival</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)} style={{cursor:'pointer'}}>
                <td>{r.id}</td>
                <td><span className="badge" style={{background: r.request_type === 'given' ? '#54a0ff' : '#ffa502'}}>{r.request_type}</span></td>
                <td>{r.agency_name}</td>
                <td>{r.unit_sent || '-'}</td>
                <td>{formatDT(r.request_time)}</td>
                <td>{formatDT(r.arrival_time)}</td>
                <td><span className="badge" style={{background: r.status === 'completed' ? '#2ed573' : r.status === 'cancelled' ? '#ff4757' : '#00d4ff'}}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mutual Aid #{selected.id}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {[
                  ['Request Type', selected.request_type], ['Agency', selected.agency_name],
                  ['Call ID', selected.call_id], ['Unit Sent', selected.unit_sent],
                  ['Request Time', formatDT(selected.request_time)], ['Arrival Time', formatDT(selected.arrival_time)],
                  ['Clear Time', formatDT(selected.clear_time)], ['Status', selected.status],
                ].map(([label, val], i) => (
                  <div className="detail-row" key={i}><span className="detail-label">{label}</span><span className="detail-value">{val || '-'}</span></div>
                ))}
              </div>
              <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{selected.reason || '-'}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit</button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </div>
            {showDeleteConfirm && (
              <div style={{padding:16,background:'#2a1a1a',borderRadius:8,margin:16,textAlign:'center'}}>
                <p>Delete this mutual aid record?</p>
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
              <h2>{editData ? 'Edit' : 'New'} Mutual Aid</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Request Type</label>
                    <select className="form-select" value={form.request_type} onChange={e => setForm({...form, request_type: e.target.value})}>
                      <option value="given">Given</option><option value="received">Received</option>
                    </select></div>
                  <div className="form-group"><label className="form-label">Agency Name</label>
                    <input className="form-input" required value={form.agency_name} onChange={e => setForm({...form, agency_name: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Call ID</label>
                    <input className="form-input" type="number" value={form.call_id} onChange={e => setForm({...form, call_id: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Unit Sent</label>
                    <input className="form-input" value={form.unit_sent} onChange={e => setForm({...form, unit_sent: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Request Time</label>
                    <input className="form-input" type="datetime-local" value={form.request_time} onChange={e => setForm({...form, request_time: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Arrival Time</label>
                    <input className="form-input" type="datetime-local" value={form.arrival_time} onChange={e => setForm({...form, arrival_time: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Clear Time</label>
                    <input className="form-input" type="datetime-local" value={form.clear_time} onChange={e => setForm({...form, clear_time: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                    </select></div>
                </div>
                <div className="form-group"><label className="form-label">Reason</label>
                  <textarea className="form-textarea" rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /></div>
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

export default MutualAidPage;
