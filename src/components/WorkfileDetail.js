import { useState, useEffect, useRef } from 'react';
import {
  updateInspection,
  uploadPhoto as uploadPhotoAPI,
  getPhotos,
  deletePhoto as deletePhotoAPI,
  updatePhoto as updatePhotoAPI,
  searchProperties,
  updateWorkflowStatus,
  updateBillingStatus,
  updateFileNumbers,
} from '../services/api';
import PropertyDetail from './PropertyDetail';

// ─── Status constants ─────────────────────────────────────────────────────────

const WORKFLOW_STATUSES = [
  'ordered', 'attempting_contact', 'left_message', 'awaiting_appointment',
  'appointment_scheduled', 'inspection_complete', 'additional_info_required',
  'reinspection_required', 'drafting', 'in_review', 'revision_required',
  'revision_complete', 'complete', 'delivered', 'awaiting_payment', 'closed',
];

const WORKFLOW_LABELS = {
  ordered: 'Ordered',
  attempting_contact: 'Attempting Contact',
  left_message: 'Left Message',
  awaiting_appointment: 'Awaiting Appointment',
  appointment_scheduled: 'Appointment Scheduled',
  inspection_complete: 'Inspection Complete',
  additional_info_required: 'Additional Info Required',
  reinspection_required: 'Re-inspection Required',
  drafting: 'Drafting',
  in_review: 'In Review',
  revision_required: 'Revision Required',
  revision_complete: 'Revision Complete',
  complete: 'Complete',
  delivered: 'Delivered',
  awaiting_payment: 'Awaiting Payment',
  closed: 'Closed',
};

const WORKFLOW_COLORS = {
  ordered: '#6b7280',
  attempting_contact: '#6b7280',
  left_message: '#6b7280',
  awaiting_appointment: '#3b82f6',
  appointment_scheduled: '#3b82f6',
  inspection_complete: '#f59e0b',
  additional_info_required: '#f59e0b',
  reinspection_required: '#f59e0b',
  drafting: '#f97316',
  in_review: '#f97316',
  revision_required: '#f97316',
  revision_complete: '#f97316',
  complete: '#22c55e',
  delivered: '#22c55e',
  awaiting_payment: '#ef4444',
  closed: '#374151',
};

const BILLING_LABELS = {
  not_invoiced: 'Not Invoiced',
  invoiced: 'Invoiced',
  paid: 'Paid',
  write_off: 'Write-Off',
};

const BILLING_COLORS = {
  not_invoiced: '#6b7280',
  invoiced: '#3b82f6',
  paid: '#22c55e',
  write_off: '#ef4444',
};

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_PROPERTY_DATA = {
  appraisalType: '', address: '', clientName: '', inspectionDate: '',
  orderedBy: '', orderedByName: '', authorizedUser: '', authorizedUse: '',
  authorizedUseOther: '', lenderId: '', lenderName: '', lenderNA: false,
  yearBuilt: '', propertyType: '', propertyTypeOther: '', designStyle: '',
  designStyleOther: '', construction: '', constructionOther: '',
  foundationWalls: 'Concrete', foundationWallsOther: '',
  roofing: '', roofingOther: '', roofingCondition: 'Average',
  exteriorFinish: '', exteriorFinishOther: '', exteriorCondition: 'Average',
  windows: '', windowsOther: '',
  heatingSystem: '', heatingSystemOther: '', heatingFuel: '', heatingFuelOther: '',
  coolingSystem: '', coolingSystemOther: '',
  electrical: 'Breakers', ampRating: '100',
  waterHeater: '', waterHeaterOther: '',
  wallFinish: 'Drywall', ceilingFinish: 'Drywall',
  flooring1: '', flooring1Other: '', flooring2: '', flooring2Other: '',
  flooring3: '', flooring3Other: '', flooring4: '', flooring4Other: '',
  flooring5: '', flooring5Other: '',
  builtInCooktop: false, builtInOven: false, builtInDishwasher: false,
  builtInMicrowave: false, builtInGarburator: false, builtInRangeHood: false,
  hasBasement: true, basementArea: '', basementFinishPercent: '',
  utilityNaturalGas: false, utilityStormSewer: false, utilitySanitarySewer: false,
  utilitySeptic: false, utilityHoldingTank: false, utilityOpenDitch: false,
  waterMunicipal: false, waterPrivateWell: false,
  electricalOverhead: false, electricalUnderground: false,
  featurePavedRoad: false, featureGravelRoad: false, featureLane: false,
  featureSidewalk: false, featureCurbs: false, featureStreetlights: false,
  landscaping: 'Average', inFloodplain: false, floodMapDate: '',
  garageType: '', garageSize: '', drivewayType: '', drivewayTypeOther: '',
  lotSize: '', zoning: '', zoningDescription: '',
};

const makeDefaultRooms = () => ({
  entrance: 0, living: 0, dining: 0, kitchen: 0, family: 0,
  bedrooms: 0, den: 0, fullBath: 0, partBath: 0, laundry: 0, other: 0, sqft: '',
});

