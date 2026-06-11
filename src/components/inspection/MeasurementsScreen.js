import { useCallback } from 'react';

function calcSqft(ft1, in1, ft2, in2) {
  const l = (parseFloat(ft1) || 0) + (parseFloat(in1) || 0) / 12;
  const w = (parseFloat(ft2) || 0) + (parseFloat(in2) || 0) / 12;
  return l > 0 && w > 0 ? Math.round(l * w) : null;
}

function hasAdditionalFloors(data) {
  return data.floors.second.active || data.floors.third.active || data.floors.fourth.active;
}

function FtInPair({ label, ftKey, inKey, meas, onChange }) {
  return (
    <div className="it-meas-row">
      <span className="it-meas-label">{label}</span>
      <div className="it-ft-in-pair">
        <div className="it-ft-in-field">
          <input
            type="number"
            inputMode="decimal"
            className="it-ft-in-input"
            placeholder="0"
            value={meas[ftKey]}
            onChange={e => onChange(ftKey, e.target.value)}
          />
          <span className="it-ft-in-unit">ft</span>
        </div>
        <div className="it-ft-in-field">
          <input
            type="number"
            inputMode="decimal"
            className="it-ft-in-input"
            placeholder="0"
            min="0"
            max="11"
            value={meas[inKey]}
            onChange={e => onChange(inKey, e.target.value)}
          />
          <span className="it-ft-in-unit">in</span>
        </div>
      </div>
    </div>
  );
}

export default function MeasurementsScreen({ data, updateData, setScreen }) {
  const meas         = data.measurements;
  const hasAdditional = hasAdditionalFloors(data);

  const updateMeas = useCallback((key, value) => {
    updateData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value },
    }));
  }, [updateData]);

  const mainSqft = calcSqft(
    meas.main_length_ft, meas.main_length_in,
    meas.main_width_ft,  meas.main_width_in,
  );
  const garageSqft = meas.has_garage
    ? calcSqft(meas.garage_length_ft, meas.garage_length_in, meas.garage_width_ft, meas.garage_width_in)
    : null;
  const addlSqft = hasAdditional && meas.additional_floors_type === 'custom'
    ? calcSqft(
        meas.additional_custom_length_ft, meas.additional_custom_length_in,
        meas.additional_custom_width_ft,  meas.additional_custom_width_in,
      )
    : null;

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={() => setScreen('floor')}>← Back</button>
        <span className="it-header-title">MEASUREMENTS</span>
        <button className="it-next-btn" onClick={() => setScreen('review')}>Review →</button>
      </header>

      <div className="it-content">

        {/* ── Main Floor ── */}
        <div className="it-section-heading">Main Floor</div>
        <div className="it-meas-card">
          <FtInPair label="Length" ftKey="main_length_ft" inKey="main_length_in" meas={meas} onChange={updateMeas} />
          <FtInPair label="Width"  ftKey="main_width_ft"  inKey="main_width_in"  meas={meas} onChange={updateMeas} />
          {mainSqft !== null && (
            <div className="it-meas-sqft">≈ {mainSqft.toLocaleString()} sq ft</div>
          )}
        </div>

        {/* ── Garage ── */}
        <div className="it-section-heading">Garage</div>
        <div className="it-meas-card">
          <div className={`it-yn-row${meas.has_garage ? ' it-meas-yn-spaced' : ''}`}>
            <button
              className={`it-yn-btn yes ${meas.has_garage === true ? 'selected' : ''}`}
              onClick={() => updateMeas('has_garage', true)}
            >Has Garage</button>
            <button
              className={`it-yn-btn no ${meas.has_garage === false ? 'selected' : ''}`}
              onClick={() => updateMeas('has_garage', false)}
            >No Garage</button>
          </div>

          {meas.has_garage && (
            <div className="it-meas-garage-fields">
              <FtInPair label="Length" ftKey="garage_length_ft" inKey="garage_length_in" meas={meas} onChange={updateMeas} />
              <FtInPair label="Width"  ftKey="garage_width_ft"  inKey="garage_width_in"  meas={meas} onChange={updateMeas} />
              {garageSqft !== null && (
                <div className="it-meas-sqft">≈ {garageSqft.toLocaleString()} sq ft</div>
              )}
            </div>
          )}
        </div>

        {/* ── Additional Floors ── */}
        {hasAdditional && (
          <>
            <div className="it-section-heading">Additional Floors</div>
            <div className="it-meas-card">
              <div className="it-chip-row it-meas-type-chips">
                {[
                  { val: 'same',    label: 'Same as main' },
                  { val: 'partial', label: 'Enter sq ft'  },
                  { val: 'custom',  label: 'Custom L × W' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    className={`it-chip ${meas.additional_floors_type === opt.val ? 'selected' : ''}`}
                    onClick={() => updateMeas('additional_floors_type', opt.val)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {meas.additional_floors_type === 'partial' && (
                <div className="it-meas-sqft-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="it-meas-sqft-input"
                    placeholder="Total sq ft"
                    value={meas.additional_floors_sqft}
                    onChange={e => updateMeas('additional_floors_sqft', e.target.value)}
                  />
                </div>
              )}

              {meas.additional_floors_type === 'custom' && (
                <>
                  <FtInPair label="Length" ftKey="additional_custom_length_ft" inKey="additional_custom_length_in" meas={meas} onChange={updateMeas} />
                  <FtInPair label="Width"  ftKey="additional_custom_width_ft"  inKey="additional_custom_width_in"  meas={meas} onChange={updateMeas} />
                  {addlSqft !== null && (
                    <div className="it-meas-sqft">≈ {addlSqft.toLocaleString()} sq ft</div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── Notes ── */}
        <div className="it-section-heading">Notes</div>
        <textarea
          className="it-textarea"
          rows={3}
          placeholder="Any measurement notes…"
          value={meas.notes}
          onChange={e => updateMeas('notes', e.target.value)}
        />

        <button className="it-primary-action-btn" onClick={() => setScreen('review')}>
          Review →
        </button>

      </div>
    </div>
  );
}
