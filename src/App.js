import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import {
  isAuthenticated,
  clearAuthToken,
  getInspections,
  deleteInspection as deleteInspectionAPI,
  getClients,
  getLenders,
} from './services/api';
import ImportData from './components/ImportData';
import ResponseLibrary from './components/ResponseLibrary';
import PropertyDetail from './components/PropertyDetail';
import Directory from './components/Directory';
import AccountSettings from './components/AccountSettings';
import AcceptInvite from './components/AcceptInvite';
import WorkfileDetail from './components/WorkfileDetail';
import NewWorkfileModal from './components/NewWorkfileModal';
import { searchProperties } from './services/api';

// ─── Status display helpers (used in sidebar cards) ───────────────────────────

const WORKFLOW_LABELS = {
  ordered: 'Ordered', attempting_contact: 'Attempting Contact', left_message: 'Left Message',
  awaiting_appointment: 'Awaiting Appt', appointment_scheduled: 'Appt Scheduled',
  inspection_complete: 'Inspection Done', additional_info_required: 'Info Required',
  reinspection_required: 'Re-inspection', drafting: 'Drafting', in_review: 'In Review',
  revision_required: 'Revision Req.', revision_complete: 'Revision Done',
  complete: 'Complete', delivered: 'Delivered', awaiting_payment: 'Awaiting Payment', closed: 'Closed',
};

const WORKFLOW_COLORS = {
  ordered: '#6b7280', attempting_contact: '#6b7280', left_message: '#6b7280',
  awaiting_appointment: '#3b82f6', appointment_scheduled: '#3b82f6',
  inspection_complete: '#f59e0b', additional_info_required: '#f59e0b', reinspection_required: '#f59e0b',
  drafting: '#f97316', in_review: '#f97316', revision_required: '#f97316', revision_complete: '#f97316',
  complete: '#22c55e', delivered: '#22c55e',
  awaiting_payment: '#ef4444', closed: '#374151',
};

// ─── Workfile sidebar card ────────────────────────────────────────────────────

