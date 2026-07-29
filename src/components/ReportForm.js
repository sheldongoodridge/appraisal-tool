import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_REPORT } from '../utils/defaultReport';
import './ReportForm.css';
import CoverTab          from './report-tabs/CoverTab';
import ClientTab         from './report-tabs/ClientTab';
import SubjectTab        from './report-tabs/SubjectTab';
import NeighbourhoodTab  from './report-tabs/NeighbourhoodTab';
import SiteTab           from './report-tabs/SiteTab';
import ImprovementsTab   from './report-tabs/ImprovementsTab';
import ComparablesTab    from './report-tabs/ComparablesTab';
import HistoryTab        from './report-tabs/HistoryTab';
import CertificationTab  from './report-tabs/CertificationTab';
import AddendaTab        from './report-tabs/AddendaTab';
import { getLenders, getProfile } from '../services/api';

const API_BASE = 'https://spokeappraisal.com/api';

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cover',         icon: '📋', label: 'Cover',         autoFilled: false, fieldCount: 5  },
  { id: 'client',        icon: '👤', label: 'Client',        autoFilled: true,  fieldCount: 6  },
  { id: 'subject',       icon: '🏠', label: 'Subject',       autoFilled: true,  fieldCount: 8  },
  { id: 'neighbourhood', icon: '🏘️', label: 'Neighbourhood', autoFilled: false, fieldCount: 16 },
  { id: 'site',          icon: '📍', label: 'Site',          autoFilled: true,  fieldCount: 32 },
  { id: 'improvements',  icon: '🏗️', label: 'Improvements',  autoFilled: true,  fieldCount: 42 },
  { id: 'comparables',   icon: '📊', label: 'Comparables',   autoFilled: false, fieldCount: 0  },
  { id: 'history',       icon: '📅', label: 'History',       autoFilled: false, fieldCount: 10 },
  { id: 'certification', icon: '✅', label: 'Certification', autoFilled: true,  fieldCount: 15 },
  { id: 'addenda',       icon: '📎', label: 'Addenda',       autoFilled: false, fieldCount: 20 },
  { id: 'photos',        icon: '📷', label: 'Photos',        autoFilled: false, fieldCount: 12 },
  { id: 'generate',      icon: '📄', label: 'Generate',      autoFilled: false, fieldCount: 0  },
];

// ─── AUTO-POPULATE ────────────────────────────────────────────────────────────

function normalizeUnit(u) {
  const l = (u || '').toLowerCase();
  if (l === 'sqft' || l === 'sq ft') return 'Sq Ft';
  if (l === 'acres')                  return 'Acres';
  if (l === 'hectares')               return 'Hectares';
  if (l === 'm²' || l === 'm2')       return 'M²';
  return 'Sq Ft';
}

function buildAutoFill(inspection, currentUser) {
  const wd       = inspection?.workfile_data ?? {};
  const order    = wd.order ?? {};
  const wfSite   = wd.site  ?? {};
  const insp     = (wd.inspections ?? [])[0] ?? {};
  const exterior = insp.exterior ?? {};
  const systems  = insp.floors?.basement?.systems ?? {};

  return {
    meta: {
      inspection_date: order.inspection_datetime
        ? order.inspection_datetime.slice(0, 10)
        : null,
      inspection_type: inspection?.property_data?.appraisalType ?? '',
    },
    site: {
      dimensions:    wfSite.lot_dimensions ?? '',
      lot_size:      wfSite.lot_size       ?? '',
      lot_size_unit: normalizeUnit(wfSite.lot_size_unit),
      zoning_code:   wfSite.zoning         ?? '',
    },
    improvements: {
      design_style:     insp.dwelling_style     ?? '',
      roofing_type:     exterior.roofing        ?? '',
      exterior_finish:  exterior.cladding       ?? '',
      windows_type:     exterior.windows        ?? '',
      heating_system:   systems.heating         ?? '',
      fuel_type:        systems.fuel            ?? '',
      water_heater:     systems.water_heater    ?? '',
      electrical_other: systems.electrical_type ?? '',
      panel_capacity:   systems.electrical_amps ?? '',
      cooling_system:   systems.cooling         ?? '',
    },
    subject: {
      address:          inspection?.property_data?.address        ?? '',
      city:             inspection?.property_data?.city           ?? '',
      province:         inspection?.property_data?.province       ?? '',
      postal_code:      inspection?.property_data?.postalCode     ?? '',
      municipality:     wd.property?.municipality                 ?? '',
      legal_description: wd.property?.legal_description          ?? '',
      property_id_type: wd.property?.property_id_type            ?? 'PIN/PID',
      property_id:      wd.property?.property_id                 ?? '',
      assessed_value:   wd.property?.assessed_value              ?? '',
      taxes:            wd.property?.taxes                       ?? '',
      applicant_name:   wd.contacts?.applicant?.name             ?? '',
      intended_user:    '', // filled from client name async
    },
    parties: {
      appraiser: {
        name:              currentUser?.full_name         ?? '',
        company:           currentUser?.company           ?? '',
        address:           currentUser?.address           ?? '',
        email:             currentUser?.email             ?? '',
        phone:             currentUser?.phone             ?? '',
        fax:               currentUser?.fax               ?? '',
        designation:       currentUser?.aic_designation   ?? '',
        membership_number: currentUser?.membership_number ?? '',
      },
    },
  };
}