const DEFAULT_ROOM_ALLOCATION = {
  main: makeDefaultRooms(), second: makeDefaultRooms(),
  third: makeDefaultRooms(), basement: makeDefaultRooms(),
};

// ─── Dropdown option lists ────────────────────────────────────────────────────

const ROOM_TYPES = [
  'Exterior - Front', 'Exterior - Rear', 'Kitchen', 'Living Room',
  'Master Bedroom', 'Bathroom', 'Basement', 'Other',
];
const PROPERTY_TYPES = ['Detached', 'Semi-Detached', 'Townhouse', 'Condominium', 'Duplex', 'Triplex', 'Other'];
const DESIGN_STYLES = ['Bungalow', '2-Storey', '1.5-Storey', 'Split-Level', 'Back-Split', 'Side-Split', 'Raised Bungalow', 'Other'];
const CONSTRUCTION_TYPES = ['Wood Frame', 'Brick', 'Concrete Block', 'Steel Frame', 'Log', 'Other'];
const FOUNDATION_TYPES = ['Concrete', 'Block', 'Stone', 'Preserved Wood', 'Other'];
const ROOFING_TYPES = ['Asphalt Shingle', 'Metal', 'Tile', 'Flat/Built-up', 'Cedar Shake', 'Rubber Membrane', 'Other'];
const EXTERIOR_FINISH_TYPES = ['Brick', 'Vinyl Siding', 'Aluminum Siding', 'Wood Siding', 'Stucco', 'Stone', 'EIFS', 'Combination', 'Other'];
const WINDOW_TYPES = ['Vinyl', 'Wood', 'Aluminum', 'Vinyl Clad Wood', 'Aluminum Clad Wood', 'Other'];
const HEATING_TYPES = ['Forced Air Gas', 'Forced Air Oil', 'Forced Air Electric', 'Hot Water Radiators', 'Baseboard Heaters', 'Heat Pump', 'In-Floor Radiant', 'Geothermal', 'Other'];
const FUEL_TYPES = ['Natural Gas', 'Propane', 'Oil', 'Electric', 'Wood', 'Other'];
const COOLING_TYPES = ['Central Air', 'Heat Pump', 'Window Units', 'Mini-Split', 'None', 'Other'];
const WATER_HEATER_TYPES = ['Gas - Tank', 'Gas - Tankless', 'Electric - Tank', 'Electric - Tankless', 'Heat Pump', 'Solar', 'Other'];
const FLOORING_TYPES = ['Hardwood', 'Laminate', 'Engineered Hardwood', 'Vinyl Plank', 'Tile', 'Carpet', 'Concrete', 'Cork', 'Bamboo', 'Mixed', 'Other'];
const DRIVEWAY_TYPES = ['Private', 'Shared', 'Mutual', 'None', 'Other'];
const ZONING_TYPES = ['Residential', 'Industrial', 'Agricultural', 'Multi-Residential', 'Other'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkfileDetail({ inspection, clients, lenders, currentUser, onSaved }) {
  const [activeTab, setActiveTab] = useState('inspection');

  // Workfile metadata
  const [workflowStatus, setWorkflowStatus] = useState(inspection?.workflow_status || 'ordered');
  const [billingStatus, setBillingStatus] = useState(inspection?.billing_status || 'not_invoiced');
  const [spokeFileNumber] = useState(inspection?.spoke_file_number || null);
  const [appraiserFileNumber, setAppraiserFileNumber] = useState(inspection?.appraiser_file_number || '');
  const [orderReference, setOrderReference] = useState(inspection?.order_reference || '');
  const [editingFileNums, setEditingFileNums] = useState(false);
  const [fileNumDraft, setFileNumDraft] = useState({
    appraiser_file_number: inspection?.appraiser_file_number || '',
    order_reference: inspection?.order_reference || '',
  });
  const [savingMeta, setSavingMeta] = useState(false);

  // Form state
  const [propertyData, setPropertyData] = useState(
    () => ({ ...DEFAULT_PROPERTY_DATA, ...(inspection?.property_data || {}) })
  );
  const [roomAllocation, setRoomAllocation] = useState(
    () => inspection?.room_allocation || DEFAULT_ROOM_ALLOCATION
  );
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const photoNoteTimers = useRef({});
  const [expandedSections, setExpandedSections] = useState({
    assignment: true, property: true, building: true,
    exterior: false, systems: false, interior: false,
    builtins: false, rooms: false, basement: false, site: false,
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [currentPropertyId, setCurrentPropertyId] = useState(inspection?.property_id || null);
  const [propertyDetailId, setPropertyDetailId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (inspection?.id) {
      getPhotos(inspection.id).then(setPhotos).catch(console.error);
    }
  }, [inspection?.id]);

  // ── Metadata handlers ────────────────────────────────────────────────────────

  const handleWorkflowStatusChange = async (newStatus) => {
    const prev = workflowStatus;
    setWorkflowStatus(newStatus);
    try {
      await updateWorkflowStatus(inspection.id, newStatus);
    } catch (err) {
      console.error('Failed to update workflow status:', err);
      setWorkflowStatus(prev);
    }
  };

  const handleBillingStatusChange = async (e) => {
    const newStatus = e.target.value;
    const prev = billingStatus;
    setBillingStatus(newStatus);
    try {
      await updateBillingStatus(inspection.id, newStatus);
    } catch (err) {
      console.error('Failed to update billing status:', err);
      setBillingStatus(prev);
    }
  };

  const handleSaveFileNumbers = async () => {
    setSavingMeta(true);
    try {
      const updated = await updateFileNumbers(inspection.id, fileNumDraft);
      setAppraiserFileNumber(updated.appraiser_file_number || '');
      setOrderReference(updated.order_reference || '');
      setEditingFileNums(false);
    } catch (err) {
      console.error('Failed to update file numbers:', err);
      alert('Failed to update file numbers');
    } finally {
      setSavingMeta(false);
    }
  };

  // ── Form handlers ────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPropertyData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressChange = async (e) => {
    handleChange(e);
    const q = e.target.value;
    if (q.length >= 3) {
      try { setAddressSuggestions(await searchProperties(q)); }
      catch { /* silent */ }
    } else {
      setAddressSuggestions([]);
    }
  };

  const handleClientSelect = (clientCode) => {
    const client = clients.find(c => c.client_code === clientCode);
    if (client) {
      setPropertyData(p => ({ ...p, orderedBy: client.client_code, orderedByName: client.company_name }));
    } else {
      setPropertyData(p => ({ ...p, orderedBy: '', orderedByName: '' }));
    }
  };

  const handleLenderSelect = (lenderId) => {
    const lender = lenders.find(l => String(l.id) === lenderId);
    if (lender) {
      setPropertyData(p => ({
        ...p, lenderId, lenderName: lender.company_name,
        lenderNA: false, authorizedUser: lender.company_name,
      }));
    } else {
      setPropertyData(p => ({ ...p, lenderId: '', lenderName: '' }));
    }
  };

  const handleRoomChange = (level, room, value) => {
    setRoomAllocation(ra => ({
      ...ra,
      [level]: { ...ra[level], [room]: value === '' ? '' : parseInt(value) || 0 },
    }));
  };

  const calculateTotalRooms = (level) => {
    const r = roomAllocation[level];
    return (r.entrance||0)+(r.living||0)+(r.dining||0)+(r.kitchen||0)+(r.family||0)+
           (r.bedrooms||0)+(r.den||0)+(r.fullBath||0)+(r.partBath||0)+(r.laundry||0)+(r.other||0);
  };

  const calculateGrandTotals = () => {
    let totalBedrooms=0, totalFullBath=0, totalPartBath=0, totalSqft=0, totalRooms=0;
    ['main','second','third'].forEach(level => {
      totalBedrooms += roomAllocation[level].bedrooms || 0;
      totalFullBath += roomAllocation[level].fullBath || 0;
      totalPartBath += roomAllocation[level].partBath || 0;
      totalSqft     += parseInt(roomAllocation[level].sqft) || 0;
      totalRooms    += calculateTotalRooms(level);
    });
    return { totalBedrooms, totalFullBath, totalPartBath, totalSqft, totalRooms };
  };

  const toggleSection = (section) =>
    setExpandedSections(s => ({ ...s, [section]: !s[section] }));

  // ── Photo handlers ────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e) => {
    if (!inspection?.id) return;
    const files = Array.from(e.target.files);
    e.target.value = '';
    for (const file of files) {
      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      setUploadingPhotos(prev => [...prev, { tempId, filename: file.name, progress: 0 }]);
      try {
        const saved = await uploadPhotoAPI(inspection.id, file, 'untagged', (pct) => {
          setUploadingPhotos(prev => prev.map(u => u.tempId === tempId ? { ...u, progress: pct } : u));
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
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
    } catch (err) { console.error('Failed to update photo:', err); }
  };

  const updatePhotoRoom = (photoId, room) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, room } : p));
    updatePhoto(photoId, { room });
  };

  const updatePhotoNotes = (photoId, notes) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, notes } : p));
    clearTimeout(photoNoteTimers.current[photoId]);
    photoNoteTimers.current[photoId] = setTimeout(() => updatePhoto(photoId, { notes }), 800);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deletePhotoAPI(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      alert('Failed to delete photo');
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const saveWorkfile = async () => {
    setSaving(true);
    try {
      const data = {
        property: propertyData,
        roomAllocation,
        photos: photos.map(p => ({ id: p.id, filename: p.filename, room: p.room, notes: p.notes })),
      };
      const updated = await updateInspection(inspection.id, data);
      if (updated.property_id) setCurrentPropertyId(updated.property_id);
      onSaved();
      alert('Workfile saved!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save workfile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const totals = calculateGrandTotals();
  const currentStatusIdx = WORKFLOW_STATUSES.indexOf(workflowStatus);

  return (
    <div className="workfile-detail">

      {/* ── Top bar: file numbers + billing ─── */}
      <div className="workfile-topbar">
        <div className="workfile-file-numbers">
          {spokeFileNumber && (
            <span className="workfile-spoke-num">{spokeFileNumber}</span>
          )}
          {!editingFileNums ? (
            <>
              <span className="workfile-appraiser-num">
                {appraiserFileNumber || <em style={{ color: '#9ca3af' }}>No file # set</em>}
              </span>
              {orderReference && (
                <span className="workfile-order-ref">Ref: {orderReference}</span>
              )}
              <button
                className="btn btn-small"
                onClick={() => {
                  setFileNumDraft({ appraiser_file_number: appraiserFileNumber, order_reference: orderReference });
                  setEditingFileNums(true);
                }}
              >
                Edit File Numbers
              </button>
            </>
          ) : (
            <div className="workfile-edit-file-nums">
              <input
                placeholder="Appraiser File #"
                value={fileNumDraft.appraiser_file_number}
                onChange={e => setFileNumDraft(d => ({ ...d, appraiser_file_number: e.target.value }))}
              />
              <input
                placeholder="Order Reference (optional)"
                value={fileNumDraft.order_reference}
                onChange={e => setFileNumDraft(d => ({ ...d, order_reference: e.target.value }))}
              />
              <button className="btn btn-primary btn-small" onClick={handleSaveFileNumbers} disabled={savingMeta}>
                {savingMeta ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-small" onClick={() => setEditingFileNums(false)}>Cancel</button>
            </div>
          )}
        </div>
        <div className="workfile-billing-block">
          <select
            value={billingStatus}
            onChange={handleBillingStatusChange}
            className="billing-status-select"
            style={{ color: BILLING_COLORS[billingStatus], borderColor: BILLING_COLORS[billingStatus] }}
          >
            {Object.entries(BILLING_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Workflow status pipeline ─── */}
      <div className="workflow-bar">
        <div className="workflow-pipeline">
          {WORKFLOW_STATUSES.map((status, idx) => {
            const isCurrent = status === workflowStatus;
            const isPast = idx < currentStatusIdx;
            return (
              <button
                key={status}
                className={`workflow-step${isCurrent ? ' current' : ''}${isPast ? ' past' : ''}`}
                style={isCurrent ? { background: WORKFLOW_COLORS[status], color: '#fff', borderColor: WORKFLOW_COLORS[status] } : {}}
                onClick={() => handleWorkflowStatusChange(status)}
                title={WORKFLOW_LABELS[status]}
              >
                {WORKFLOW_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Address + type ─── */}
      <div className="workfile-address-bar">
        <h2 className="workfile-address-title">
          {propertyData.address || 'New Workfile'}
        </h2>
        {propertyData.appraisalType && (
          <span className="inspection-type-badge">{propertyData.appraisalType}</span>
        )}
      </div>

      {/* ── Tabs ─── */}
      <div className="workfile-tabs">
        {[
          { key: 'inspection', label: '📋 Site Inspection' },
          { key: 'report',     label: '📄 Draft Report' },
          { key: 'photos',     label: `📸 Photos${photos.length > 0 ? ` (${photos.length})` : ''}` },
          { key: 'documents',  label: '📁 Documents' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`workfile-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─── */}
      <div className="workfile-tab-content">

        {/* ─── TAB 1: Site Inspection ─── */}
        {activeTab === 'inspection' && <>

          {/* Assignment */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('assignment')}>
              <h2>Assignment</h2>
              <span className="toggle-icon">{expandedSections.assignment ? '▼' : '▶'}</span>
            </div>
            {expandedSections.assignment && (
              <div className="section-content">
                <div className="form-group">
                  <label>Ordered By (Client):</label>
                  <div className="input-with-action">
                    <select value={propertyData.orderedBy} onChange={e => handleClientSelect(e.target.value)}>
                      <option value="">-- Select Client --</option>
                      {clients.map(c => (
                        <option key={c.client_code} value={c.client_code}>
                          {c.company_name}{c.client_code ? ` (${c.client_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Authorized User:</label>
                  <input type="text" name="authorizedUser" value={propertyData.authorizedUser} onChange={handleChange} placeholder="Contact name" />
                  {lenders.length > 0 && (
                    <select value="" onChange={e => {
                      const lender = lenders.find(l => String(l.id) === e.target.value);
                      if (lender) setPropertyData(p => ({ ...p, authorizedUser: lender.contact_name || p.authorizedUser }));
                    }} className="secondary-select">
                      <option value="">Select from lenders list…</option>
                      {lenders.map(l => (
                        <option key={l.id} value={l.id}>{l.company_name}{l.contact_name ? ` — ${l.contact_name}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Lender (if applicable):</label>
                  <div className="lender-field-row">
                    <select value={propertyData.lenderId} onChange={e => handleLenderSelect(e.target.value)} disabled={propertyData.lenderNA}>
                      <option value="">-- Select Lender --</option>
                      {lenders.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
                    </select>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={propertyData.lenderNA} onChange={e => setPropertyData(p => ({
                        ...p, lenderNA: e.target.checked,
                        lenderId: e.target.checked ? '' : p.lenderId,
                        lenderName: e.target.checked ? '' : p.lenderName,
                      }))} />
                      N/A
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Authorized Use:</label>
                  <select name="authorizedUse" value={propertyData.authorizedUse} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="First Mortgage Financing Purposes Only">First Mortgage Financing Purposes Only</option>
                    <option value="Personal Guarantee with Tarion Only">Personal Guarantee with Tarion Only</option>
                    <option value="Estate Planning Purposes">Estate Planning Purposes</option>
                    <option value="Separation/Divorce Purposes">Separation/Divorce Purposes</option>
                    <option value="Refinancing Purposes">Refinancing Purposes</option>
                    <option value="Other (specify)">Other (specify)</option>
                  </select>
                  {propertyData.authorizedUse === 'Other (specify)' && (
                    <input type="text" name="authorizedUseOther" value={propertyData.authorizedUseOther} onChange={handleChange} placeholder="Specify authorized use…" className="other-input" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Property Information */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('property')}>
              <h2>Property Information</h2>
              <span className="toggle-icon">{expandedSections.property ? '▼' : '▶'}</span>
            </div>
            <div className="form-group" style={{ padding: '0 25px' }}>
              <label>Appraisal Type:</label>
              <select name="appraisalType" value={propertyData.appraisalType} onChange={handleChange} className="appraisal-type-select">
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
                  <div className="address-autocomplete">
                    <input
                      type="text" name="address" value={propertyData.address}
                      onChange={handleAddressChange}
                      onBlur={() => setTimeout(() => setAddressSuggestions([]), 200)}
                      placeholder="123 Main St, Toronto, ON" autoComplete="off"
                    />
                    {addressSuggestions.length > 0 && (
                      <ul className="address-suggestions">
                        {addressSuggestions.map(s => (
                          <li key={s.id} onMouseDown={() => { setHistoryModal(s); setAddressSuggestions([]); }}>
                            <strong>{s.address}</strong>
                            <small>{[
                              s.year_built && `Built ${s.year_built}`,
                              s.bedrooms && `${s.bedrooms} bed`,
                              s.last_form_type,
                              s.last_order_date ? new Date(s.last_order_date).toLocaleDateString() : null,
                            ].filter(Boolean).join(' · ')}</small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {currentPropertyId && (
                    <button type="button" className="btn btn-link property-file-link" onClick={() => setPropertyDetailId(currentPropertyId)}>
                      View property file →
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>Applicant/Borrower Name:</label>
                  <input type="text" name="clientName" value={propertyData.clientName} onChange={handleChange} placeholder="John Smith" />
                </div>
                <div className="form-group">
                  <label>Inspection Date:</label>
                  <input type="date" name="inspectionDate" value={propertyData.inspectionDate} onChange={handleChange} />
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
                    <input type="number" name="yearBuilt" value={propertyData.yearBuilt} onChange={handleChange} placeholder="2020" />
                  </div>
                  <div className="form-group">
                    <label>Property Type:</label>
                    <select name="propertyType" value={propertyData.propertyType} onChange={handleChange}>
                      <option value="">Select...</option>
                      {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.propertyType === 'Other' && <input type="text" name="propertyTypeOther" value={propertyData.propertyTypeOther} onChange={handleChange} placeholder="Specify property type..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Design/Style:</label>
                    <select name="designStyle" value={propertyData.designStyle} onChange={handleChange}>
                      <option value="">Select...</option>
                      {DESIGN_STYLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.designStyle === 'Other' && <input type="text" name="designStyleOther" value={propertyData.designStyleOther} onChange={handleChange} placeholder="Specify design style..." className="other-input" />}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Construction:</label>
                    <select name="construction" value={propertyData.construction} onChange={handleChange}>
                      <option value="">Select...</option>
                      {CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.construction === 'Other' && <input type="text" name="constructionOther" value={propertyData.constructionOther} onChange={handleChange} placeholder="Specify construction type..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Foundation Walls:</label>
                    <select name="foundationWalls" value={propertyData.foundationWalls} onChange={handleChange}>
                      {FOUNDATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.foundationWalls === 'Other' && <input type="text" name="foundationWallsOther" value={propertyData.foundationWallsOther} onChange={handleChange} placeholder="Specify foundation type..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Windows:</label>
                    <select name="windows" value={propertyData.windows} onChange={handleChange}>
                      <option value="">Select...</option>
                      {WINDOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.windows === 'Other' && <input type="text" name="windowsOther" value={propertyData.windowsOther} onChange={handleChange} placeholder="Specify window type..." className="other-input" />}
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
                      {ROOFING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.roofing === 'Other' && <input type="text" name="roofingOther" value={propertyData.roofingOther} onChange={handleChange} placeholder="Specify roofing type..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Roofing Condition:</label>
                    <div className="radio-group">
                      {['Good','Average','Fair','Poor'].map(c => (
                        <label key={c} className="radio-label">
                          <input type="radio" name="roofingCondition" value={c} checked={propertyData.roofingCondition === c} onChange={handleChange} />{c}
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
                      {EXTERIOR_FINISH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.exteriorFinish === 'Other' && <input type="text" name="exteriorFinishOther" value={propertyData.exteriorFinishOther} onChange={handleChange} placeholder="Specify exterior finish..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Exterior Condition:</label>
                    <div className="radio-group">
                      {['Good','Average','Fair','Poor'].map(c => (
                        <label key={c} className="radio-label">
                          <input type="radio" name="exteriorCondition" value={c} checked={propertyData.exteriorCondition === c} onChange={handleChange} />{c}
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
                      {HEATING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.heatingSystem === 'Other' && <input type="text" name="heatingSystemOther" value={propertyData.heatingSystemOther} onChange={handleChange} placeholder="Specify heating system..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Fuel Type:</label>
                    <select name="heatingFuel" value={propertyData.heatingFuel} onChange={handleChange}>
                      <option value="">Select...</option>
                      {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.heatingFuel === 'Other' && <input type="text" name="heatingFuelOther" value={propertyData.heatingFuelOther} onChange={handleChange} placeholder="Specify fuel type..." className="other-input" />}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Cooling System:</label>
                    <select name="coolingSystem" value={propertyData.coolingSystem} onChange={handleChange}>
                      <option value="">Select...</option>
                      {COOLING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.coolingSystem === 'Other' && <input type="text" name="coolingSystemOther" value={propertyData.coolingSystemOther} onChange={handleChange} placeholder="Specify cooling system..." className="other-input" />}
                  </div>
                  <div className="form-group">
                    <label>Water Heater:</label>
                    <select name="waterHeater" value={propertyData.waterHeater} onChange={handleChange}>
                      <option value="">Select...</option>
                      {WATER_HEATER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.waterHeater === 'Other' && <input type="text" name="waterHeaterOther" value={propertyData.waterHeaterOther} onChange={handleChange} placeholder="Specify water heater type..." className="other-input" />}
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
                      {['Drywall','Plaster','Paneling','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ceiling Finish:</label>
                    <select name="ceilingFinish" value={propertyData.ceilingFinish} onChange={handleChange}>
                      {['Drywall','Plaster','Textured','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {[1,2,3,4,5].map(num => (
                  <div key={num} className="form-group">
                    <label>Flooring {num}:</label>
                    <select name={`flooring${num}`} value={propertyData[`flooring${num}`]} onChange={handleChange}>
                      <option value="">Select...</option>
                      {FLOORING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData[`flooring${num}`] === 'Other' && (
                      <input type="text" name={`flooring${num}Other`} value={propertyData[`flooring${num}Other`]} onChange={handleChange} placeholder="Specify flooring type..." className="other-input" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Built-ins & Appliances */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('builtins')}>
              <h2>Built-ins &amp; Appliances</h2>
              <span className="toggle-icon">{expandedSections.builtins ? '▼' : '▶'}</span>
            </div>
            {expandedSections.builtins && (
              <div className="section-content">
                <div className="checkbox-grid">
                  {[['builtInCooktop','Cooktop'],['builtInOven','Oven'],['builtInDishwasher','Dishwasher'],
                    ['builtInMicrowave','Microwave'],['builtInGarburator','Garburator'],['builtInRangeHood','Range Hood']].map(([name, label]) => (
                    <label key={name} className="checkbox-label">
                      <input type="checkbox" name={name} checked={propertyData[name]} onChange={handleChange} />
                      {label}
                    </label>
                  ))}
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
                        <th>Level</th><th>Entrance</th><th>Living</th><th>Dining</th><th>Kitchen</th>
                        <th>Family</th><th>Bedrooms</th><th>Den</th><th>Full Bath</th><th>Part Bath</th>
                        <th>Laundry</th><th>Other</th><th>Total Rooms</th><th>Area (SqFt)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['main','second','third'].map(level => (
                        <tr key={level}>
                          <td className="level-name">{level.charAt(0).toUpperCase()+level.slice(1)}</td>
                          {['entrance','living','dining','kitchen','family','bedrooms','den','fullBath','partBath','laundry','other'].map(room => (
                            <td key={room}>
                              <input type="number" min="0" value={roomAllocation[level][room]}
                                onChange={e => handleRoomChange(level, room, e.target.value)} className="room-input" />
                            </td>
                          ))}
                          <td className="total-cell">{calculateTotalRooms(level)}</td>
                          <td><input type="number" min="0" value={roomAllocation[level].sqft}
                            onChange={e => handleRoomChange(level, 'sqft', e.target.value)} className="sqft-input" placeholder="0" /></td>
                        </tr>
                      ))}
                      <tr className="totals-row">
                        <td colSpan="6" className="totals-label">Above Grade Totals:</td>
                        <td className="total-cell">{totals.totalBedrooms}</td>
                        <td></td>
                        <td className="total-cell">{totals.totalFullBath}</td>
                        <td className="total-cell">{totals.totalPartBath}</td>
                        <td></td><td></td>
                        <td className="total-cell">{totals.totalRooms}</td>
                        <td className="total-cell">{totals.totalSqft}</td>
                      </tr>
                      <tr>
                        <td className="level-name">Basement</td>
                        {['entrance','living','dining','kitchen','family','bedrooms','den','fullBath','partBath','laundry','other'].map(room => (
                          <td key={room}>
                            <input type="number" min="0" value={roomAllocation.basement[room]}
                              onChange={e => handleRoomChange('basement', room, e.target.value)} className="room-input" />
                          </td>
                        ))}
                        <td className="total-cell">{calculateTotalRooms('basement')}</td>
                        <td><input type="number" min="0" value={roomAllocation.basement.sqft}
                          onChange={e => handleRoomChange('basement', 'sqft', e.target.value)} className="sqft-input" placeholder="0" /></td>
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
                  <label><input type="checkbox" name="hasBasement" checked={propertyData.hasBasement} onChange={handleChange} /> Property has basement</label>
                </div>
                {propertyData.hasBasement && (
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
                )}
              </div>
            )}
          </div>

          {/* Site & Lot */}
          <div className="form-section">
            <div className="section-header" onClick={() => toggleSection('site')}>
              <h2>Site &amp; Lot</h2>
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
                      {ZONING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                      <label className="radio-label"><input type="radio" name="inFloodplain" checked={propertyData.inFloodplain === true} onChange={() => setPropertyData(p => ({...p, inFloodplain: true}))} />Yes</label>
                      <label className="radio-label"><input type="radio" name="inFloodplain" checked={propertyData.inFloodplain === false} onChange={() => setPropertyData(p => ({...p, inFloodplain: false}))} />No</label>
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
                    {[['utilityNaturalGas','Natural Gas'],['utilityStormSewer','Storm Sewer'],['utilitySanitarySewer','Sanitary Sewer'],
                      ['utilitySeptic','Septic'],['utilityHoldingTank','Holding Tank'],['utilityOpenDitch','Open Ditch']].map(([n,l]) => (
                      <label key={n} className="checkbox-label"><input type="checkbox" name={n} checked={propertyData[n]} onChange={handleChange} />{l}</label>
                    ))}
                  </div>
                </div>
                <div className="subsection">
                  <h3>Water Supply</h3>
                  <div className="checkbox-grid">
                    {[['waterMunicipal','Municipal'],['waterPrivateWell','Private Well']].map(([n,l]) => (
                      <label key={n} className="checkbox-label"><input type="checkbox" name={n} checked={propertyData[n]} onChange={handleChange} />{l}</label>
                    ))}
                  </div>
                </div>
                <div className="subsection">
                  <h3>Electrical Service</h3>
                  <div className="checkbox-grid">
                    {[['electricalOverhead','Overhead'],['electricalUnderground','Underground']].map(([n,l]) => (
                      <label key={n} className="checkbox-label"><input type="checkbox" name={n} checked={propertyData[n]} onChange={handleChange} />{l}</label>
                    ))}
                  </div>
                </div>
                <div className="subsection">
                  <h3>Street Features</h3>
                  <div className="checkbox-grid">
                    {[['featurePavedRoad','Paved Road'],['featureGravelRoad','Gravel Road'],['featureLane','Lane'],
                      ['featureSidewalk','Sidewalk'],['featureCurbs','Curbs'],['featureStreetlights','Streetlights']].map(([n,l]) => (
                      <label key={n} className="checkbox-label"><input type="checkbox" name={n} checked={propertyData[n]} onChange={handleChange} />{l}</label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Landscaping:</label>
                  <div className="radio-group">
                    {['Good','Average','Fair','Poor'].map(c => (
                      <label key={c} className="radio-label"><input type="radio" name="landscaping" value={c} checked={propertyData.landscaping === c} onChange={handleChange} />{c}</label>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Garage Type:</label>
                    <select name="garageType" value={propertyData.garageType} onChange={handleChange}>
                      <option value="">Select...</option>
                      {['Attached','Detached','Built-in','Carport','None'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Garage Size:</label>
                    <select name="garageSize" value={propertyData.garageSize} onChange={handleChange}>
                      <option value="">Select...</option>
                      {['Single','Double','Triple'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Driveway:</label>
                    <select name="drivewayType" value={propertyData.drivewayType} onChange={handleChange}>
                      <option value="">Select...</option>
                      {DRIVEWAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {propertyData.drivewayType === 'Other' && <input type="text" name="drivewayTypeOther" value={propertyData.drivewayTypeOther} onChange={handleChange} placeholder="Specify driveway type..." className="other-input" />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="actions">
            <button className="btn btn-primary" onClick={saveWorkfile} disabled={saving || !propertyData.address}>
              {saving ? 'Saving…' : 'Save Workfile'}
            </button>
          </div>
        </>}

        {/* ─── TAB 2: Draft Report ─── */}
        {activeTab === 'report' && (
          <div className="workfile-placeholder">
            <div className="placeholder-icon">📄</div>
            <h3>Draft Report</h3>
            <p>Report drafting tools are coming soon.</p>
          </div>
        )}

        {/* ─── TAB 3: Photos ─── */}
        {activeTab === 'photos' && (
          <div className="photo-section">
            <h2>Inspection Photos ({photos.length})</h2>
            <div className="form-group">
              <label>Upload Photos:</label>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={uploadingPhotos.length > 0} />
            </div>
            {uploadingPhotos.length > 0 && (
              <div className="upload-progress-list">
                {uploadingPhotos.map(u => (
                  <div key={u.tempId} className="upload-progress-item">
                    <span className="upload-filename">{u.filename}</span>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${u.progress}%` }} /></div>
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
                    <select value={photo.room} onChange={e => updatePhotoRoom(photo.id, e.target.value)}>
                      <option value="untagged">Select Room...</option>
                      {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <textarea placeholder="Notes about this photo..." value={photo.notes || ''} onChange={e => updatePhotoNotes(photo.id, e.target.value)} rows="2" />
                    <button className="delete-photo-btn" onClick={() => handleDeletePhoto(photo.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {photos.length > 0 && (
              <div className="photo-summary">
                <h3>Photos by Room:</h3>
                {ROOM_TYPES.map(room => {
                  const count = photos.filter(p => p.room === room).length;
                  return count > 0 ? <div key={room}><strong>{room}:</strong> {count} photo(s)</div> : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: Documents ─── */}
        {activeTab === 'documents' && (
          <div className="workfile-placeholder">
            <div className="placeholder-icon">📁</div>
            <h3>Documents</h3>
            <p>Document management is coming soon.</p>
          </div>
        )}

      </div>{/* /tab-content */}

      {/* ── Modals ─── */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Found in your history!</h3>
            <p><strong>{historyModal.address}</strong></p>
            <p>Last order: {historyModal.last_order_date ? new Date(historyModal.last_order_date).toLocaleDateString() : 'Unknown'}</p>
            <p>Client: {historyModal.last_client || '—'} · Type: {historyModal.last_form_type || '—'}</p>
            {(historyModal.year_built || historyModal.bedrooms || historyModal.sqft_main) && (
              <p className="prefill-preview">
                {[historyModal.year_built && `Built ${historyModal.year_built}`, historyModal.bedrooms && `${historyModal.bedrooms} bed`, historyModal.sqft_main && `${historyModal.sqft_main} sq ft (main)`].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => {
                setCurrentPropertyId(historyModal.id);
                setPropertyData(p => ({
                  ...p, address: historyModal.address,
                  propertyType: historyModal.property_type || p.propertyType,
                  yearBuilt: historyModal.year_built ? String(historyModal.year_built) : p.yearBuilt,
                  designStyle: historyModal.design_style || p.designStyle,
                  construction: historyModal.construction || p.construction,
                  foundationWalls: historyModal.foundation || p.foundationWalls,
                  lotSize: historyModal.lot_size || p.lotSize,
                  zoning: historyModal.zoning || p.zoning,
                }));
                if (historyModal.sqft_main || historyModal.sqft_second || historyModal.sqft_third || historyModal.sqft_basement) {
                  setRoomAllocation(ra => ({
                    main:     { ...ra.main,     sqft: historyModal.sqft_main     || ra.main.sqft },
                    second:   { ...ra.second,   sqft: historyModal.sqft_second   || ra.second.sqft },
                    third:    { ...ra.third,    sqft: historyModal.sqft_third    || ra.third.sqft },
                    basement: { ...ra.basement, sqft: historyModal.sqft_basement || ra.basement.sqft },
                  }));
                }
                setHistoryModal(null); setAddressSuggestions([]);
              }}>Pre-fill from history</button>
              <button className="btn btn-small" onClick={() => {
                setPropertyData(p => ({ ...p, address: historyModal.address }));
                setCurrentPropertyId(historyModal.id);
                setHistoryModal(null); setAddressSuggestions([]);
              }}>Start fresh</button>
              <button className="btn btn-small" onClick={() => {
                setPropertyDetailId(historyModal.id);
                setHistoryModal(null); setAddressSuggestions([]);
              }}>View property file →</button>
            </div>
          </div>
        </div>
      )}
      {propertyDetailId && (
        <PropertyDetail propertyId={propertyDetailId} onClose={() => setPropertyDetailId(null)} />
      )}
    </div>
  );
}
