import { useState, useEffect } from 'react';
import {
  getClients, getLenders,
  createClient, updateClient, deleteClient,
  createLender, updateLender, deleteLender,
} from '../services/api';

const PAGE_SIZE = 25;

function Directory() {
  const [activeTab, setActiveTab] = useState('clients');

  // Clients
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientData, setEditingClientData] = useState({});
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ company_name: '', client_code: '', contact_name: '', email: '', phone: '' });

  // Lenders
  const [lenders, setLenders] = useState([]);
  const [lenderSearch, setLenderSearch] = useState('');
  const [lenderPage, setLenderPage] = useState(1);
  const [editingLenderId, setEditingLenderId] = useState(null);
  const [editingLenderData, setEditingLenderData] = useState({});
  const [addingLender, setAddingLender] = useState(false);
  const [newLender, setNewLender] = useState({ company_name: '', address: '', city: '', province: '', postal_code: '', contact_name: '', email: '', phone: '' });

  useEffect(() => {
    Promise.all([getClients(), getLenders()])
      .then(([c, l]) => { setClients(c); setLenders(l); })
      .catch(err => console.error('Directory load error:', err));
  }, []);

  // ── Clients filter + paginate ────────────────────────────────────────────────
  const filteredClients = clients
    .filter(c => !clientSearch ||
      c.company_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.client_code?.toLowerCase().includes(clientSearch.toLowerCase()))
    .sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
  const clientPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pagedClients = filteredClients.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE);

  // ── Lenders filter + paginate ────────────────────────────────────────────────
  const filteredLenders = lenders
    .filter(l => !lenderSearch ||
      l.company_name?.toLowerCase().includes(lenderSearch.toLowerCase()))
    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
  const lenderPages = Math.max(1, Math.ceil(filteredLenders.length / PAGE_SIZE));
  const pagedLenders = filteredLenders.slice((lenderPage - 1) * PAGE_SIZE, lenderPage * PAGE_SIZE);

  // ── Client actions ───────────────────────────────────────────────────────────
  const handleSaveClient = async () => {
    try {
      await updateClient(editingClientId, editingClientData);
      setClients(clients.map(c => c.id === editingClientId ? { ...c, ...editingClientData } : c));
      setEditingClientId(null);
    } catch { alert('Failed to save client'); }
  };

  const handleCreateClient = async () => {
    if (!newClient.company_name.trim()) { alert('Company name is required'); return; }
    try {
      const created = await createClient(newClient);
      setClients([created, ...clients]);
      setAddingClient(false);
      setNewClient({ company_name: '', client_code: '', contact_name: '', email: '', phone: '' });
    } catch { alert('Failed to create client'); }
  };

  const handleDeleteClient = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      if (editingClientId === id) setEditingClientId(null);
    } catch (err) {
      const msg = err?.response?.status === 409 || err?.response?.data?.error?.includes('foreign')
        ? 'This client has order history and cannot be deleted. You can edit their details instead.'
        : 'Failed to delete client.';
      alert(msg);
    }
  };

  // ── Lender actions ───────────────────────────────────────────────────────────
  const handleSaveLender = async () => {
    try {
      await updateLender(editingLenderId, editingLenderData);
      setLenders(lenders.map(l => l.id === editingLenderId ? { ...l, ...editingLenderData } : l));
      setEditingLenderId(null);
    } catch { alert('Failed to save lender'); }
  };

  const handleCreateLender = async () => {
    if (!newLender.company_name.trim()) { alert('Company name is required'); return; }
    try {
      const created = await createLender(newLender);
      setLenders([created, ...lenders]);
      setAddingLender(false);
      setNewLender({ company_name: '', address: '', city: '', province: '', postal_code: '', contact_name: '', email: '', phone: '' });
    } catch { alert('Failed to create lender'); }
  };

  const handleDeleteLender = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteLender(id);
      setLenders(lenders.filter(l => l.id !== id));
      if (editingLenderId === id) setEditingLenderId(null);
    } catch (err) {
      alert('Failed to delete lender.');
    }
  };

  return (
    <div className="directory-page">
      <h2 className="directory-title">Directory</h2>

      <div className="directory-tabs">
        <button
          className={`dir-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          Clients ({clients.length})
        </button>
        <button
          className={`dir-tab-btn ${activeTab === 'lenders' ? 'active' : ''}`}
          onClick={() => setActiveTab('lenders')}
        >
          Lenders ({lenders.length})
        </button>
      </div>

      {/* ── Clients Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <div className="directory-section">
          <div className="directory-toolbar">
            <input
              type="text"
              placeholder="Search by company name or client code…"
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setClientPage(1); }}
              className="directory-search"
            />
            <button
              className="btn btn-primary"
              onClick={() => { setAddingClient(true); setEditingClientId(null); }}
            >
              + Add New Client
            </button>
          </div>

          <p className="directory-count">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </p>

          {addingClient && (
            <div className="directory-add-row">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    value={newClient.company_name}
                    onChange={e => setNewClient({ ...newClient, company_name: e.target.value })}
                    placeholder="ABC Bank"
                  />
                </div>
                <div className="form-group">
                  <label>Client Code</label>
                  <input
                    value={newClient.client_code}
                    onChange={e => setNewClient({ ...newClient, client_code: e.target.value })}
                    placeholder="ABC001"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    value={newClient.contact_name}
                    onChange={e => setNewClient({ ...newClient, contact_name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="contact@abc.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="416-555-0100"
                  />
                </div>
              </div>
              <div className="directory-row-actions">
                <button className="btn btn-primary" onClick={handleCreateClient}>Save Client</button>
                <button className="btn btn-small" onClick={() => {
                  setAddingClient(false);
                  setNewClient({ company_name: '', client_code: '', contact_name: '', email: '', phone: '' });
                }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedClients.map(client => (
                  editingClientId === client.id ? (
                    <tr key={client.id} className="editing-row">
                      <td><input value={editingClientData.company_name || ''} onChange={e => setEditingClientData({ ...editingClientData, company_name: e.target.value })} /></td>
                      <td><input value={editingClientData.client_code || ''} onChange={e => setEditingClientData({ ...editingClientData, client_code: e.target.value })} /></td>
                      <td><input value={editingClientData.contact_name || ''} onChange={e => setEditingClientData({ ...editingClientData, contact_name: e.target.value })} /></td>
                      <td><input value={editingClientData.email || ''} onChange={e => setEditingClientData({ ...editingClientData, email: e.target.value })} /></td>
                      <td><input value={editingClientData.phone || ''} onChange={e => setEditingClientData({ ...editingClientData, phone: e.target.value })} /></td>
                      <td>{client.order_count || 0}</td>
                      <td>
                        <div className="directory-row-actions">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveClient}>Save</button>
                          <button className="btn btn-small btn-xs" onClick={() => setEditingClientId(null)}>✕</button>
                          <button className="btn-delete btn-xs" onClick={e => handleDeleteClient(e, client.id, client.company_name)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={client.id}
                      className="directory-row"
                      onClick={() => { setEditingClientId(client.id); setEditingClientData({ ...client }); setAddingClient(false); }}
                    >
                      <td>{client.company_name}</td>
                      <td>{client.client_code}</td>
                      <td>{client.contact_name}</td>
                      <td>{client.email}</td>
                      <td>{client.phone}</td>
                      <td>{client.order_count || 0}</td>
                      <td>
                        <button className="btn-delete btn-xs" onClick={e => handleDeleteClient(e, client.id, client.company_name)}>🗑️</button>
                      </td>
                    </tr>
                  )
                ))}
                {pagedClients.length === 0 && (
                  <tr><td colSpan="7" className="empty-cell">{clientSearch ? 'No matches found.' : 'No clients yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {clientPages > 1 && (
            <div className="pagination">
              <button onClick={() => setClientPage(p => Math.max(1, p - 1))} disabled={clientPage === 1}>← Prev</button>
              <span>Page {clientPage} of {clientPages}</span>
              <button onClick={() => setClientPage(p => Math.min(clientPages, p + 1))} disabled={clientPage === clientPages}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Lenders Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'lenders' && (
        <div className="directory-section">
          <div className="directory-toolbar">
            <input
              type="text"
              placeholder="Search lenders…"
              value={lenderSearch}
              onChange={e => { setLenderSearch(e.target.value); setLenderPage(1); }}
              className="directory-search"
            />
            <button
              className="btn btn-primary"
              onClick={() => { setAddingLender(true); setEditingLenderId(null); }}
            >
              + Add New Lender
            </button>
          </div>

          <p className="directory-count">
            {filteredLenders.length} lender{filteredLenders.length !== 1 ? 's' : ''}
          </p>

          {addingLender && (
            <div className="directory-add-row">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    value={newLender.company_name}
                    onChange={e => setNewLender({ ...newLender, company_name: e.target.value })}
                    placeholder="First National Bank"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    value={newLender.contact_name}
                    onChange={e => setNewLender({ ...newLender, contact_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    value={newLender.address}
                    onChange={e => setNewLender({ ...newLender, address: e.target.value })}
                    placeholder="123 Bay St"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    value={newLender.city}
                    onChange={e => setNewLender({ ...newLender, city: e.target.value })}
                    placeholder="Toronto"
                  />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input
                    value={newLender.province}
                    onChange={e => setNewLender({ ...newLender, province: e.target.value })}
                    placeholder="ON"
                    maxLength="2"
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    value={newLender.postal_code}
                    onChange={e => setNewLender({ ...newLender, postal_code: e.target.value })}
                    placeholder="M5H 1A1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newLender.email}
                    onChange={e => setNewLender({ ...newLender, email: e.target.value })}
                    placeholder="contact@lender.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    value={newLender.phone}
                    onChange={e => setNewLender({ ...newLender, phone: e.target.value })}
                    placeholder="416-555-0200"
                  />
                </div>
              </div>
              <div className="directory-row-actions">
                <button className="btn btn-primary" onClick={handleCreateLender}>Save Lender</button>
                <button className="btn btn-small" onClick={() => {
                  setAddingLender(false);
                  setNewLender({ company_name: '', address: '', city: '', province: '', postal_code: '', contact_name: '', email: '', phone: '' });
                }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Prov</th>
                  <th>Postal</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedLenders.map(lender => (
                  editingLenderId === lender.id ? (
                    <tr key={lender.id} className="editing-row">
                      <td><input value={editingLenderData.company_name || ''} onChange={e => setEditingLenderData({ ...editingLenderData, company_name: e.target.value })} /></td>
                      <td><input value={editingLenderData.address || ''} onChange={e => setEditingLenderData({ ...editingLenderData, address: e.target.value })} /></td>
                      <td><input value={editingLenderData.city || ''} onChange={e => setEditingLenderData({ ...editingLenderData, city: e.target.value })} /></td>
                      <td><input value={editingLenderData.province || ''} onChange={e => setEditingLenderData({ ...editingLenderData, province: e.target.value })} maxLength="2" style={{ width: '3rem' }} /></td>
                      <td><input value={editingLenderData.postal_code || ''} onChange={e => setEditingLenderData({ ...editingLenderData, postal_code: e.target.value })} /></td>
                      <td><input value={editingLenderData.contact_name || ''} onChange={e => setEditingLenderData({ ...editingLenderData, contact_name: e.target.value })} /></td>
                      <td><input value={editingLenderData.email || ''} onChange={e => setEditingLenderData({ ...editingLenderData, email: e.target.value })} /></td>
                      <td><input value={editingLenderData.phone || ''} onChange={e => setEditingLenderData({ ...editingLenderData, phone: e.target.value })} /></td>
                      <td>
                        <div className="directory-row-actions">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveLender}>Save</button>
                          <button className="btn btn-small btn-xs" onClick={() => setEditingLenderId(null)}>✕</button>
                          <button className="btn-delete btn-xs" onClick={e => handleDeleteLender(e, lender.id, lender.company_name)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={lender.id}
                      className="directory-row"
                      onClick={() => { setEditingLenderId(lender.id); setEditingLenderData({ ...lender }); setAddingLender(false); }}
                    >
                      <td>{lender.company_name}</td>
                      <td>{lender.address}</td>
                      <td>{lender.city}</td>
                      <td>{lender.province}</td>
                      <td>{lender.postal_code}</td>
                      <td>{lender.contact_name}</td>
                      <td>{lender.email}</td>
                      <td>{lender.phone}</td>
                      <td>
                        <button className="btn-delete btn-xs" onClick={e => handleDeleteLender(e, lender.id, lender.company_name)}>🗑️</button>
                      </td>
                    </tr>
                  )
                ))}
                {pagedLenders.length === 0 && (
                  <tr><td colSpan="9" className="empty-cell">{lenderSearch ? 'No matches found.' : 'No lenders yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {lenderPages > 1 && (
            <div className="pagination">
              <button onClick={() => setLenderPage(p => Math.max(1, p - 1))} disabled={lenderPage === 1}>← Prev</button>
              <span>Page {lenderPage} of {lenderPages}</span>
              <button onClick={() => setLenderPage(p => Math.min(lenderPages, p + 1))} disabled={lenderPage === lenderPages}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Directory;
