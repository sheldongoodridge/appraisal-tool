import { useState, useEffect } from 'react';
import {
  getClients, createClient, updateClient, deleteClient,
  getLenders, createLender, updateLender, deleteLender,
} from '../services/api';

const EMPTY_CLIENT = { company_name: '', client_code: '', contact_name: '', email: '', phone: '', address: '' };
const EMPTY_LENDER = { company_name: '', contact_name: '', email: '', phone: '', address: '', city: '', province: '', postal_code: '' };

export default function Directory({ userRole }) {
  const [tab, setTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [lenderSearch, setLenderSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddLender, setShowAddLender] = useState(false);
  const [newClient, setNewClient] = useState(EMPTY_CLIENT);
  const [newLender, setNewLender] = useState(EMPTY_LENDER);
  const isReadOnly = userRole === 'assistant';

  useEffect(() => {
    Promise.all([getClients(), getLenders()])
      .then(([c, l]) => { setClients(c); setLenders(l); })
      .finally(() => setLoading(false));
  }, []);

  // ── Clients ──

  const handleAddClient = async () => {
    if (!newClient.company_name.trim()) return;
    try {
      const created = await createClient(newClient);
      setClients(prev => [...prev, created]);
      setNewClient(EMPTY_CLIENT); setShowAddClient(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add client'); }
  };

  const handleUpdateClient = async (id) => {
    try {
      const updated = await updateClient(id, editDraft);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      setEditingId(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to update'); }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete client'); }
  };

  // ── Lenders ──

  const handleAddLender = async () => {
    if (!newLender.company_name.trim()) return;
    try {
      const created = await createLender(newLender);
      setLenders(prev => [...prev, created]);
      setNewLender(EMPTY_LENDER); setShowAddLender(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add lender'); }
  };

  const handleUpdateLender = async (id) => {
    try {
      const updated = await updateLender(id, editDraft);
      setLenders(prev => prev.map(l => l.id === id ? updated : l));
      setEditingId(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to update'); }
  };

  const handleDeleteLender = async (id) => {
    if (!window.confirm('Delete this lender?')) return;
    try {
      await deleteLender(id);
      setLenders(prev => prev.filter(l => l.id !== id));
    } catch { alert('Failed to delete lender'); }
  };

  const filteredClients = clients.filter(c =>
    [c.company_name, c.client_code, c.contact_name, c.email].some(f => f?.toLowerCase().includes(clientSearch.toLowerCase()))
  );
  const filteredLenders = lenders.filter(l =>
    [l.company_name, l.contact_name, l.email].some(f => f?.toLowerCase().includes(lenderSearch.toLowerCase()))
  );

  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;

  return (
    <div className="directory-page">
      <h2 className="directory-title">📋 Directory</h2>
      <div className="directory-tabs">
        <button className={`dir-tab-btn ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
          Clients ({clients.length})
        </button>
        <button className={`dir-tab-btn ${tab === 'lenders' ? 'active' : ''}`} onClick={() => setTab('lenders')}>
          Lenders ({lenders.length})
        </button>
      </div>

      {/* ── CLIENTS ── */}
      {tab === 'clients' && (
        <div className="directory-section">
          <div className="directory-toolbar">
            <input className="directory-search" placeholder="Search clients…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            {!isReadOnly && <button className="btn btn-primary btn-small" onClick={() => setShowAddClient(s => !s)}>+ Add Client</button>}
          </div>

          {showAddClient && (
            <div className="directory-add-row">
              <div className="form-row">
                {[['company_name','Company Name *'],['client_code','Client Code'],['contact_name','Contact Name'],['email','Email'],['phone','Phone']].map(([k,l]) => (
                  <div key={k} className="form-group"><label>{l}</label><input type="text" value={newClient[k]} onChange={e => setNewClient(p => ({...p, [k]: e.target.value}))} /></div>
                ))}
              </div>
              <div className="directory-row-actions">
                <button className="btn btn-primary btn-small" onClick={handleAddClient}>Save</button>
                <button className="btn btn-small" onClick={() => setShowAddClient(false)}>Cancel</button>
              </div>
            </div>
          )}

          <p className="directory-count">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</p>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead><tr><th>Company</th><th>Code</th><th>Contact</th><th>Email</th><th>Phone</th>{!isReadOnly && <th></th>}</tr></thead>
              <tbody>
                {filteredClients.length === 0 && <tr><td colSpan={6} className="empty-cell">No clients found</td></tr>}
                {filteredClients.map(c => (
                  editingId === c.id ? (
                    <tr key={c.id} className="editing-row">
                      {['company_name','client_code','contact_name','email','phone'].map(k => (
                        <td key={k}><input value={editDraft[k] || ''} onChange={e => setEditDraft(p => ({...p, [k]: e.target.value}))} /></td>
                      ))}
                      <td>
                        <button className="btn btn-small btn-xs" onClick={() => handleUpdateClient(c.id)}>Save</button>{' '}
                        <button className="btn btn-small btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="directory-row" onClick={() => !isReadOnly && (setEditingId(c.id), setEditDraft(c))}>
                      <td><strong>{c.company_name}</strong></td>
                      <td>{c.client_code || '—'}</td>
                      <td>{c.contact_name || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      {!isReadOnly && <td><button className="btn-delete btn-xs" onClick={e => { e.stopPropagation(); handleDeleteClient(c.id); }}>✕</button></td>}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LENDERS ── */}
      {tab === 'lenders' && (
        <div className="directory-section">
          <div className="directory-toolbar">
            <input className="directory-search" placeholder="Search lenders…" value={lenderSearch} onChange={e => setLenderSearch(e.target.value)} />
            {!isReadOnly && <button className="btn btn-primary btn-small" onClick={() => setShowAddLender(s => !s)}>+ Add Lender</button>}
          </div>

          {showAddLender && (
            <div className="directory-add-row">
              <div className="form-row">
                {[['company_name','Company Name *'],['contact_name','Contact Name'],['email','Email'],['phone','Phone'],['address','Address'],['city','City'],['province','Province'],['postal_code','Postal Code']].map(([k,l]) => (
                  <div key={k} className="form-group"><label>{l}</label><input type="text" value={newLender[k]} onChange={e => setNewLender(p => ({...p, [k]: e.target.value}))} /></div>
                ))}
              </div>
              <div className="directory-row-actions">
                <button className="btn btn-primary btn-small" onClick={handleAddLender}>Save</button>
                <button className="btn btn-small" onClick={() => setShowAddLender(false)}>Cancel</button>
              </div>
            </div>
          )}

          <p className="directory-count">{filteredLenders.length} lender{filteredLenders.length !== 1 ? 's' : ''}</p>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>City</th>{!isReadOnly && <th></th>}</tr></thead>
              <tbody>
                {filteredLenders.length === 0 && <tr><td colSpan={6} className="empty-cell">No lenders found</td></tr>}
                {filteredLenders.map(l => (
                  editingId === l.id ? (
                    <tr key={l.id} className="editing-row">
                      {['company_name','contact_name','email','phone','city'].map(k => (
                        <td key={k}><input value={editDraft[k] || ''} onChange={e => setEditDraft(p => ({...p, [k]: e.target.value}))} /></td>
                      ))}
                      <td>
                        <button className="btn btn-small btn-xs" onClick={() => handleUpdateLender(l.id)}>Save</button>{' '}
                        <button className="btn btn-small btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className="directory-row" onClick={() => !isReadOnly && (setEditingId(l.id), setEditDraft(l))}>
                      <td><strong>{l.company_name}</strong></td>
                      <td>{l.contact_name || '—'}</td>
                      <td>{l.email || '—'}</td>
                      <td>{l.phone || '—'}</td>
                      <td>{l.city || '—'}</td>
                      {!isReadOnly && <td><button className="btn-delete btn-xs" onClick={e => { e.stopPropagation(); handleDeleteLender(l.id); }}>✕</button></td>}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
