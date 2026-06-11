import { useState, useEffect } from 'react';
import PhotoCapture from './PhotoCapture';
import SystemsModal from './SystemsModal';

const FLOOR_LABELS = {
  basement: 'Basement',
  main:     'Main',
  second:   '2nd',
  third:    '3rd',
  fourth:   '4th',
};

const ROOM_LABELS = [
  'Living Room', 'Dining Room', 'Kitchen',
  'Bedroom', 'Full Bathroom', 'Partial Bathroom',
  'Den', 'Family Room', 'Laundry',
  'Entrance', 'Office', 'Sunroom',
  'Storage', 'Mechanical', 'Deficiency', 'Other',
];

// These labels show the flooring dropdown
const FLOORING_LABELS = [
  'Living Room', 'Dining Room', 'Kitchen',
  'Bedroom', 'Full Bathroom', 'Partial Bathroom',
  'Den', 'Family Room', 'Laundry',
  'Entrance', 'Office', 'Sunroom',
];

const SYSTEM_LABELS = [
  'Breaker Panel', 'Hot Water Heater', 'Furnace',
  'Air Conditioning', 'HRV/ERV', 'Other System',
];

// These labels don't count toward the room total
const NO_COUNT_LABELS = new Set(['Storage', 'Mechanical', 'Deficiency', 'Other']);

function getActiveTabs(data) {
  const tabs = [];
  if (data.has_basement)          tabs.push({ key: 'basement', label: 'B'    });
                                   tabs.push({ key: 'main',     label: 'Main' });
  if (data.floors.second.active)  tabs.push({ key: 'second',   label: '2nd'  });
  if (data.floors.third.active)   tabs.push({ key: 'third',    label: '3rd'  });
  if (data.floors.fourth.active)  tabs.push({ key: 'fourth',   label: '4th'  });
  return tabs;
}

function getNextTab(data, activeFloor) {
  const tabs = getActiveTabs(data);
  const idx  = tabs.findIndex(t => t.key === activeFloor);
  return idx >= 0 && idx < tabs.length - 1 ? tabs[idx + 1] : null;
}

function floorHasData(floor) {
  return floor?.rooms?.length > 0 || floor?.photos?.length > 0;
}

