import { useState } from 'react';

// ── Shared helpers ──────────────────────────────────────────────────────────

const FLOOR_LABELS = { basement: 'Basement', main: 'Main', second: '2nd Floor', third: '3rd Floor', fourth: '4th Floor' };
const NO_COUNT_LABELS = new Set(['Storage', 'Mechanical', 'Deficiency', 'Other']);

function getActiveTabs(data) {
  const tabs = [];
  if (data.has_basement)          tabs.push('basement');
                                   tabs.push('main');
  if (data.floors.second.active)  tabs.push('second');
  if (data.floors.third.active)   tabs.push('third');
  if (data.floors.fourth.active)  tabs.push('fourth');
  return tabs;
}

function calcSqft(ft1, in1, ft2, in2) {
  const l = (parseFloat(ft1) || 0) + (parseFloat(in1) || 0) / 12;
  const w = (parseFloat(ft2) || 0) + (parseFloat(in2) || 0) / 12;
  return l > 0 && w > 0 ? Math.round(l * w) : null;
}

function fmtFtIn(ft, inches) {
  const f = parseInt(ft)    || 0;
  const i = parseInt(inches) || 0;
  if (f === 0 && i === 0) return '';
  return i > 0 ? `${f}′ ${i}″` : `${f}′`;
}

