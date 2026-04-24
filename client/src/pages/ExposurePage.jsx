import React, { useState, useEffect } from 'react';

const ExposurePage = () => {
  const [exposures, setExposures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const emptyForm = {
    crew_id: '', call_id: '', exposure_type: '', exposure_date: '', pathogen: '',
    description: '', ppe_worn: '', follow_up_required: true, follow_up_date: '',
    follow_up_status: 'pending', result: '', notes: ''
  };

  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/exposure', { headers });
      const data = await res.json();
      setExposures(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editData ? 'PUT' : 'POST';
    const url = editData ? `/api/exposure/${editData.id}` : '/api/exposure';
    try {
      await fetch(url, { method, headers, body: JSON.stringify(form) });
      setShowForm(false);
      setEditData(null);
      setForm(emptyForm);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/exposure/${selected.id}`, { method: 'DELETE', headers });
      setSelected(null);
      setShowDeleteConfirm(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const openEdit = (item) => {
    setEditData(item);
    setForm({
      crew_id: item.crew_id || '', call_id: item.call_id || '',
      exposure_type: item.exposure_type || '', exposure_date: item.exposure_date?.split('T')[0] || '',
      pathogen: item.pathogen || '', description: item.description || '',
      ppe_worn: item.ppe_worn || '', follow_up_required: item.follow_up_required ?? true,
      follow_up_date: item.follow_up_date?.split('T')[0] || '',
      follow_up_status: item.follow_up_status || 'pending',
      result: item.result || '', notes: item.notes || ''
    });
    setShowForm(true);
    setSelected(null);
  };

  const filtered = exposures.filter(e =>
    (e.exposure_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.pathogen || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => {
    const colors = { pending: '#ffa502', in_progress: '#00d4ff', completed: '#2ed573', cleared: '#2ed573' };
    return colors[s] || '#8899aa';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-biohazard" style={{color:'#eb2f06',marginRight:10}}></i>Exposure Tracking</h1>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditData(null); setShowForm(true); }}>
          <i className="fas fa-plus"></i> New Exposure Report
        </button>
      </div>

      <div style={{marginBottom:16}}>
        <input className="form-input" placeholder="Search by type or pathogen..." value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:400}} />
      </div>

      {loading ? <div className="loading-spinner"></div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Crew ID</th><th>Type</th><th>Date</th><th>Pathogen</th><th>PPE Worn</th><th>Follow-up</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)} style={{cursor:'pointer'}}>
                <td>{e.id}</td>
                <td>{e.crew_id}</td>
                <td>{e.exposure_type}</td>
                <td>{e.exposure_date?.split('T')[0]}</td>
                <td>{e.pathogen}</td>
                <td>{e.ppe_worn}</td>
                <td>{e.follow_up_required ? 'Yes' : 'No'}</td>
                <td><span className="badge" style={{background: statusColor(e.follow_up_status)}}>{e.follow_up_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Exposure Report #{selected.id}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {[
                  ['Crew ID', selected.crew_id], ['Call ID', selected.call_id],
                  ['Exposure Type', selected.exposure_type], ['Date', selected.exposure_date?.split('T')[0]],
                  ['Pathogen', selected.pathogen], ['PPE Worn', selected.ppe_worn],
                  ['Follow-up Required', selected.follow_up_required ? 'Yes' : 'No'],
                  ['Follow-up Date', selected.follow_up_date?.split('T')[0]],
                  ['Follow-up Status', selected.follow_up_status], ['Result', selected.result],
                ].map(([label, val], i) => (
                  <div className="detail-row" key={i}><span className="detail-label">{label}</span><span className="detail-value">{val || '-'}</span></div>
                ))}
              </div>
              <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{selected.description || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Notes</span><span className="detail-value">{selected.notes || '-'}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit</button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </div>
            {showDeleteConfirm && (
              <div style={{padding:16,background:'#2a1a1a',borderRadius:8,margin:16,textAlign:'center'}}>
                <p>Are you sure you want to delete this exposure report?</p>
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
              <h2>{editData ? 'Edit' : 'New'} Exposure Report</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label className="form-label">Crew ID</label>
                    <input className="form-input" type="number" value={form.crew_id} onChange={e => setForm({...form, crew_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Call ID</label>
                    <input className="form-input" type="number" value={form.call_id} onChange={e => setForm({...form, call_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exposure Type</label>
                    <select className="form-select" value={form.exposure_type} onChange={e => setForm({...form, exposure_type: e.target.value})}>
                      <option value="">Select...</option>
                      <option>Bloodborne</option><option>Airborne</option><option>Contact</option><option>Chemical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exposure Date</label>
                    <input className="form-input" type="date" value={form.exposure_date} onChange={e => setForm({...form, exposure_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pathogen</label>
                    <input className="form-input" value={form.pathogen} onChange={e => setForm({...form, pathogen: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PPE Worn</label>
                    <input className="form-input" value={form.ppe_worn} onChange={e => setForm({...form, ppe_worn: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Status</label>
                    <select className="form-select" value={form.follow_up_status} onChange={e => setForm({...form, follow_up_status: e.target.value})}>
                      <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option><option value="cleared">Cleared</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Date</label>
                    <input className="form-input" type="date" value={form.follow_up_date} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Result</label>
                    <input className="form-input" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
                  </div>
                  <div className="form-group" style={{display:'flex',alignItems:'center',gap:8,paddingTop:24}}>
                    <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm({...form, follow_up_required: e.target.checked})} />
                    <label className="form-label" style={{margin:0}}>Follow-up Required</label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
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

export default ExposurePage;