export default function FloorScreen({
  inspection, data, updateData, saveNow,
  uploading, setUploading,
  activeFloor, setActiveFloor, setScreen,
}) {
  const [activeCapture,      setActiveCapture]      = useState(null); // null | 'room' | 'system'
  const [pendingSystemLabel, setPendingSystemLabel] = useState(null);

  const isBasement    = activeFloor === 'basement';
  const currentFloor  = data.floors[activeFloor];
  const tabs          = getActiveTabs(data);
  const nextTab       = getNextTab(data, activeFloor);
  const floorTitle    = isBasement ? 'BASEMENT' : `${FLOOR_LABELS[activeFloor]?.toUpperCase() || ''} FLOOR`;

  // Reset capture mode when switching floors
  useEffect(() => { setActiveCapture(null); }, [activeFloor]);

  // ── Photo added: room ──
  const handleRoomPhotoAdded = (photo) => {
    updateData(prev => {
      const floor   = prev.floors[activeFloor];
      const label   = photo.label || 'Other';
      const existingIdx = floor.rooms.findIndex(r => r.label === label);

      const updatedRooms = existingIdx >= 0
        ? floor.rooms.map((r, i) =>
            i === existingIdx ? { ...r, photos: [...r.photos, photo] } : r
          )
        : [
            ...floor.rooms,
            { id: crypto.randomUUID(), label, floor: activeFloor, photos: [photo], notes: '' },
          ];

      return {
        ...prev,
        photos_total: prev.photos_total + 1,
        floors: {
          ...prev.floors,
          [activeFloor]: { ...floor, rooms: updatedRooms },
        },
      };
    });
  };

  // ── Photo added: system ──
  const handleSystemPhotoAdded = (photo) => {
    updateData(prev => ({
      ...prev,
      photos_total: prev.photos_total + 1,
      floors: {
        ...prev.floors,
        [activeFloor]: {
          ...prev.floors[activeFloor],
          photos: [...prev.floors[activeFloor].photos, photo],
        },
      },
    }));
    // Trigger secondary prompt for known system types
    const needsPrompt = ['Breaker Panel', 'Hot Water Heater', 'Furnace', 'Air Conditioning', 'HRV/ERV'];
    if (needsPrompt.includes(photo.label)) {
      setPendingSystemLabel(photo.label);
    }
  };

  // ── System secondary prompt saved ──
  const handleSystemDataSaved = (systemData) => {
    if (Object.keys(systemData).length > 0) {
      updateData(prev => ({
        ...prev,
        floors: {
          ...prev.floors,
          [activeFloor]: {
            ...prev.floors[activeFloor],
            systems: { ...prev.floors[activeFloor].systems, ...systemData },
          },
        },
      }));
    }
    setPendingSystemLabel(null);
  };

  // ── Navigation ──
  const handleNext = () => {
    if (nextTab) setActiveFloor(nextTab.key);
    else setScreen('measurements');
  };

  // ── Room summary (deduplicated by label) ──
  const roomSummary = currentFloor.rooms.reduce((acc, room) => {
    const existing = acc.find(r => r.label === room.label);
    if (existing) {
      existing.photoCount += room.photos.length;
    } else {
      acc.push({ id: room.id, label: room.label, photoCount: room.photos.length });
    }
    return acc;
  }, []);

  const sys = currentFloor.systems || {};

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={() => setScreen('questionnaire')}>← Back</button>
        <span className="it-header-title">{floorTitle}</span>
        <button className="it-next-btn" onClick={handleNext}>
          {nextTab ? `${nextTab.label} →` : 'Measurements →'}
        </button>
      </header>

      {/* Floor tabs — hidden while labeling */}
      {activeCapture === null && (
        <div className="it-floor-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`it-floor-tab ${activeFloor === tab.key ? 'active' : ''}`}
              onClick={() => setActiveFloor(tab.key)}
            >
              {tab.label}
              {floorHasData(data.floors[tab.key]) && (
                <span className="it-floor-tab-dot" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="it-content">

        {/* ── Room photos section ── */}
        {activeCapture !== 'system' && (
          <>
            <div className="it-section-heading">
              {isBasement ? 'Basement Rooms' : 'Room Photos'}
            </div>
            <PhotoCapture
              inspectionId={inspection.id}
              labels={ROOM_LABELS}
              showFlooring
              flooringLabels={FLOORING_LABELS}
              requiredNoteLabels={['Deficiency']}
              onPhotoAdded={handleRoomPhotoAdded}
              onLabelModeChange={labeling => setActiveCapture(labeling ? 'room' : null)}
              uploading={uploading}
              setUploading={setUploading}
            />
          </>
        )}

        {/* ── Rooms captured this floor ── */}
        {activeCapture !== 'room' && roomSummary.length > 0 && (
          <div className="it-rooms-list">
            {roomSummary.map(room => (
              <div key={room.id} className="it-room-row">
                <span className="it-room-name">
                  {room.label}
                  {NO_COUNT_LABELS.has(room.label) && (
                    <span className="it-room-no-count"> ·  not counted</span>
                  )}
                </span>
                <span className="it-room-photo-count">{room.photoCount} 📷</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Systems section — basement only ── */}
        {isBasement && activeCapture !== 'room' && (
          <>
            <div className="it-section-heading">Systems</div>
            <PhotoCapture
              inspectionId={inspection.id}
              labels={SYSTEM_LABELS}
              onPhotoAdded={handleSystemPhotoAdded}
              onLabelModeChange={labeling => setActiveCapture(labeling ? 'system' : null)}
              uploading={uploading}
              setUploading={setUploading}
            />

            {/* Systems summary */}
            {Object.values(sys).some(Boolean) && (
              <div className="it-systems-summary">
                {sys.heating && (
                  <div className="it-system-row">
                    <span className="it-system-icon">🔥</span>
                    <span>{sys.heating}{sys.fuel ? ` — ${sys.fuel}` : ''}</span>
                  </div>
                )}
                {sys.water_heater && (
                  <div className="it-system-row">
                    <span className="it-system-icon">💧</span>
                    <span>{sys.water_heater}</span>
                  </div>
                )}
                {sys.electrical_type && (
                  <div className="it-system-row">
                    <span className="it-system-icon">⚡</span>
                    <span>{sys.electrical_type}{sys.electrical_amps ? ` — ${sys.electrical_amps}A` : ''}</span>
                  </div>
                )}
                {sys.cooling && (
                  <div className="it-system-row">
                    <span className="it-system-icon">❄️</span>
                    <span>{sys.cooling}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Bottom nav ── */}
        {activeCapture === null && (
          <button className="it-primary-action-btn" onClick={handleNext}>
            {nextTab ? `${FLOOR_LABELS[nextTab.key]} Floor →` : 'Measurements →'}
          </button>
        )}

      </div>

      {/* Systems secondary prompt */}
      {pendingSystemLabel && (
        <SystemsModal
          label={pendingSystemLabel}
          onSave={handleSystemDataSaved}
          onClose={() => setPendingSystemLabel(null)}
        />
      )}
    </div>
  );
}
