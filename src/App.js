import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import logoWhite from './assets/logo-white.svg';
import {
  isAuthenticated,
  clearAuthToken,
  getInspections,
  deleteInspection as deleteInspectionAPI,
  searchProperties,
} from './services/api';
import ImportData from './components/ImportData';
import ResponseLibrary from './components/ResponseLibrary';
import PropertyDetail from './components/PropertyDetail';
import Directory from './components/Directory';
import AccountSettings from './components/AccountSettings';
import AcceptInvite from './components/AcceptInvite';
import WorkfileHub from './components/WorkfileHub';
import NewWorkfileModal from './components/NewWorkfileModal';
import InspectionTool from './components/InspectionTool';
import PhotosPage from './components/PhotosPage';
import * as syncManager from './utils/syncManager';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [currentInspection, setCurrentInspection] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewWorkfileModal, setShowNewWorkfileModal] = useState(false);
  const [currentView, setCurrentView] = useState('workfiles');
  const [inviteToken, setInviteToken] = useState(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertyDetailId, setPropertyDetailId] = useState(null);
  const [workfileSearch, setWorkfileSearch] = useState('');
  const [workfileFilter, setWorkfileFilter] = useState('active');

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
      await loadInspectionsFromCloud();
      syncManager.startBackgroundSync();
      syncManager.processPendingQueue();
    }
    setLoading(false);
  };
  checkAuth();
}, []);

const loadInspectionsFromCloud = async () => {
  try {
    const cloudInspections = await getInspections();
    setInspections(cloudInspections);
  } catch (error) {
    console.error('Error loading inspections:', error);
    alert('Failed to load inspections from cloud');
  }
};

const handleLoginSuccess = (user) => {
  setCurrentUser(user);
  setIsLoggedIn(true);
  loadInspectionsFromCloud();
};

const handleWorkfileCreated = async (newInspection) => {
  setShowNewWorkfileModal(false);
  setCurrentInspection(newInspection.id);
  await loadInspectionsFromCloud();
  setCurrentView('workfile-hub');
};

const handleLogout = () => {
  syncManager.stopBackgroundSync();
  clearAuthToken();
  localStorage.removeItem('user');
  setIsLoggedIn(false);
  setCurrentUser(null);
  setInspections([]);
  setCurrentInspection(null);
  setCurrentView('workfiles');
};

const loadInspection = (inspection) => {
  setCurrentInspection(inspection.id);
};

const newInspection = () => {
  setCurrentInspection(null);
  setCurrentView('workfiles');
};

const deleteInspection = async (id) => {
  if (window.confirm('Delete this workfile?')) {
    try {
      await deleteInspectionAPI(id);
      setInspections(inspections.filter(i => i.id !== id));
      if (currentInspection === id) {
        newInspection();
      }
      alert('Workfile deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete workfile');
    }
  }
};

  const activeInspection = currentInspection
    ? inspections.find(i => i.id === currentInspection) ?? null
    : null;

const filteredWorkfiles = inspections.filter(w => {
  const isClosed = w.property_data?.workflowStatus === 'closed';
  if (workfileFilter === 'active' && isClosed) return false;
  if (workfileFilter === 'complete' && !isClosed) return false;
  if (!workfileSearch.trim()) return true;
  const q = workfileSearch.toLowerCase();
  return (
    (w.property_data?.address || '').toLowerCase().includes(q) ||
    (w.property_data?.fileNumber || '').toLowerCase().includes(q) ||
    (w.property_data?.clientName || '').toLowerCase().includes(q)
  );
});

if (loading) {
  return <div className="loading">Loading...</div>;
}

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

if (!isLoggedIn) {
  return <Login onLoginSuccess={handleLoginSuccess} />;
}