function WorkfileCard({ inspection, isActive, onClick, onDelete, currentUser }) {
  const fileNum = inspection.appraiser_file_number || inspection.spoke_file_number;
  const status = inspection.workflow_status || 'ordered';
  const color = WORKFLOW_COLORS[status] || '#6b7280';

  return (
    <div className={`workfile-item${isActive ? ' active' : ''}`}>
      <div className="workfile-item-main" onClick={onClick}>
        <div className="workfile-item-top">
          <span className="workfile-file-number">{fileNum || '—'}</span>
          <span className="workflow-status-badge" style={{ background: color }}>
            {WORKFLOW_LABELS[status] || status}
          </span>
        </div>
        <div className="workfile-address">{inspection.property_data?.address || 'No address'}</div>
        <div className="workfile-meta">
          {inspection.property_data?.appraisalType && (
            <span className="inspection-type-badge">{inspection.property_data.appraisalType}</span>
          )}
          {inspection.property_data?.orderedByName && (
            <span className="workfile-client">{inspection.property_data.orderedByName}</span>
          )}
          <span className="workfile-date">{new Date(inspection.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      {currentUser?.role !== 'assistant' && (
        <button className="delete-btn" onClick={e => { e.stopPropagation(); onDelete(); }}>✕</button>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [selectedWorkfile, setSelectedWorkfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [currentView, setCurrentView] = useState('workfiles');
  const [showNewWorkfileModal, setShowNewWorkfileModal] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  // Properties view state
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertyDetailId, setPropertyDetailId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const hashMatch = window.location.hash.match(/^#\/invite\/([a-zA-Z0-9]+)$/);
      const searchInvite = new URLSearchParams(window.location.search).get('invite');
      const token = (hashMatch && hashMatch[1]) || searchInvite;
      if (token) { setInviteToken(token); setLoading(false); return; }

      if (isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        setIsLoggedIn(true);
        await loadWorkfiles();
        loadClientsAndLenders();
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const loadClientsAndLenders = () => {
    getClients().then(setClients).catch(err => console.error('Failed to load clients:', err));
    getLenders().then(setLenders).catch(err => console.error('Failed to load lenders:', err));
  };

  const loadWorkfiles = async () => {
    try {
      const list = await getInspections();
      setInspections(list);
      return list;
    } catch (err) {
      console.error('Error loading workfiles:', err);
      return [];
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    loadWorkfiles();
    loadClientsAndLenders();
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setInspections([]);
    setSelectedWorkfile(null);
  };

  const handleWorkfileSaved = async () => {
    const list = await loadWorkfiles();
    if (selectedWorkfile) {
      const fresh = list.find(i => i.id === selectedWorkfile.id);
      if (fresh) setSelectedWorkfile(fresh);
    }
  };

  const handleWorkfileCreated = async (newWorkfile) => {
    setShowNewWorkfileModal(false);
    setCurrentView('workfiles');
    await loadWorkfiles();
    setSelectedWorkfile(newWorkfile);
    setSidebarOpen(false);
  };

  const deleteWorkfile = async (id) => {
    if (!window.confirm('Delete this workfile? This cannot be undone.')) return;
    try {
      await deleteInspectionAPI(id);
      setInspections(prev => prev.filter(i => i.id !== id));
      if (selectedWorkfile?.id === id) setSelectedWorkfile(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete workfile');
    }
  };

  const selectWorkfile = (inspection) => {
    setSelectedWorkfile(inspection);
    setCurrentView('workfiles');
    setSidebarOpen(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <div className="loading">Loading...</div>;

  if (inviteToken) {
    return (
      <AcceptInvite
        token={inviteToken}
        onSuccess={(user) => {
          setInviteToken(null);
          window.history.replaceState(null, '', window.location.pathname);
          handleLoginSuccess(user);
        }}
      />
    );
  }

  if (!isLoggedIn) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="App">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />

      <header className="app-header">
        <h1>Spoke</h1>
        <div className="header-actions">
          <span className="user-info">👤 {currentUser?.full_name || currentUser?.email}</span>
          <button className="btn btn-small" onClick={() => setShowNewWorkfileModal(true)}>
            + New Workfile
          </button>
          <button className="btn btn-small btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            <button className={`nav-link${currentView === 'workfiles' ? ' active' : ''}`} onClick={() => { setCurrentView('workfiles'); setSidebarOpen(false); }}>Workfiles</button>
            <button className={`nav-link${currentView === 'properties' ? ' active' : ''}`} onClick={() => { setCurrentView('properties'); setSidebarOpen(false); }}>Properties</button>
            <button className={`nav-link${currentView === 'directory' ? ' active' : ''}`} onClick={() => { setCurrentView('directory'); setSidebarOpen(false); }}>📋 Directory</button>
            {currentUser?.role !== 'assistant' && (
              <button className={`nav-link${currentView === 'import' ? ' active' : ''}`} onClick={() => { setCurrentView('import'); setSidebarOpen(false); }}>Import Data</button>
            )}
            <button className={`nav-link${currentView === 'responses' ? ' active' : ''}`} onClick={() => { setCurrentView('responses'); setSidebarOpen(false); }}>Response Library</button>
            <button className={`nav-link${currentView === 'account' ? ' active' : ''}`} onClick={() => { setCurrentView('account'); setSidebarOpen(false); }}>⚙️ Account</button>
          </nav>

          <h3>My Workfiles ({inspections.length})</h3>
          <div className="workfile-list">
            {inspections.length === 0 ? (
              <p className="empty-state">No workfiles yet</p>
            ) : (
              inspections.map(inspection => (
                <WorkfileCard
                  key={inspection.id}
                  inspection={inspection}
                  isActive={selectedWorkfile?.id === inspection.id}
                  onClick={() => selectWorkfile(inspection)}
                  onDelete={() => deleteWorkfile(inspection.id)}
                  currentUser={currentUser}
                />
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          {currentView === 'import' && <ImportData onClose={() => setCurrentView('workfiles')} />}
          {currentView === 'responses' && <ResponseLibrary onClose={() => setCurrentView('workfiles')} userRole={currentUser?.role} />}
          {currentView === 'directory' && <Directory userRole={currentUser?.role} />}
          {currentView === 'account' && <AccountSettings currentUser={currentUser} onUserUpdate={setCurrentUser} />}

          {currentView === 'properties' && (
            <div className="properties-view">
              <div className="properties-search-bar">
                <input
                  type="text" placeholder="Search by address…"
                  value={propertySearchQuery}
                  onChange={async (e) => {
                    const q = e.target.value;
                    setPropertySearchQuery(q);
                    if (q.length >= 3) {
                      try { setPropertySearchResults(await searchProperties(q)); }
                      catch { /* silent */ }
                    } else {
                      setPropertySearchResults([]);
                    }
                  }}
                />
              </div>
              {propertySearchResults.length === 0 && propertySearchQuery.length >= 3 && (
                <p className="empty-state">No properties found.</p>
              )}
              {propertySearchResults.length === 0 && propertySearchQuery.length < 3 && (
                <p className="empty-state">Type at least 3 characters to search your property database.</p>
              )}
              <div className="property-results-list">
                {propertySearchResults.map(p => (
                  <div key={p.id} className="property-result-item" onClick={() => setPropertyDetailId(p.id)}>
                    <div className="property-result-address">{p.address}</div>
                    <div className="property-result-meta">
                      {[p.property_type, p.year_built && `Built ${p.year_built}`, p.bedrooms && `${p.bedrooms} bed`, p.city].filter(Boolean).join(' · ')}
                    </div>
                    {p.last_order_date && (
                      <div className="property-result-last">
                        Last activity: {new Date(p.last_order_date).toLocaleDateString()} · {p.last_client || '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'workfiles' && (
            selectedWorkfile ? (
              <WorkfileDetail
                key={selectedWorkfile.id}
                inspection={selectedWorkfile}
                clients={clients}
                lenders={lenders}
                currentUser={currentUser}
                onSaved={handleWorkfileSaved}
              />
            ) : (
              <div className="workfile-empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No Workfile Selected</h3>
                <p>Select a workfile from the sidebar, or create a new one to get started.</p>
                <button className="btn btn-primary" onClick={() => setShowNewWorkfileModal(true)}>
                  + New Workfile
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {showNewWorkfileModal && (
        <NewWorkfileModal
          clients={clients}
          lenders={lenders}
          onClose={() => setShowNewWorkfileModal(false)}
          onCreated={handleWorkfileCreated}
        />
      )}

      {propertyDetailId && (
        <PropertyDetail propertyId={propertyDetailId} onClose={() => setPropertyDetailId(null)} />
      )}
    </div>
  );
}

export default App;