// ─── ROOM ALLOCATION AUTO-FILL ───────────────────────────────────────────────

const ROOM_LABEL_MAP = {
  'Bedroom':           'bedrooms',
  'Master Bedroom':    'bedrooms',
  'Full Bathroom':     'full_bath',
  'Full Bath':         'full_bath',
  'Bathroom':          'full_bath',
  'Partial Bathroom':  'part_bath',
  'Half Bathroom':     'part_bath',
  'Half Bath':         'part_bath',
  'Powder Room':       'part_bath',
  'Kitchen':           'kitchen',
  'Living Room':       'living',
  'Living':            'living',
  'Dining Room':       'dining',
  'Dining':            'dining',
  'Family Room':       'family',
  'Family':            'family',
  'Den':               'den',
  'Office':            'den',
  'Study':             'den',
  'Laundry':           'laundry',
  'Laundry Room':      'laundry',
  'Entrance':          'entrance',
  'Foyer':             'entrance',
  'Entry':             'entrance',
  'Mudroom':           'entrance',
};

const FLOOR_KEY_MAP = {
  'main':      'main',
  'second':    'second',
  'third':     'third',
  'fourth':    'fourth',
  'fifth':     'fifth',
  'basement':  'basement',
  'basement2': 'basement2',
  'bsmt':      'basement',
  'upper':     'second',
  'lower':     'basement',
  'ground':    'main',
};

const RA_COUNTABLE = ['entrance','living','dining','kitchen','family','bedrooms','den','full_bath','part_bath','laundry'];

function buildRoomAllocation(inspection) {
  const floors = inspection?.workfile_data?.inspections?.[0]?.floors ?? {};

  // Diagnostic — logs room counts per floor so we can confirm data is reaching here
  console.log('[buildRoomAllocation] floors available:', Object.keys(floors));
  Object.entries(floors).forEach(([k, v]) =>
    console.log(`  ${k}: ${v?.rooms?.length ?? 0} rooms, ${v?.photos?.length ?? 0} floor-photos`)
  );

  const result = {};

  for (const [floorKey, floorData] of Object.entries(floors)) {
    const raKey = FLOOR_KEY_MAP[floorKey.toLowerCase()];
    if (!raKey || !floorData) continue;

    // Rooms are { label: "Bedroom", photos: [...] } objects — NOT the floor.photos array.
    // floor.photos contains unlabelled floor-level shots; floor.rooms has the labelled rooms.
    const rooms = Array.isArray(floorData.rooms) ? floorData.rooms : [];
    const counts = {};

    for (const room of rooms) {
      const label = room?.label ?? '';
      const field = ROOM_LABEL_MAP[label];
      if (!field) continue;
      // Each photo = one room instance (FloorScreen merges same-label photos into one object)
      counts[field] = (counts[field] || 0) + Math.max(room.photos?.length ?? 1, 1);
    }

    if (Object.keys(counts).length > 0) {
      const row = {};
      for (const [field, count] of Object.entries(counts)) {
        row[field] = String(count);
      }
      const total = RA_COUNTABLE.reduce((s, k) => s + (parseInt(row[k]) || 0), 0);
      if (total > 0) row.room_total = String(total);
      result[raKey] = row;
      console.log(`  → mapped ${floorKey} →`, row);
    }
  }

  return result;
}

// ─── MERGE ────────────────────────────────────────────────────────────────────

function mergeReport(saved) {
  if (!saved || Object.keys(saved).length === 0) return { ...DEFAULT_REPORT };
  const merged = { ...DEFAULT_REPORT };
  for (const key of Object.keys(DEFAULT_REPORT)) {
    if (saved[key] === undefined) continue;
    const def = DEFAULT_REPORT[key];
    if (Array.isArray(def) || def === null || typeof def !== 'object') {
      merged[key] = saved[key]; // primitives and arrays: use saved value as-is
    } else {
      merged[key] = { ...def, ...saved[key] };
    }
  }
  return merged;
}

// ─── SAVE ────────────────────────────────────────────────────────────────────

