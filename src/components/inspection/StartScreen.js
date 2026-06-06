export default function StartScreen({ inspection, data, isDriveby, onBack, setScreen }) {
  const address = inspection.property_data?.address || 'Unknown Address';
  const hasProgress = data.exterior.photos.length > 0 ||
    Object.values(data.floors).some(f => f.rooms?.length > 0);

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={onBack}>← Workfile</button>
        <span className="it-header-title">INSPECTION</span>
        <span className="it-header-badge">
          {inspection.property_data?.appraisalType || ''}
        </span>
      </header>

      <div className="it-content it-start-content">
        <p className="it-start-address">{address}</p>

        {hasProgress && (
          <span className="it-resume-pill">In progress</span>
        )}

        <p className="it-start-prompt">
          {isDriveby ? 'Drive-By Inspection' : 'Where would you like to start?'}
        </p>

        <div className="it-choice-group">
          {isDriveby ? (
            <button className="it-choice-btn" onClick={() => setScreen('exterior')}>
              <span className="it-choice-icon">📷</span>
              <div className="it-choice-text">
                <span className="it-choice-label">Start Drive-By</span>
                <span className="it-choice-sub">Capture street and front photos</span>
              </div>
            </button>
          ) : (
            <>
              <button className="it-choice-btn" onClick={() => setScreen('exterior')}>
                <span className="it-choice-icon">🏠</span>
                <div className="it-choice-text">
                  <span className="it-choice-label">Outside</span>
                  <span className="it-choice-sub">Exterior photos and observations</span>
                </div>
              </button>
              <button className="it-choice-btn" onClick={() => setScreen('questionnaire')}>
                <span className="it-choice-icon">🚪</span>
                <div className="it-choice-text">
                  <span className="it-choice-label">Inside</span>
                  <span className="it-choice-sub">Floor-by-floor room photos</span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