function fmtDim(ftA, inA, ftB, inB) {
  const a = fmtFtIn(ftA, inA);
  const b = fmtFtIn(ftB, inB);
  return a && b ? `${a} × ${b}` : '';
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, onEdit }) {
  return (
    <div className="it-review-section-header">
      <span className="it-review-section-title">{title}</span>
      {onEdit && (
        <button className="it-review-edit-btn" onClick={onEdit}>Edit</button>
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  const empty = !value;
  return (
    <div className="it-review-row">
      <span className="it-review-row-label">{label}</span>
      <span className={`it-review-row-value${empty ? ' empty' : ''}`}>{value || '—'}</span>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function ReviewScreen({
  inspection, data, updateData, saveNow,
  setScreen, setActiveFloor, onComplete,
}) {
  const [completing, setCompleting] = useState(false);

  const ext   = data.exterior;
  const meas  = data.measurements;
  const tabs  = getActiveTabs(data);

  // ── Stats ──
  const totalPhotos = data.photos_total;
  const totalRooms  = tabs.reduce((sum, key) => {
    return sum + (data.floors[key]?.rooms ?? []).filter(r => !NO_COUNT_LABELS.has(r.label)).length;
  }, 0);

  // ── Measurement display values ──
  const mainDim   = fmtDim(meas.main_length_ft, meas.main_length_in, meas.main_width_ft, meas.main_width_in);
  const mainSqft  = calcSqft(meas.main_length_ft, meas.main_length_in, meas.main_width_ft, meas.main_width_in);
  const mainLabel = mainDim
    ? `${mainDim}${mainSqft ? ` · ≈${mainSqft.toLocaleString()} sq ft` : ''}`
    : '';

  const garageDim  = fmtDim(meas.garage_length_ft, meas.garage_length_in, meas.garage_width_ft, meas.garage_width_in);
  const garageSqft = calcSqft(meas.garage_length_ft, meas.garage_length_in, meas.garage_width_ft, meas.garage_width_in);
  const garageLabel = meas.has_garage === false
    ? 'No garage'
    : meas.has_garage === true && garageDim
      ? `${garageDim}${garageSqft ? ` · ≈${garageSqft.toLocaleString()} sq ft` : ''}`
      : meas.has_garage === true
        ? 'Yes — dimensions not entered'
        : '';

  const hasAdditional = data.floors.second.active || data.floors.third.active || data.floors.fourth.active;
  let addlLabel = '';
  if (hasAdditional) {
    if (meas.additional_floors_type === 'same') {
      addlLabel = mainSqft ? `Same as main · ≈${mainSqft.toLocaleString()} sq ft / floor` : 'Same as main';
    } else if (meas.additional_floors_type === 'partial') {
      addlLabel = meas.additional_floors_sqft
        ? `${parseInt(meas.additional_floors_sqft).toLocaleString()} sq ft total`
        : '';
    } else if (meas.additional_floors_type === 'custom') {
      const dim  = fmtDim(meas.additional_custom_length_ft, meas.additional_custom_length_in, meas.additional_custom_width_ft, meas.additional_custom_width_in);
      const sqft = calcSqft(meas.additional_custom_length_ft, meas.additional_custom_length_in, meas.additional_custom_width_ft, meas.additional_custom_width_in);
      addlLabel = dim ? `${dim}${sqft ? ` · ≈${sqft.toLocaleString()} sq ft` : ''}` : '';
    }
  }

  // ── Parking display ──
  const parkingLabel = [
    ext.parking.type === 'Other' ? (ext.parking.type_other || 'Other') : ext.parking.type,
    ext.parking.stalls === 'Other'
      ? (ext.parking.stalls_other ? `${ext.parking.stalls_other} stalls` : '')
      : ext.parking.stalls ? `${ext.parking.stalls} stall${ext.parking.stalls !== '1' ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  // ── Complete ──
  const handleComplete = async () => {
    setCompleting(true);
    const updated = {
      ...data,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    updateData(() => updated);
    try {
      await saveNow(updated);
      onComplete?.(updated);
    } catch {
      setCompleting(false); // let user retry; error toast shown by InspectionTool
    }
  };

  const goToFloor = (key) => {
    setActiveFloor(key);
    setScreen('floor');
  };

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={() => setScreen('measurements')}>← Back</button>
        <span className="it-header-title">REVIEW</span>
        <button
          className="it-next-btn"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? 'Saving…' : 'Complete ✓'}
        </button>
      </header>

      <div className="it-content">

        {/* ── Address ── */}
        {inspection.property_data?.address && (
          <p className="it-review-address">{inspection.property_data.address}</p>
        )}

        {/* ── Stats bar ── */}
        <div className="it-review-stats-bar">
          <div className="it-review-stat">
            <span className="it-review-stat-val">{totalPhotos}</span>
            <span className="it-review-stat-label">Photos</span>
          </div>
          <div className="it-review-stat">
            <span className="it-review-stat-val">{totalRooms}</span>
            <span className="it-review-stat-label">Rooms</span>
          </div>
          {mainSqft && (
            <div className="it-review-stat">
              <span className="it-review-stat-val">{mainSqft.toLocaleString()}</span>
              <span className="it-review-stat-label">Main sq ft</span>
            </div>
          )}
        </div>

        {/* ── Exterior ── */}
        <div className="it-review-section">
          <SectionHeader title="Exterior" onEdit={() => setScreen('exterior')} />
          <ReviewRow label="Photos"    value={ext.photos.length > 0 ? `${ext.photos.length} captured` : ''} />
          <ReviewRow label="Cladding"  value={ext.cladding === 'Other' ? (ext.cladding_other || 'Other') : ext.cladding} />
          <ReviewRow label="Roofing"   value={ext.roofing  === 'Other' ? (ext.roofing_other  || 'Other') : ext.roofing}  />
          <ReviewRow label="Windows"   value={ext.windows  === 'Other' ? (ext.windows_other  || 'Other') : ext.windows}  />
          <ReviewRow label="Condition" value={ext.condition} />
          <ReviewRow label="Parking"   value={parkingLabel} />
        </div>

        {/* ── Structure ── */}
        <div className="it-review-section">
          <SectionHeader title="Structure" onEdit={() => setScreen('questionnaire')} />
          <ReviewRow label="Style"     value={data.dwelling_style === 'Other' ? (data.dwelling_style_other || 'Other') : data.dwelling_style} />
          <ReviewRow label="Basement"  value={data.has_basement ? 'Yes' : 'No'} />
        </div>

        {/* ── Floors ── */}
        <div className="it-review-section">
          <SectionHeader title="Floors" />
          {tabs.map(key => {
            const floor      = data.floors[key];
            const roomCount  = (floor?.rooms ?? []).filter(r => !NO_COUNT_LABELS.has(r.label)).length;
            const photoCount = (floor?.rooms ?? []).reduce((s, r) => s + r.photos.length, 0)
                             + (floor?.photos ?? []).length;
            return (
              <div key={key} className="it-review-floor-row">
                <div className="it-review-floor-info">
                  <span className="it-review-floor-name">{FLOOR_LABELS[key]}</span>
                  <span className="it-review-floor-stats">
                    {roomCount} room{roomCount !== 1 ? 's' : ''} · {photoCount} photo{photoCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <button className="it-review-edit-btn" onClick={() => goToFloor(key)}>Edit</button>
              </div>
            );
          })}
        </div>

        {/* ── Measurements ── */}
        <div className="it-review-section">
          <SectionHeader title="Measurements" onEdit={() => setScreen('measurements')} />
          <ReviewRow label="Main Floor" value={mainLabel} />
          <ReviewRow label="Garage"     value={garageLabel} />
          {hasAdditional && (
            <ReviewRow label="Upper Floors" value={addlLabel} />
          )}
          {meas.notes ? <ReviewRow label="Notes" value={meas.notes} /> : null}
        </div>

        {/* ── Complete button ── */}
        <button
          className="it-complete-btn"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? 'Saving…' : '✓ Complete Inspection'}
        </button>

      </div>
    </div>
  );
}
