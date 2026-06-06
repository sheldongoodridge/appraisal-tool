import { useState } from 'react';

const DWELLING_STYLES = [
  'Bungalow',
  'Raised Bungalow',
  '1.5 Storey',
  '2 Storey',
  '3 Storey',
  'Side Split',
  'Back Split',
  'Other',
];

export default function InsideQuestionnaire({
  inspection, data, updateData,
  setScreen, setActiveFloor,
}) {
  const [styleOther, setStyleOther] = useState(data.dwelling_style_other || '');

  // ── Handlers ──

  const setBasement = (has) => {
    updateData(prev => ({
      ...prev,
      has_basement: has,
      floors: {
        ...prev.floors,
        basement: { ...prev.floors.basement, active: has },
      },
    }));
  };

  const setStyle = (style) => {
    // Derive floor activations from style (not for 'Other' — user toggles manually)
    const second = ['1.5 Storey', '2 Storey', '3 Storey', 'Side Split', 'Back Split'].includes(style);
    const third  = style === '3 Storey';

    updateData(prev => ({
      ...prev,
      dwelling_style: style,
      ...(style !== 'Other' ? {
        floors: {
          ...prev.floors,
          second: { ...prev.floors.second, active: second },
          third:  { ...prev.floors.third,  active: third  },
          fourth: { ...prev.floors.fourth, active: false  },
        },
      } : {}),
    }));
  };

  const toggleFloor = (floor) => {
    updateData(prev => ({
      ...prev,
      floors: {
        ...prev.floors,
        [floor]: { ...prev.floors[floor], active: !prev.floors[floor].active },
      },
    }));
  };

  const goToFloor = (floor) => {
    setActiveFloor(floor);
    setScreen('floor');
  };

  // ── Build floor picker list ──
  const floorButtons = [
    data.has_basement               && { key: 'basement', label: 'Basement' },
                                       { key: 'main',     label: 'Main'     },
    data.floors.second.active       && { key: 'second',   label: '2nd'      },
    data.floors.third.active        && { key: 'third',    label: '3rd'      },
    data.floors.fourth.active       && { key: 'fourth',   label: '4th'      },
  ].filter(Boolean);

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={() => setScreen('exterior')}>← Back</button>
        <span className="it-header-title">BEFORE WE GO INSIDE</span>
        <button className="it-next-btn" onClick={() => goToFloor('main')}>Skip →</button>
      </header>

      <div className="it-content">

        {/* ── Q1: Basement ── */}
        <div className="it-question-block">
          <p className="it-question-label">Is there a basement?</p>
          <div className="it-yn-row">
            <button
              className={`it-yn-btn yes ${data.has_basement ? 'selected' : ''}`}
              onClick={() => setBasement(true)}
            >✅ Yes</button>
            <button
              className={`it-yn-btn no ${!data.has_basement ? 'selected' : ''}`}
              onClick={() => setBasement(false)}
            >❌ No</button>
          </div>
        </div>

        {/* ── Q2: Dwelling style ── */}
        <div className="it-question-block">
          <p className="it-question-label">Style of dwelling?</p>
          <div className="it-style-options">
            {DWELLING_STYLES.map(style => (
              <label
                key={style}
                className={`it-style-option ${data.dwelling_style === style ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="dwelling-style"
                  value={style}
                  checked={data.dwelling_style === style}
                  onChange={() => setStyle(style)}
                />
                {style}
              </label>
            ))}
          </div>

          {data.dwelling_style === 'Other' && (
            <>
              <input
                type="text"
                className="it-other-input"
                placeholder="Describe dwelling style…"
                value={styleOther}
                onChange={e => {
                  setStyleOther(e.target.value);
                  updateData(prev => ({ ...prev, dwelling_style_other: e.target.value }));
                }}
              />
              <div className="it-floor-toggles">
                <p className="it-question-sublabel">Which additional floors are present?</p>
                <div className="it-chip-row">
                  {[['second', '2nd Floor'], ['third', '3rd Floor'], ['fourth', '4th Floor']].map(([key, label]) => (
                    <button
                      key={key}
                      className={`it-floor-toggle ${data.floors[key].active ? 'active' : ''}`}
                      onClick={() => toggleFloor(key)}
                    >
                      {label} {data.floors[key].active ? '✓' : '+'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Q3: Floor picker ── */}
        <div className="it-question-block">
          <p className="it-question-label">Where are we starting?</p>
          <div className="it-floor-picker">
            {floorButtons.map(f => (
              <button
                key={f.key}
                className="it-floor-pick-btn"
                onClick={() => goToFloor(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
