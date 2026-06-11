import { useState, useRef, useCallback, useEffect } from 'react';
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
  return existing || createNewInspection();
}

export default function InspectionTool({ inspection, onBack, onComplete }) {
  const isDriveby     = inspection.property_data?.appraisalType === 'Drive-By';
  const [screen,      setScreen]      = useState('start');
  const [activeFloor, setActiveFloor] = useState('main');
  const [data,        setData]        = useState(() => initInspection(inspection.workfile_data));
  const [uploading,   setUploading]   = useState({});

  const saveTimer = useRef(null);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const save = useCallback((updated) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await patchSection(inspection.id, 'inspections', [updated]); }
      catch (err) { console.error('Inspection save error:', err); }
    }, 2000);
  }, [inspection.id]);

  // Debounced update — used for text fields, dropdowns, etc.
  const updateData = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      save(next);
      return next;
    });
  }, [save]);

  // Immediate save — used after photo uploads complete
  const saveNow = useCallback(async (updated) => {
    clearTimeout(saveTimer.current);
    try { await patchSection(inspection.id, 'inspections', [updated]); }
    catch (err) { console.error('Inspection save error:', err); }
  }, [inspection.id]);

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
    </div>
  );
}
