import { useState, useEffect, useRef } from 'react';
import './App.css';
import Login from './components/Login';
import logoWhite from './assets/logo-white.svg';
import {
  isAuthenticated,
  clearAuthToken,
  getInspections,
  createInspection,
  updateInspection,
  deleteInspection as deleteInspectionAPI,
  uploadPhoto,
  getPhotos,
  deletePhoto as deletePhotoAPI,
  updatePhoto as updatePhotoAPI,
  searchProperties,
} from './services/api';
import ImportData from './components/ImportData';
import ResponseLibrary from './components/ResponseLibrary';
import PropertyDetail from './components/PropertyDetail';
import Directory from './components/Directory';
import AccountSettings from './components/AccountSettings';
import AcceptInvite from './components/AcceptInvite';
import WorkfileHub from './components/WorkfileHub';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [currentInspection, setCurrentInspection] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('inspection');
  const [inviteToken, setInviteToken] = useState(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertyDetailId, setPropertyDetailId] = useState(null);
  const [workfileSearch, setWorkfileSearch] = useState('');
  const [workfileFilter, setWorkfileFilter] = useState('active');
  const [propertyData, setPropertyData] = useState({
    appraisalType: '',
    address: '',
    clientName: '',
    inspectionDate: '',
    
    // Building Details
    yearBuilt: '',
    propertyType: '',
    propertyTypeOther: '',
    designStyle: '',
    designStyleOther: '',
    construction: '',
    constructionOther: '',
    foundationWalls: 'Concrete',
    foundationWallsOther: '',
    
    // Exterior
    roofing: '',
    roofingOther: '',
    roofingCondition: 'Average',
    exteriorFinish: '',
    exteriorFinishOther: '',
    exteriorCondition: 'Average',
    windows: '',
    windowsOther: '',
    
    // Systems
    heatingSystem: '',
    heatingSystemOther: '',
    heatingFuel: '',
    heatingFuelOther: '',
    coolingSystem: '',
    coolingSystemOther: '',
    electrical: 'Breakers',
    ampRating: '100',
    waterHeater: '',
    waterHeaterOther: '',
    
    // Interior
    wallFinish: 'Drywall',
    ceilingFinish: 'Drywall',
    flooring1: '',
    flooring1Other: '',
    flooring2: '',
    flooring2Other: '',
    flooring3: '',
    flooring3Other: '',
    flooring4: '',
    flooring4Other: '',
    flooring5: '',
    flooring5Other: '',
    
    // Built-ins & Appliances
    builtInCooktop: false,
    builtInOven: false,
    builtInDishwasher: false,
    builtInMicrowave: false,
    builtInGarburator: false,
    builtInRangeHood: false,
    
    // Basement
    hasBasement: true,
    basementArea: '',
    basementFinishPercent: '',
    
    // Site & Utilities
    utilityNaturalGas: false,
    utilityStormSewer: false,
    utilitySanitarySewer: false,
    utilitySeptic: false,
    utilityHoldingTank: false,
    utilityOpenDitch: false,
    waterMunicipal: false,
    waterPrivateWell: false,
    electricalOverhead: false,
    electricalUnderground: false,
    featurePavedRoad: false,
    featureGravelRoad: false,
    featureLane: false,
    featureSidewalk: false,
    featureCurbs: false,
    featureStreetlights: false,
    landscaping: 'Average',
    inFloodplain: false,
    floodMapDate: '',
    
    // Garage/Parking
    garageType: '',
    garageSize: '',
    drivewayType: '',
    drivewayTypeOther: '',
    lotSize: '',
    zoning: '',
    zoningDescription: ''
  });

  const [roomAllocation, setRoomAllocation] = useState({
    main: {
      entrance: 0,
      living: 0,
      dining: 0,
      kitchen: 0,
      family: 0,
      bedrooms: 0,
      den: 0,
      fullBath: 0,
      partBath: 0,
      laundry: 0,
      other: 0,
      sqft: ''
    },
    second: {
      entrance: 0,
      living: 0,
      dining: 0,
      kitchen: 0,
      family: 0,
      bedrooms: 0,
      den: 0,
      fullBath: 0,
      partBath: 0,
      laundry: 0,
      other: 0,
      sqft: ''
    },
    third: {
      entrance: 0,
      living: 0,
      dining: 0,
      kitchen: 0,
      family: 0,
      bedrooms: 0,
      den: 0,
      fullBath: 0,
      partBath: 0,
      laundry: 0,
      other: 0,
      sqft: ''
    },
    basement: {
      entrance: 0,
      living: 0,
      dining: 0,
      kitchen: 0,
      family: 0,
      bedrooms: 0,
      den: 0,
      fullBath: 0,
      partBath: 0,
      laundry: 0,
      other: 0,
      sqft: ''
    }
  });

  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const photoNoteTimers = useRef({});
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({
    property: true,
    building: true,
    exterior: false,
    systems: false,
    interior: false,
    builtins: false,
    rooms: false,
    basement: false,
    site: false
  });

