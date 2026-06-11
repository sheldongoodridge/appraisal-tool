import { useState, useRef, useCallback, useEffect, Component } from 'react';
import './InspectionTool.css';
import StartScreen    from './inspection/StartScreen';
import ExteriorScreen      from './inspection/ExteriorScreen';
import InsideQuestionnaire from './inspection/InsideQuestionnaire';
import FloorScreen          from './inspection/FloorScreen';
import MeasurementsScreen  from './inspection/MeasurementsScreen';
import ReviewScreen        from './inspection/ReviewScreen';

const API_BASE = 'https://spokeappraisal.com/api';

async function patchSection(id, section, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, data }),
  });
  if (!res.ok) throw new Error('Inspection save failed');
}

function createNewInspection() {
  return {
    id: crypto.randomUUID(),
    type: 'full',
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'in_progress',
    exterior: {
      photos: [],
      cladding: '', roofing: '', windows: '', condition: '',
      parking: { type: '', stalls: '' },
      notes: '',
    },
    floors: {
      basement: {
        active: false, photos: [], rooms: [],
        systems: {
          heating: '', fuel: '', water_heater: '',
          electrical_type: '', electrical_amps: '',
          cooling: '', plumbing: '',
        },
      },
      main:   { active: true,  photos: [], rooms: [] },
      second: { active: false, photos: [], rooms: [] },
      third:  { active: false, photos: [], rooms: [] },
      fourth: { active: false, photos: [], rooms: [] },
    },
    dwelling_style: '',
    has_basement: false,
    warnings_dismissed: [],
    photos_total: 0,
    measurements: {
      main_length_ft: '', main_length_in: '',
      main_width_ft: '',  main_width_in: '',
      garage_length_ft: '', garage_length_in: '',
      garage_width_ft: '',  garage_width_in: '',
      has_garage: null,
      additional_floors_type: 'same', // 'same' | 'partial' | 'custom'
      additional_floors_sqft: '',
      additional_custom_length_ft: '', additional_custom_length_in: '',
      additional_custom_width_ft: '',  additional_custom_width_in: '',
      notes: '',
    },
  };
}

function initInspection(workfileData) {
  const existing = workfileData?.inspections?.[0];
  if (!existing) return createNewInspection();

  // Deep-merge with defaults so screens never crash on missing fields
  // (older inspections may lack measurements, systems, has_garage, etc.)
  const def = createNewInspection();
  return {
    ...def,
    ...existing,
    exterior: {
      ...def.exterior,
      ...(existing.exterior ?? {}),
      parking: { ...def.exterior.parking, ...(existing.exterior?.parking ?? {}) },
    },
    floors: {
      ...def.floors,
      ...(existing.floors ?? {}),
      basement: {
        ...def.floors.basement,
        ...(existing.floors?.basement ?? {}),
        systems: { ...def.floors.basement.systems, ...(existing.floors?.basement?.systems ?? {}) },
      },
      main:   { ...def.floors.main,   ...(existing.floors?.main   ?? {}) },
      second: { ...def.floors.second, ...(existing.floors?.second ?? {}) },
      third:  { ...def.floors.third,  ...(existing.floors?.third  ?? {}) },
      fourth: { ...def.floors.fourth, ...(existing.floors?.fourth ?? {}) },
    },
    measurements: { ...def.measurements, ...(existing.measurements ?? {}) },
  };
}

function InspectionToolInner({ inspection, onBack, onComplete }) {
  const isDriveby     = inspection.property_data?.appraisalType === 'Drive-By';
  const [screen,      setScreen]      = useState('start');
  const [activeFloor, setActiveFloor] = useState('main');
  const [data,        setData]        = useState(() => initInspection(inspection.workfile_data));
  const [uploading,   setUploading]   = useState({});
  const [saveStatus,  setSaveStatus]  = useState(null); // null | 'saving' | 'saved' | 'error'

  const saveTimer      = useRef(null);
  const saveClearTimer = useRef(null);
  const mountedRef     = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(saveTimer.current);
    clearTimeout(saveClearTimer.current);
  }, []);

  const markSaved = () => {
    if (!mountedRef.current) return;
    setSaveStatus('saved');
    clearTimeout(saveClearTimer.current);
    saveClearTimer.current = setTimeout(() => {
      if (mountedRef.current) setSaveStatus(null);
    }, 2000);
  };

  const save = useCallback((updated) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      setSaveStatus('saving');
      try {
        await patchSection(inspection.id, 'inspections', [updated]);
        markSaved();
      } catch (err) {
        console.error('Inspection save error:', err);
        if (mountedRef.current) setSaveStatus('error');
      }
    }, 2000);
  }, [inspection.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced update — used for text fields, dropdowns, etc.
  const updateData = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      save(next);
      return next;
    });
  }, [save]);

  // Immediate save — used after photo uploads and on complete
  const saveNow = useCallback(async (updated) => {
    clearTimeout(saveTimer.current);
    if (!mountedRef.current) return;
    setSaveStatus('saving');
    try {
      await patchSection(inspection.id, 'inspections', [updated]);
      markSaved();
    } catch (err) {
      console.error('Inspection save error:', err);
      if (mountedRef.current) setSaveStatus('error');
      throw err; // re-throw so callers (e.g. ReviewScreen) can react
    }
  }, [inspection.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sharedProps = {
    inspection, data, updateData, saveNow,
    isDriveby, uploading, setUploading,
    activeFloor, setActiveFloor, setScreen,
    onComplete,
  };

  return (
    <div className="it-overlay">
      {screen === 'start' && (
        <StartScreen {...sharedProps} onBack={onBack} />
      )}
      {screen === 'exterior' && (
        <ExteriorScreen {...sharedProps} />
      )}
      {screen === 'questionnaire' && (
        <InsideQuestionnaire {...sharedProps} />
      )}
      {screen === 'floor' && (
        <FloorScreen {...sharedProps} />
      )}
      {screen === 'measurements' && (
        <MeasurementsScreen {...sharedProps} />
      )}
      {screen === 'review' && (
        <ReviewScreen {...sharedProps} />
      )}

      {/* Floating save status toast */}
      {saveStatus && (
        <div className={`it-save-toast it-save-toast--${saveStatus}`}>
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved'  && '✓ Saved'}
          {saveStatus === 'error'  && '⚠ Save failed — check connection'}
        </div>
      )}
    </div>
  );
}

// ── Error boundary ───────────────────────────────────────────────────────────
class InspectionErrorBoundary extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(err, info) {
    console.error('InspectionTool crash:', err, info);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="it-overlay it-error-screen">
          <div className="it-error-content">
            <div className="it-error-icon">⚠️</div>
            <h2 className="it-error-title">Something went wrong</h2>
            <p className="it-error-msg">
              Your progress has been saved. You can continue from where you left off.
            </p>
            <button
              className="it-primary-action-btn"
              style={{ maxWidth: 320 }}
              onClick={() => this.setState({ crashed: false })}
            >
              Continue Inspection
            </button>
            <button
              className="it-skip-btn"
              style={{ maxWidth: 320, marginTop: 12 }}
              onClick={() => { this.setState({ crashed: false }); this.props.onBack?.(); }}
            >
              Back to workfile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function InspectionTool(props) {
  return (
    <InspectionErrorBoundary onBack={props.onBack}>
      <InspectionToolInner {...props} />
    </InspectionErrorBoundary>
  );
}
