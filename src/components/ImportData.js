import { useState, useRef } from 'react';
import { importCSV, getImportJob } from '../services/api';

export default function ImportData({ onClose }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | polling | done | error
  const [jobResult, setJobResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef();
  const pollRef = useRef();

  const handleFile = (f) => {
    if (f && f.name.endsWith('.csv')) { setFile(f); setErrorMsg(''); }
    else setErrorMsg('Please select a .csv file.');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading'); setErrorMsg('');
    try {
      const { jobId } = await importCSV(file);
      setStatus('polling');
      pollRef.current = setInterval(async () => {
        try {
          const job = await getImportJob(jobId);
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(pollRef.current);
            setJobResult(job);
            setStatus(job.status === 'completed' ? 'done' : 'error');
          }
        } catch { clearInterval(pollRef.current); setStatus('error'); setErrorMsg('Lost connection while checking import status.'); }
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="import-data">
      <div className="import-header">
        <h2>Import Data</h2>
        <button className="btn btn-small" onClick={onClose}>✕ Close</button>
      </div>

      <div className="import-body">
        <div className="import-info-box">
          <strong>Supported format: CSV</strong>
          <p>Import your existing property database. The file should include columns like address, city, property_type, year_built, bedrooms, sqft_main, client_code, etc.</p>
          <p className="import-note">Duplicate addresses will be matched and updated, not duplicated.</p>
        </div>

        {status === 'idle' || status === 'error' ? (
          <>
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              {file ? (
                <span className="drop-zone-file">📄 {file.name}</span>
              ) : (
                <span>Drag &amp; drop a CSV file here, or click to browse</span>
              )}
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            {errorMsg && <p className="import-error">{errorMsg}</p>}
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file}>
              Upload &amp; Import
            </button>
          </>
        ) : status === 'uploading' ? (
          <div className="import-status">
            <p className="progress-label progress-pulse">Uploading file…</p>
          </div>
        ) : status === 'polling' ? (
          <div className="import-status">
            <p className="progress-label progress-pulse">Processing import… this may take a moment.</p>
          </div>
        ) : status === 'done' ? (
          <div className="import-complete">
            <h3>✅ Import Complete</h3>
            <div className="import-results">
              <div className="result-stat"><span className="stat-num">{jobResult?.inserted ?? 0}</span><span>New records</span></div>
              <div className="result-stat"><span className="stat-num">{jobResult?.updated ?? 0}</span><span>Updated</span></div>
              <div className="result-stat"><span className="stat-num">{jobResult?.skipped ?? 0}</span><span>Skipped</span></div>
            </div>
            {jobResult?.errors?.length > 0 && (
              <div className="import-errors-detail">
                <strong>{jobResult.errors.length} row{jobResult.errors.length !== 1 ? 's' : ''} had issues:</strong>
                <ul>{jobResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