// Check authentication on mount
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

const handleLogout = () => {
  clearAuthToken();
  localStorage.removeItem('user');
  setIsLoggedIn(false);
  setCurrentUser(null);
  setInspections([]);
  setCurrentInspection(null);
  newInspection();
};

const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPropertyData({
      ...propertyData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRoomChange = (level, room, value) => {
    setRoomAllocation({
      ...roomAllocation,
      [level]: {
        ...roomAllocation[level],
        [room]: value === '' ? '' : parseInt(value) || 0
      }
    });
  };

  const calculateTotalRooms = (level) => {
    const rooms = roomAllocation[level];
    return (rooms.entrance || 0) + (rooms.living || 0) + (rooms.dining || 0) + 
           (rooms.kitchen || 0) + (rooms.family || 0) + (rooms.bedrooms || 0) + 
           (rooms.den || 0) + (rooms.fullBath || 0) + (rooms.partBath || 0) + 
           (rooms.laundry || 0) + (rooms.other || 0);
  };

  const calculateGrandTotals = () => {
    const levels = ['main', 'second', 'third'];
    let totalBedrooms = 0;
    let totalFullBath = 0;
    let totalPartBath = 0;
    let totalSqft = 0;
    let totalRooms = 0;

    levels.forEach(level => {
      totalBedrooms += roomAllocation[level].bedrooms || 0;
      totalFullBath += roomAllocation[level].fullBath || 0;
      totalPartBath += roomAllocation[level].partBath || 0;
      const sqft = parseInt(roomAllocation[level].sqft) || 0;
      totalSqft += sqft;
      totalRooms += calculateTotalRooms(level);
    });

    return { totalBedrooms, totalFullBath, totalPartBath, totalSqft, totalRooms };
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const handlePhotoUpload = async (e) => {
    if (!currentInspection) return;
    const files = Array.from(e.target.files);
    e.target.value = '';

    for (const file of files) {
      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      setUploadingPhotos(prev => [...prev, { tempId, filename: file.name, progress: 0 }]);

      try {
        const saved = await uploadPhoto(currentInspection, file, 'untagged', (pct) => {
          setUploadingPhotos(prev =>
            prev.map(u => u.tempId === tempId ? { ...u, progress: pct } : u)
          );
        });
        setPhotos(prev => [...prev, saved]);
      } catch (err) {
        console.error('Photo upload failed:', err);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploadingPhotos(prev => prev.filter(u => u.tempId !== tempId));
      }
    }
  };

 const updatePhoto = async (photoId, updates) => {
  try {
    await updatePhotoAPI(photoId, updates);
    setPhotos(photos.map(photo =>
      photo.id === photoId ? { ...photo, ...updates } : photo
    ));
  } catch (error) {
    console.error('Failed to update photo:', error);
  }
};

const updatePhotoRoom = async (photoId, room) => {
  setPhotos(photos.map(photo => photo.id === photoId ? { ...photo, room } : photo));
  try {
    await updatePhoto(photoId, { room });
  } catch (err) {
    console.error('Failed to update photo room:', err);
  }
};

  const updatePhotoNotes = (photoId, notes) => {
    setPhotos(photos.map(photo => photo.id === photoId ? { ...photo, notes } : photo));
    clearTimeout(photoNoteTimers.current[photoId]);
    photoNoteTimers.current[photoId] = setTimeout(async () => {
      try {
        await updatePhoto(photoId, { notes });
      } catch (err) {
        console.error('Failed to update photo notes:', err);
      }
    }, 800);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deletePhotoAPI(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo');
    }
  };

const saveInspection = async () => {
  try {
    const inspectionData = {
      property: propertyData,
      roomAllocation: roomAllocation,
      photos: photos.map(p => ({
        id: p.id,
        filename: p.filename,
        room: p.room,
        notes: p.notes
      }))
    };

if (currentInspection) {
  // Update existing
  await updateInspection(currentInspection, inspectionData);
  await loadInspectionsFromCloud();
  alert('Workfile updated successfully!');
} else {
  // Create new
  const created = await createInspection(inspectionData);
  setCurrentInspection(created.id);
  // Reload all inspections from cloud
  await loadInspectionsFromCloud();
  alert('Workfile saved to cloud!');
}
  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save workfile. Please try again.');
  }
};

  const loadInspection = async (inspection) => {
    setCurrentInspection(inspection.id);
    setPropertyData(inspection.property_data);
    setRoomAllocation(inspection.room_allocation || {
      main: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      second: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      third: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      basement: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' }
    });
    setPhotos([]);
    try {
      const cloudPhotos = await getPhotos(inspection.id);
      setPhotos(cloudPhotos);
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  };

  const newInspection = () => {
    if (photos.length > 0 || propertyData.address) {
      if (!window.confirm('Start new workfile? Unsaved changes will be lost.')) {
        return;
      }
    }
    setCurrentInspection(null);
    setPropertyData({
      appraisalType: '',
      address: '',
      clientName: '',
      inspectionDate: '',
      yearBuilt: '',
      propertyType: '',
      propertyTypeOther: '',
      designStyle: '',
      designStyleOther: '',
      construction: '',
      constructionOther: '',
      foundationWalls: 'Concrete',
      foundationWallsOther: '',
      roofing: '',
      roofingOther: '',
      roofingCondition: 'Average',
      exteriorFinish: '',
      exteriorFinishOther: '',
      exteriorCondition: 'Average',
      windows: '',
      windowsOther: '',
      heatingSystem: '',
      heatingSystemOther: '',
      heatingFuel: '',
      heatingFuelOther: '',
      coolingSystem: '',
      coolingSystemOther: '',
      electrical: 'Breakers',
      ampRating: '100',
      waterHeater: '',
      waterHeaterOther: '',
      wallFinish: 'Drywall',
      ceilingFinish: 'Drywall',
      flooring1: '',
      flooring1Other: '',
      flooring2: '',
      flooring2Other: '',
      flooring3: '',
      flooring3Other: '',
      flooring4: '',
      flooring4Other: '',
      flooring5: '',
      flooring5Other: '',
      builtInCooktop: false,
      builtInOven: false,
      builtInDishwasher: false,
      builtInMicrowave: false,
      builtInGarburator: false,
      builtInRangeHood: false,
      hasBasement: true,
      basementArea: '',
      basementFinishPercent: '',
      utilityNaturalGas: false,
      utilityStormSewer: false,
      utilitySanitarySewer: false,
      utilitySeptic: false,
      utilityHoldingTank: false,
      utilityOpenDitch: false,
      waterMunicipal: false,
      waterPrivateWell: false,
      electricalOverhead: false,
      electricalUnderground: false,
      featurePavedRoad: false,
      featureGravelRoad: false,
      featureLane: false,
      featureSidewalk: false,
      featureCurbs: false,
      featureStreetlights: false,
      landscaping: 'Average',
      inFloodplain: false,
      floodMapDate: '',
      garageType: '',
      garageSize: '',
      drivewayType: '',
      drivewayTypeOther: '',
      lotSize: '',
      zoning: '',
      zoningDescription: ''
    });
    setRoomAllocation({
      main: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      second: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      third: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' },
      basement: { entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0, bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '' }
    });
    setPhotos([]);
    setCurrentView('inspection');
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

  const generateReport = () => {
    const totals = calculateGrandTotals();
    const report = {
      property: propertyData,
      roomAllocation: {
        ...roomAllocation,
        totals: totals
      },
      photos: photos.map(p => ({
        filename: p.filename,
        room: p.room,
        notes: p.notes
      })),
      photosByRoom: {}
    };

    roomTypes.forEach(room => {
      const roomPhotos = photos.filter(p => p.room === room);
      if (roomPhotos.length > 0) {
        report.photosByRoom[room] = roomPhotos.length;
      }
    });

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appraisal-${propertyData.address || 'draft'}-${Date.now()}.json`;
    link.click();
  };

  const roomTypes = [
    'Exterior - Front',
    'Exterior - Rear',
    'Kitchen',
    'Living Room',
    'Master Bedroom',
    'Bathroom',
    'Basement',
    'Other'
  ];

  const propertyTypes = ['Detached', 'Semi-Detached', 'Townhouse', 'Condominium', 'Duplex', 'Triplex', 'Other'];
  const designStyles = ['Bungalow', '2-Storey', '1.5-Storey', 'Split-Level', 'Back-Split', 'Side-Split', 'Raised Bungalow', 'Other'];
  const constructionTypes = ['Wood Frame', 'Brick', 'Concrete Block', 'Steel Frame', 'Log', 'Other'];
  const foundationTypes = ['Concrete', 'Block', 'Stone', 'Preserved Wood', 'Other'];
  const roofingTypes = ['Asphalt Shingle', 'Metal', 'Tile', 'Flat/Built-up', 'Cedar Shake', 'Rubber Membrane', 'Other'];
  const exteriorFinishTypes = ['Brick', 'Vinyl Siding', 'Aluminum Siding', 'Wood Siding', 'Stucco', 'Stone', 'EIFS', 'Combination', 'Other'];
  const windowTypes = ['Vinyl', 'Wood', 'Aluminum', 'Vinyl Clad Wood', 'Aluminum Clad Wood', 'Other'];
  const heatingTypes = ['Forced Air Gas', 'Forced Air Oil', 'Forced Air Electric', 'Hot Water Radiators', 'Baseboard Heaters', 'Heat Pump', 'In-Floor Radiant', 'Geothermal', 'Other'];
  const fuelTypes = ['Natural Gas', 'Propane', 'Oil', 'Electric', 'Wood', 'Other'];
  const coolingTypes = ['Central Air', 'Heat Pump', 'Window Units', 'Mini-Split', 'None', 'Other'];
  const waterHeaterTypes = ['Gas - Tank', 'Gas - Tankless', 'Electric - Tank', 'Electric - Tankless', 'Heat Pump', 'Solar', 'Other'];
  const flooringTypes = ['Hardwood', 'Laminate', 'Engineered Hardwood', 'Vinyl Plank', 'Tile', 'Carpet', 'Concrete', 'Cork', 'Bamboo', 'Mixed', 'Other'];
  const drivewayTypes = ['Private', 'Shared', 'Mutual', 'None', 'Other'];
  const zoningTypes = ['Residential', 'Industrial', 'Agricultural', 'Multi-Residential', 'Other'];

 const totals = calculateGrandTotals();
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

// Show login screen if not authenticated
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
    <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
      ☰
    </button>
    
    <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>
    
  <header className="app-header">
    <img src={logoWhite} alt="Spoke" className="header-logo" />
    <div className="header-actions">
      <span className="user-info">{currentUser?.full_name || currentUser?.email}</span>
      <button className="btn btn-small btn-gold" onClick={newInspection}>
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
                    const hasHub = inspection.workfile_data && Object.keys(inspection.workfile_data).length > 0;
                    loadInspection(inspection);
                    setCurrentView(hasHub ? 'workfile-hub' : 'inspection');
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
                <button className="btn btn-primary btn-small" onClick={newInspection}>+ New Workfile</button>
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
                          const hasHub = w.workfile_data && Object.keys(w.workfile_data).length > 0;
                          loadInspection(w);
                          setCurrentView(hasHub ? 'workfile-hub' : 'inspection');
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
              onNavigate={() => { setCurrentView('inspection'); setSidebarOpen(false); }}
            />
          )}
          {currentView === 'inspection' && <>
          {/* Property Information */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('property')}>
              <h2>Property Information</h2>
              <span className="toggle-icon">{expandedSections.property ? '▼' : '▶'}</span>
            </div>
            
            <div className="form-group">
              <label>Appraisal Type:</label>
              <select
                name="appraisalType"
                value={propertyData.appraisalType}
                onChange={handleChange}
                className="appraisal-type-select"
              >
                <option value="">-- Select Appraisal Type --</option>
                <option value="Full Appraisal">Full Appraisal</option>
                <option value="Drive-By">Drive-By</option>
                <option value="Desktop">Desktop</option>
                <option value="Market Rent">Market Rent</option>
                <option value="Progress Inspection">Progress Inspection</option>
              </select>
            </div>

            {expandedSections.property && (
              <div className="section-content">
                <div className="form-group">
                  <label>Property Address:</label>
                  <input
                    type="text"
                    name="address"
                    value={propertyData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, Toronto, ON"
                  />
                </div>

                <div className="form-group">
                  <label>Client Name:</label>
                  <input
                    type="text"
                    name="clientName"
                    value={propertyData.clientName}
                    onChange={handleChange}
                    placeholder="John Smith"
                  />
                </div>

                <div className="form-group">
                  <label>Inspection Date:</label>
                  <input
                    type="date"
                    name="inspectionDate"
                    value={propertyData.inspectionDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Building Details */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('building')}>
              <h2>Building Details</h2>
              <span className="toggle-icon">{expandedSections.building ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.building && (
              <div className="section-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Year Built:</label>
                    <input
                      type="number"
                      name="yearBuilt"
                      value={propertyData.yearBuilt}
                      onChange={handleChange}
                      placeholder="2020"
                    />
                  </div>

                  <div className="form-group">
                    <label>Property Type:</label>
                    <select name="propertyType" value={propertyData.propertyType} onChange={handleChange}>
                      <option value="">Select...</option>
                      {propertyTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.propertyType === 'Other' && (
                      <input type="text" name="propertyTypeOther" value={propertyData.propertyTypeOther} onChange={handleChange} placeholder="Specify property type..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Design/Style:</label>
                    <select name="designStyle" value={propertyData.designStyle} onChange={handleChange}>
                      <option value="">Select...</option>
                      {designStyles.map(style => <option key={style} value={style}>{style}</option>)}
                    </select>
                    {propertyData.designStyle === 'Other' && (
                      <input type="text" name="designStyleOther" value={propertyData.designStyleOther} onChange={handleChange} placeholder="Specify design style..." className="other-input" />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Construction:</label>
                    <select name="construction" value={propertyData.construction} onChange={handleChange}>
                      <option value="">Select...</option>
                      {constructionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.construction === 'Other' && (
                      <input type="text" name="constructionOther" value={propertyData.constructionOther} onChange={handleChange} placeholder="Specify construction type..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Foundation Walls:</label>
                    <select name="foundationWalls" value={propertyData.foundationWalls} onChange={handleChange}>
                      {foundationTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.foundationWalls === 'Other' && (
                      <input type="text" name="foundationWallsOther" value={propertyData.foundationWallsOther} onChange={handleChange} placeholder="Specify foundation type..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Windows:</label>
                    <select name="windows" value={propertyData.windows} onChange={handleChange}>
                      <option value="">Select...</option>
                      {windowTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.windows === 'Other' && (
                      <input type="text" name="windowsOther" value={propertyData.windowsOther} onChange={handleChange} placeholder="Specify window type..." className="other-input" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exterior */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('exterior')}>
              <h2>Exterior</h2>
              <span className="toggle-icon">{expandedSections.exterior ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.exterior && (
              <div className="section-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Roofing:</label>
                    <select name="roofing" value={propertyData.roofing} onChange={handleChange}>
                      <option value="">Select...</option>
                      {roofingTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.roofing === 'Other' && (
                      <input type="text" name="roofingOther" value={propertyData.roofingOther} onChange={handleChange} placeholder="Specify roofing type..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Roofing Condition:</label>
                    <div className="radio-group">
                      {['Good', 'Average', 'Fair', 'Poor'].map(condition => (
                        <label key={condition} className="radio-label">
                          <input type="radio" name="roofingCondition" value={condition} checked={propertyData.roofingCondition === condition} onChange={handleChange} />
                          {condition}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Exterior Finish:</label>
                    <select name="exteriorFinish" value={propertyData.exteriorFinish} onChange={handleChange}>
                      <option value="">Select...</option>
                      {exteriorFinishTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.exteriorFinish === 'Other' && (
                      <input type="text" name="exteriorFinishOther" value={propertyData.exteriorFinishOther} onChange={handleChange} placeholder="Specify exterior finish..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Exterior Condition:</label>
                    <div className="radio-group">
                      {['Good', 'Average', 'Fair', 'Poor'].map(condition => (
                        <label key={condition} className="radio-label">
                          <input type="radio" name="exteriorCondition" value={condition} checked={propertyData.exteriorCondition === condition} onChange={handleChange} />
                          {condition}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Systems */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('systems')}>
              <h2>Systems</h2>
              <span className="toggle-icon">{expandedSections.systems ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.systems && (
              <div className="section-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Heating System:</label>
                    <select name="heatingSystem" value={propertyData.heatingSystem} onChange={handleChange}>
                      <option value="">Select...</option>
                      {heatingTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.heatingSystem === 'Other' && (
                      <input type="text" name="heatingSystemOther" value={propertyData.heatingSystemOther} onChange={handleChange} placeholder="Specify heating system..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Fuel Type:</label>
                    <select name="heatingFuel" value={propertyData.heatingFuel} onChange={handleChange}>
                      <option value="">Select...</option>
                      {fuelTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.heatingFuel === 'Other' && (
                      <input type="text" name="heatingFuelOther" value={propertyData.heatingFuelOther} onChange={handleChange} placeholder="Specify fuel type..." className="other-input" />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cooling System:</label>
                    <select name="coolingSystem" value={propertyData.coolingSystem} onChange={handleChange}>
                      <option value="">Select...</option>
                      {coolingTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.coolingSystem === 'Other' && (
                      <input type="text" name="coolingSystemOther" value={propertyData.coolingSystemOther} onChange={handleChange} placeholder="Specify cooling system..." className="other-input" />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Water Heater:</label>
                    <select name="waterHeater" value={propertyData.waterHeater} onChange={handleChange}>
                      <option value="">Select...</option>
                      {waterHeaterTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.waterHeater === 'Other' && (
                      <input type="text" name="waterHeaterOther" value={propertyData.waterHeaterOther} onChange={handleChange} placeholder="Specify water heater type..." className="other-input" />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Electrical:</label>
                    <select name="electrical" value={propertyData.electrical} onChange={handleChange}>
                      <option value="Breakers">Breakers</option>
                      <option value="Fuses">Fuses</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amp Rating:</label>
                    <select name="ampRating" value={propertyData.ampRating} onChange={handleChange}>
                      <option value="60">60</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="400">400</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interior Finishes */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('interior')}>
              <h2>Interior Finishes</h2>
              <span className="toggle-icon">{expandedSections.interior ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.interior && (
              <div className="section-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Wall Finish:</label>
                    <select name="wallFinish" value={propertyData.wallFinish} onChange={handleChange}>
                      <option value="Drywall">Drywall</option>
                      <option value="Plaster">Plaster</option>
                      <option value="Paneling">Paneling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ceiling Finish:</label>
                    <select name="ceilingFinish" value={propertyData.ceilingFinish} onChange={handleChange}>
                      <option value="Drywall">Drywall</option>
                      <option value="Plaster">Plaster</option>
                      <option value="Textured">Textured</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {[1, 2, 3, 4, 5].map(num => (
                  <div key={num} className="form-group">
                    <label>Flooring {num}:</label>
                    <select name={`flooring${num}`} value={propertyData[`flooring${num}`]} onChange={handleChange}>
                      <option value="">Select...</option>
                      {flooringTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData[`flooring${num}`] === 'Other' && (
                      <input 
                        type="text" 
                        name={`flooring${num}Other`} 
                        value={propertyData[`flooring${num}Other`]} 
                        onChange={handleChange} 
                        placeholder="Specify flooring type..." 
                        className="other-input" 
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Built-ins & Appliances */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('builtins')}>
              <h2>Built-ins & Appliances</h2>
              <span className="toggle-icon">{expandedSections.builtins ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.builtins && (
              <div className="section-content">
                <div className="checkbox-grid">
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInCooktop" checked={propertyData.builtInCooktop} onChange={handleChange} />
                    Cooktop
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInOven" checked={propertyData.builtInOven} onChange={handleChange} />
                    Oven
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInDishwasher" checked={propertyData.builtInDishwasher} onChange={handleChange} />
                    Dishwasher
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInMicrowave" checked={propertyData.builtInMicrowave} onChange={handleChange} />
                    Microwave
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInGarburator" checked={propertyData.builtInGarburator} onChange={handleChange} />
                    Garburator
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" name="builtInRangeHood" checked={propertyData.builtInRangeHood} onChange={handleChange} />
                    Range Hood
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Room Allocation */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('rooms')}>
              <h2>Room Allocation</h2>
              <span className="toggle-icon">{expandedSections.rooms ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.rooms && (
              <div className="section-content">
                <div className="room-table-container">
                  <table className="room-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Entrance</th>
                        <th>Living</th>
                        <th>Dining</th>
                        <th>Kitchen</th>
                        <th>Family</th>
                        <th>Bedrooms</th>
                        <th>Den</th>
                        <th>Full Bath</th>
                        <th>Part Bath</th>
                        <th>Laundry</th>
                        <th>Other</th>
                        <th>Total Rooms</th>
                        <th>Area (SqFt)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['main', 'second', 'third'].map(level => (
                        <tr key={level}>
                          <td className="level-name">{level.charAt(0).toUpperCase() + level.slice(1)}</td>
                          {['entrance', 'living', 'dining', 'kitchen', 'family', 'bedrooms', 'den', 'fullBath', 'partBath', 'laundry', 'other'].map(room => (
                            <td key={room}>
                              <input
                                type="number"
                                min="0"
                                value={roomAllocation[level][room]}
                                onChange={(e) => handleRoomChange(level, room, e.target.value)}
                                className="room-input"
                              />
                            </td>
                          ))}
                          <td className="total-cell">{calculateTotalRooms(level)}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={roomAllocation[level].sqft}
                              onChange={(e) => handleRoomChange(level, 'sqft', e.target.value)}
                              className="sqft-input"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="totals-row">
                        <td colSpan="6" className="totals-label">Above Grade Totals:</td>
                        <td className="total-cell">{totals.totalBedrooms}</td>
                        <td></td>
                        <td className="total-cell">{totals.totalFullBath}</td>
                        <td className="total-cell">{totals.totalPartBath}</td>
                        <td></td>
                        <td></td>
                        <td className="total-cell">{totals.totalRooms}</td>
                        <td className="total-cell">{totals.totalSqft}</td>
                      </tr>
                      <tr>
                        <td className="level-name">Basement</td>
                        {['entrance', 'living', 'dining', 'kitchen', 'family', 'bedrooms', 'den', 'fullBath', 'partBath', 'laundry', 'other'].map(room => (
                          <td key={room}>
                            <input
                              type="number"
                              min="0"
                              value={roomAllocation.basement[room]}
                              onChange={(e) => handleRoomChange('basement', room, e.target.value)}
                              className="room-input"
                            />
                          </td>
                        ))}
                        <td className="total-cell">{calculateTotalRooms('basement')}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={roomAllocation.basement.sqft}
                            onChange={(e) => handleRoomChange('basement', 'sqft', e.target.value)}
                            className="sqft-input"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Basement */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('basement')}>
              <h2>Basement</h2>
              <span className="toggle-icon">{expandedSections.basement ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.basement && (
              <div className="section-content">
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" name="hasBasement" checked={propertyData.hasBasement} onChange={handleChange} />
                    Property has basement
                  </label>
                </div>

                {propertyData.hasBasement && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Basement Area (SqFt):</label>
                        <input type="number" name="basementArea" value={propertyData.basementArea} onChange={handleChange} placeholder="1000" />
                      </div>

                      <div className="form-group">
                        <label>Basement Finish %:</label>
                        <input type="number" name="basementFinishPercent" value={propertyData.basementFinishPercent} onChange={handleChange} placeholder="0-100" min="0" max="100" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Site & Lot */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('site')}>
              <h2>Site & Lot</h2>
              <span className="toggle-icon">{expandedSections.site ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.site && (
              <div className="section-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Lot Size (SqFt):</label>
                    <input type="text" name="lotSize" value={propertyData.lotSize} onChange={handleChange} placeholder="5000" />
                  </div>

                  <div className="form-group">
                    <label>Zoning:</label>
                    <select name="zoning" value={propertyData.zoning} onChange={handleChange}>
                      <option value="">Select...</option>
                      {zoningTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Zoning Description:</label>
                    <input type="text" name="zoningDescription" value={propertyData.zoningDescription} onChange={handleChange} placeholder="R1, C2, etc." />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>In Floodplain/Flood Zone:</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input type="radio" name="inFloodplain" value="true" checked={propertyData.inFloodplain === true} onChange={(e) => setPropertyData({...propertyData, inFloodplain: true})} />
                        Yes
                      </label>
                      <label className="radio-label">
                        <input type="radio" name="inFloodplain" value="false" checked={propertyData.inFloodplain === false} onChange={(e) => setPropertyData({...propertyData, inFloodplain: false})} />
                        No
                      </label>
                    </div>
                  </div>

                  {propertyData.inFloodplain && (
                    <div className="form-group">
                      <label>Flood Map Date:</label>
                      <input type="text" name="floodMapDate" value={propertyData.floodMapDate} onChange={handleChange} placeholder="MM/DD/YYYY" />
                    </div>
                  )}
                </div>

                <div className="subsection">
                  <h3>Utilities</h3>
                  <div className="checkbox-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilityNaturalGas" checked={propertyData.utilityNaturalGas} onChange={handleChange} />
                      Natural Gas
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilityStormSewer" checked={propertyData.utilityStormSewer} onChange={handleChange} />
                      Storm Sewer
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilitySanitarySewer" checked={propertyData.utilitySanitarySewer} onChange={handleChange} />
                      Sanitary Sewer
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilitySeptic" checked={propertyData.utilitySeptic} onChange={handleChange} />
                      Septic
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilityHoldingTank" checked={propertyData.utilityHoldingTank} onChange={handleChange} />
                      Holding Tank
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="utilityOpenDitch" checked={propertyData.utilityOpenDitch} onChange={handleChange} />
                      Open Ditch
                    </label>
                  </div>
                </div>

                <div className="subsection">
                  <h3>Water Supply</h3>
                  <div className="checkbox-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" name="waterMunicipal" checked={propertyData.waterMunicipal} onChange={handleChange} />
                      Municipal
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="waterPrivateWell" checked={propertyData.waterPrivateWell} onChange={handleChange} />
                      Private Well
                    </label>
                  </div>
                </div>

                <div className="subsection">
                  <h3>Electrical Service</h3>
                  <div className="checkbox-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" name="electricalOverhead" checked={propertyData.electricalOverhead} onChange={handleChange} />
                      Overhead
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="electricalUnderground" checked={propertyData.electricalUnderground} onChange={handleChange} />
                      Underground
                    </label>
                  </div>
                </div>

                <div className="subsection">
                  <h3>Street Features</h3>
                  <div className="checkbox-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" name="featurePavedRoad" checked={propertyData.featurePavedRoad} onChange={handleChange} />
                      Paved Road
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="featureGravelRoad" checked={propertyData.featureGravelRoad} onChange={handleChange} />
                      Gravel Road
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="featureLane" checked={propertyData.featureLane} onChange={handleChange} />
                      Lane
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="featureSidewalk" checked={propertyData.featureSidewalk} onChange={handleChange} />
                      Sidewalk
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="featureCurbs" checked={propertyData.featureCurbs} onChange={handleChange} />
                      Curbs
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="featureStreetlights" checked={propertyData.featureStreetlights} onChange={handleChange} />
                      Streetlights
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Landscaping:</label>
                  <div className="radio-group">
                    {['Good', 'Average', 'Fair', 'Poor'].map(condition => (
                      <label key={condition} className="radio-label">
                        <input type="radio" name="landscaping" value={condition} checked={propertyData.landscaping === condition} onChange={handleChange} />
                        {condition}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Garage Type:</label>
                    <select name="garageType" value={propertyData.garageType} onChange={handleChange}>
                      <option value="">Select...</option>
                      <option value="Attached">Attached</option>
                      <option value="Detached">Detached</option>
                      <option value="Built-in">Built-in</option>
                      <option value="Carport">Carport</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Garage Size:</label>
                    <select name="garageSize" value={propertyData.garageSize} onChange={handleChange}>
                      <option value="">Select...</option>
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Triple">Triple</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Driveway:</label>
                    <select name="drivewayType" value={propertyData.drivewayType} onChange={handleChange}>
                      <option value="">Select...</option>
                      {drivewayTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyData.drivewayType === 'Other' && (
                      <input type="text" name="drivewayTypeOther" value={propertyData.drivewayTypeOther} onChange={handleChange} placeholder="Specify driveway type..." className="other-input" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div className="photo-section">
            <h2>Inspection Photos ({photos.length})</h2>

            {!currentInspection ? (
              <p className="photo-gate-msg">Save the workfile first to upload photos.</p>
            ) : (
              <div className="photo-upload-actions">
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => cameraInputRef.current.click()}
                  disabled={uploadingPhotos.length > 0}
                >
                  📷 Take Photo
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadingPhotos.length > 0}
                >
                  📁 Upload File
                </button>
                {/* Camera input — opens rear camera on mobile, file picker on desktop */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                {/* File input — multi-select, no camera capture */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </div>
            )}

            {uploadingPhotos.length > 0 && (
              <div className="upload-progress-list">
                {uploadingPhotos.map(u => (
                  <div key={u.tempId} className="upload-progress-item">
                    <span className="upload-filename">{u.filename}</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${u.progress}%` }} />
                    </div>
                    <span className="progress-pct">{u.progress}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="photo-gallery">
              {photos.map(photo => (
                <div key={photo.id} className="photo-card">
                  <img src={photo.file_path} alt={photo.filename} />
                  <div className="photo-info">
                    <p className="filename">{photo.filename}</p>
                    <select value={photo.room} onChange={(e) => updatePhotoRoom(photo.id, e.target.value)}>
                      <option value="untagged">Select Room...</option>
                      {roomTypes.map(room => <option key={room} value={room}>{room}</option>)}
                    </select>
                    <textarea
                      placeholder="Notes about this photo..."
                      value={photo.notes|| ''}
                      onChange={(e) => updatePhotoNotes(photo.id, e.target.value)}
                      rows="2"
                    />
                    <button
                      className="delete-photo-btn"
                      onClick={() => handleDeletePhoto(photo.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {photos.length > 0 && (
              <div className="photo-summary">
                <h3>Photos by Room:</h3>
                {roomTypes.map(room => {
                  const roomPhotos = photos.filter(p => p.room === room);
                  if (roomPhotos.length === 0) return null;
                  return (
                    <div key={room}>
                      <strong>{room}:</strong> {roomPhotos.length} photo(s)
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={saveInspection} disabled={!propertyData.address}>
              Save Workfile
            </button>
            <button className="btn btn-primary" onClick={generateReport} disabled={!propertyData.address || photos.length === 0}>
              Generate Report
            </button>
          </div>
          </>}
        </main>
      </div>
      {propertyDetailId && (
        <PropertyDetail propertyId={propertyDetailId} onClose={() => setPropertyDetailId(null)} />
      )}
    </div>
  );
}

export default App;