return (
  <div className="App">
    {currentView !== 'inspection-tool' && (
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>
    )}

    <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>

  <header className="app-header">
    <img src={logoWhite} alt="Spoke" className="header-logo" />
    <div className="header-actions">
      <span className="user-info">{currentUser?.full_name || currentUser?.email}</span>
      <button className="btn btn-small btn-gold" onClick={() => setShowNewWorkfileModal(true)}>
        + New Workfile
      </button>
      <button className="btn btn-small btn-logout" onClick={handleLogout}>
        Logout
      </button>
    </div>
  </header>

      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            <button className={`nav-link ${currentView === 'workfiles' ? 'active' : ''}`} onClick={() => { setCurrentView('workfiles'); setSidebarOpen(false); }}>My Workfiles</button>
            <button className={`nav-link ${currentView === 'properties' ? 'active' : ''}`} onClick={() => { setCurrentView('properties'); setSidebarOpen(false); }}>Properties</button>
            <button className={`nav-link ${currentView === 'directory' ? 'active' : ''}`} onClick={() => { setCurrentView('directory'); setSidebarOpen(false); }}>📋 Directory</button>
            {currentUser?.role !== 'assistant' && (
              <button className={`nav-link ${currentView === 'import' ? 'active' : ''}`} onClick={() => { setCurrentView('import'); setSidebarOpen(false); }}>Import Data</button>
            )}
            <button className={`nav-link ${currentView === 'responses' ? 'active' : ''}`} onClick={() => { setCurrentView('responses'); setSidebarOpen(false); }}>Response Library</button>
            <button className={`nav-link ${currentView === 'account' ? 'active' : ''}`} onClick={() => { setCurrentView('account'); setSidebarOpen(false); }}>⚙️ Account</button>
          </nav>
          <h3>My Workfiles ({inspections.length})</h3>
          <div className="inspection-list">
            {inspections.length === 0 ? (
              <p className="empty-state">No saved workfiles</p>
            ) : (
              inspections.map(inspection => (
                <div
                  key={inspection.id}
                  className={`inspection-item ${currentInspection === inspection.id ? 'active' : ''}`}
                >
                  <div onClick={() => {
                    loadInspection(inspection);
                    setCurrentView('workfile-hub');
                    setSidebarOpen(false);
                  }} className="inspection-content">
                    <strong>{inspection.property_data?.address || 'Untitled'}</strong>
                    <div className="inspection-card-meta">
                      {inspection.property_data?.appraisalType && (
                        <span className="inspection-type-badge">
                          {inspection.property_data.appraisalType}
                        </span>
                      )}
                      <small className="inspection-card-date">
                        {new Date(inspection.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => deleteInspection(inspection.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          {currentView === 'workfiles' && (
            <div className="workfiles-list-view">
              <div className="workfiles-list-header">
                <h2>My Workfiles</h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowNewWorkfileModal(true)}>+ New Workfile</button>
              </div>
              <div className="workfiles-toolbar">
                <input
                  className="workfiles-search"
                  placeholder="Search by address, file #, or client…"
                  value={workfileSearch}
                  onChange={e => setWorkfileSearch(e.target.value)}
                />
                <div className="workfiles-filter-tabs">
                  {[['active', 'Active'], ['complete', 'Complete'], ['all', 'All']].map(([val, label]) => (
                    <button
                      key={val}
                      className={`filter-tab ${workfileFilter === val ? 'active' : ''}`}
                      onClick={() => setWorkfileFilter(val)}
                    >{label}</button>
                  ))}
                </div>
              </div>
              {filteredWorkfiles.length === 0 ? (
                <p className="empty-state">No workfiles found.</p>
              ) : (
                <table className="workfiles-table">
                  <thead>
                    <tr>
                      <th>File #</th>
                      <th>Address</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Client</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkfiles.map(w => (
                      <tr
                        key={w.id}
                        className="workfile-row"
                        onClick={() => {
                          loadInspection(w);
                          setCurrentView('workfile-hub');
                          setSidebarOpen(false);
                        }}
                      >
                        <td>{w.property_data?.fileNumber || '—'}</td>
                        <td className="wf-address">{w.property_data?.address || 'Untitled'}</td>
                        <td>
                          {w.property_data?.appraisalType
                            ? <span className="inspection-type-badge">{w.property_data.appraisalType}</span>
                            : '—'}
                        </td>
                        <td>
                          <span className={`wf-status-badge ${w.property_data?.workflowStatus === 'closed' ? 'wf-status-complete' : 'wf-status-active'}`}>
                            {w.property_data?.workflowStatus || 'Active'}
                          </span>
                        </td>
                        <td>{w.property_data?.clientName || '—'}</td>
                        <td>{new Date(w.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {currentView === 'import' && <ImportData onClose={() => setCurrentView('workfiles')} />}
          {currentView === 'responses' && <ResponseLibrary onClose={() => setCurrentView('workfiles')} userRole={currentUser?.role} />}
          {currentView === 'directory' && <Directory userRole={currentUser?.role} />}
          {currentView === 'account' && <AccountSettings currentUser={currentUser} onUserUpdate={setCurrentUser} />}
          {currentView === 'properties' && (
            <div className="properties-view">
              <div className="properties-search-bar">
                <input
                  type="text"
                  placeholder="Search by address…"
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
          {currentView === 'workfile-hub' && activeInspection && (
            <WorkfileHub
              inspection={activeInspection}
              onInspectionUpdate={loadInspectionsFromCloud}
              onNavigate={async view => {
                if (view === 'inspection') {
                  setCurrentView('inspection-tool');
                } else if (view === 'photos') {
                  await loadInspectionsFromCloud();
                  setCurrentView('photos-page');
                } else {
                  setCurrentView('workfile-hub');
                }
                setSidebarOpen(false);
              }}
            />
          )}
          {currentView === 'photos-page' && activeInspection && (
            <PhotosPage
              inspection={activeInspection}
              onBack={() => setCurrentView('workfile-hub')}
            />
          )}
          {currentView === 'inspection-tool' && activeInspection && (
            <InspectionTool
              inspection={activeInspection}
              onBack={() => setCurrentView('workfile-hub')}
              onComplete={loadInspectionsFromCloud}
            />
          )}
        </main>
      </div>
      {propertyDetailId && (
        <PropertyDetail propertyId={propertyDetailId} onClose={() => setPropertyDetailId(null)} />
      )}
      {showNewWorkfileModal && (
        <NewWorkfileModal
          onCreated={handleWorkfileCreated}
          onCancel={() => setShowNewWorkfileModal(false)}
        />
      )}
    </div>
  );
}

export default App;