async function patchReport(id, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section: 'report', data }),
  });
  if (!res.ok) throw new Error('Save failed');
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ReportForm({ inspection, currentUser, onBack, onSave }) {
  const [reportData, setReportData] = useState(() =>
    mergeReport(inspection?.workfile_data?.report)
  );
  const [activeTab,  setActiveTab]  = useState('cover');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showToast,  setShowToast]  = useState(false);
  const autoFillRan = useRef(false);
  const saveTimer   = useRef(null);
  const toastTimer  = useRef(null);

  // Re-initialize when a different workfile is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    autoFillRan.current = false;
    setReportData(mergeReport(inspection?.workfile_data?.report));
  }, [inspection?.id]);

  // Auto-fill workfile data — runs once per workfile load.
  // Subject/site/improvements: skipped if address already set (existing workfile).
  // Room allocation: always attempted if main floor is still empty.
  useEffect(() => {
    if (autoFillRan.current) return;
    autoFillRan.current = true;

    setReportData(prev => {
      let next = { ...prev };
      let changed = false;

      if (!prev.subject?.address) {
        const fills = buildAutoFill(inspection);
        for (const [key, vals] of Object.entries(fills)) {
          if (key !== 'parties') next[key] = { ...prev[key], ...vals };
        }
        changed = true;
      }

      // Room allocation runs even for existing workfiles — only skips if already has data
      const raEmpty = !prev.room_allocation?.main?.bedrooms
        && !prev.room_allocation?.main?.living
        && !prev.room_allocation?.second?.bedrooms
        && !prev.room_allocation?.basement?.bedrooms;

      if (raEmpty) {
        const roomAlloc = buildRoomAllocation(inspection);
        if (Object.keys(roomAlloc).length > 0) {
          next.room_allocation = { ...prev.room_allocation, ...roomAlloc };
          changed = true;
        }
      }

      return changed ? next : prev;
    });
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 4000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Async: fetch fresh appraiser profile from API — bypasses stale localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    getProfile().then(profile => {
      setReportData(prev => {
        if (prev.parties?.appraiser?.name) return prev; // don't overwrite manual edits
        const next = {
          ...prev,
          parties: {
            ...prev.parties,
            appraiser: {
              ...prev.parties.appraiser,
              name:              profile.full_name         || '',
              company:           profile.company           || '',
              address:           profile.address           || '',
              email:             profile.email             || '',
              phone:             profile.phone             || '',
              fax:               profile.fax               || '',
              designation:       profile.aic_designation   || '',
              membership_number: profile.membership_number || '',
            },
          },
        };
        triggerSave(next);
        return next;
      });
    }).catch(() => {});
  }, [inspection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Async: fetch the linked lender (intended_user) and populate parties.client
  // The lender is the "client" on the AIC form 95% of the time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const lender_id = inspection?.workfile_data?.order?.intended_user;
    if (!lender_id) return;

    getLenders().then(lenders => {
      const match = lenders.find(l => l.id === Number(lender_id));
      if (!match) return;
      const addressParts = [match.address, match.city, match.province, match.postal_code]
        .filter(Boolean).join(', ');
      setReportData(prev => {
        if (prev.parties?.client?.name) return prev; // don't overwrite manual edits
        const next = {
          ...prev,
          parties: {
            ...prev.parties,
            client: {
              ...prev.parties.client,
              name:      match.company_name || '',
              attention: match.contact_name || '',
              address:   addressParts,
              email:     match.email        || '',
              phone:     match.phone        || '',
            },
          },
        };
        triggerSave(next);
        return next;
      });
    }).catch(() => {});
  }, [inspection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  const triggerSave = useCallback((data) => {
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (onSave) await onSave(data);
        else        await patchReport(inspection.id, data);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [inspection.id, onSave]);

  const updateSection = useCallback((sectionKey, sectionData) => {
    setReportData(prev => {
      const next = { ...prev, [sectionKey]: sectionData };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const activeDef = TABS.find(t => t.id === activeTab);
  const address   = inspection?.property_data?.address || 'Draft Report';

  function renderTab() {
    switch (activeTab) {
      case 'cover':
        return (
          <CoverTab
            cover={reportData.cover}
            summary={reportData.summary}
            fullReport={reportData}
            onCoverChange={d   => updateSection('cover',   d)}
            onSummaryChange={d => updateSection('summary', d)}
          />
        );
      case 'client':
        return (
          <ClientTab
            parties={reportData.parties}
            onPartiesChange={d => updateSection('parties', d)}
          />
        );
      case 'subject':
        return (
          <SubjectTab
            meta={reportData.meta}
            subject={reportData.subject}
            onMetaChange={d    => updateSection('meta',    d)}
            onSubjectChange={d => updateSection('subject', d)}
          />
        );
      case 'neighbourhood':
        return (
          <NeighbourhoodTab
            neighbourhood={reportData.neighbourhood}
            onChange={d => updateSection('neighbourhood', d)}
          />
        );
      case 'site':
        return (
          <SiteTab
            site={reportData.site}
            onChange={d => updateSection('site', d)}
          />
        );
      case 'improvements':
        return (
          <ImprovementsTab
            improvements={reportData.improvements}
            roomAllocation={reportData.room_allocation}
            onChange={d => updateSection('improvements', d)}
            onRoomAllocationChange={d => updateSection('room_allocation', d)}
          />
        );
      case 'comparables':
        return (
          <ComparablesTab
            comparables={reportData.comparables}
            onComparablesChange={d => updateSection('comparables', d)}
            compAnalyses={reportData.comp_analyses}
            onCompAnalysesChange={d => updateSection('comp_analyses', d)}
            dcaEstimatedValue={reportData.dca_estimated_value}
            onDcaChange={d => updateSection('dca_estimated_value', d)}
            enabledGroups={reportData.comparables_groups_enabled}
            onEnabledGroupsChange={d => updateSection('comparables_groups_enabled', d)}
            fullReport={reportData}
          />
        );
      case 'history':
        return (
          <HistoryTab
            history={reportData.history}
            onHistoryChange={d => updateSection('history', d)}
            exposure={reportData.exposure}
            onExposureChange={d => updateSection('exposure', d)}
            reconciliation={reportData.reconciliation}
            onReconciliationChange={d => updateSection('reconciliation', d)}
            scope={reportData.scope}
            onScopeChange={d => updateSection('scope', d)}
            fullReport={reportData}
          />
        );
      case 'certification':
        return (
          <CertificationTab
            certification={reportData.certification}
            onCertificationChange={d => updateSection('certification', d)}
            addenda={reportData.addenda}
            onAddendaChange={d => updateSection('addenda', d)}
            parties={reportData.parties}
            onPartiesChange={d => updateSection('parties', d)}
            fullReport={reportData}
          />
        );
      case 'addenda':
        return (
          <AddendaTab
            scope={reportData.scope}
            onScopeChange={d => updateSection('scope', d)}
            extraordinaryItems={reportData.extraordinary_items}
            onExtraordinaryItemsChange={d => updateSection('extraordinary_items', d)}
            narrative={reportData.narrative}
            onNarrativeChange={d => updateSection('narrative', d)}
            costApproach={reportData.cost_approach}
            onCostApproachChange={d => updateSection('cost_approach', d)}
            marketRent={reportData.market_rent}
            onMarketRentChange={d => updateSection('market_rent', d)}
            incomeApproach={reportData.income_approach}
            onIncomeApproachChange={d => updateSection('income_approach', d)}
            addenda={reportData.addenda}
            onAddendaChange={d => updateSection('addenda', d)}
            fullReport={reportData}
          />
        );
      case 'generate':
        return (
          <div className="rf-center-placeholder">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Generate Report</div>
            <p style={{ color: '#6b7280' }}>PDF generation coming in a future session.</p>
          </div>
        );
      default:
        return (
          <div className="rf-center-placeholder">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeDef?.label}</div>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              Form fields coming in a future session.
            </p>
          </div>
        );
    }
  }

  return (
    <div className="rf-page">

      {/* ── HEADER ── */}
      <div className="rf-header">
        <button className="rf-back-btn" onClick={onBack}>← Back to Workfile</button>
        <div className="rf-header-center">
          <div className="rf-header-label">DRAFT REPORT</div>
          <div className="rf-header-address">{address}</div>
        </div>
        <div className="rf-header-right">
          <span className={`rf-save-status rf-save-${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'error' ? '⚠ Save failed'
              : '● Saved ✓'}
          </span>
          <button className="rf-generate-btn">Generate Report →</button>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="rf-tabbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`rf-tab ${activeTab === tab.id ? 'rf-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="rf-tab-icon">{tab.icon}</span>
            <span className="rf-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="rf-body">
        <div className="rf-section-header">
          <span className="rf-section-icon">{activeDef?.icon}</span>
          <h2 className="rf-section-title">{activeDef?.label}</h2>
          {activeDef?.fieldCount > 0 && (
            <span className="rf-field-count">{activeDef.fieldCount} fields</span>
          )}
          {activeDef?.autoFilled ? (
            <span className="rf-badge rf-badge-auto">Auto-filled from workfile ✓</span>
          ) : activeTab !== 'generate' && (
            <span className="rf-badge rf-badge-manual">Requires manual entry</span>
          )}
        </div>

        {renderTab()}
      </div>

      {/* ── TOAST ── */}
      {showToast && (
        <div className="rf-toast">
          ✓ Report pre-filled from workfile data. Review each section.
        </div>
      )}

    </div>
  );
}
