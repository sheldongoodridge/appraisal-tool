import { useState, useRef, useEffect } from 'react';
import './CameraModal.css';

export default function CameraModal({ onCapture, onCancel, onFallback }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const activeRef = useRef(true);
  const [facingMode, setFacingMode] = useState('environment');
  const [ready,      setReady]      = useState(false);
  const [error,      setError]      = useState(null); // null | 'permission' | 'unavailable'

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startStream = async (facing) => {
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 4096 }, height: { ideal: 2160 } },
      });
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setReady(true);
    } catch (err) {
      if (activeRef.current)
        setError(err.name === 'NotAllowedError' ? 'permission' : 'unavailable');
    }
  };

  useEffect(() => {
    startStream('environment');
    return () => {
      activeRef.current = false;
      stopStream();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = async () => {
    if (!ready) return;
    stopStream();
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startStream(next);
  };

  const handleCapture = () => {
    if (!ready || !videoRef.current) return;
    const video  = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopStream();
    canvas.toBlob(blob => onCapture(blob), 'image/jpeg', 0.92);
  };

  const handleCancel   = () => { stopStream(); onCancel();   };
  const handleFallback = () => { stopStream(); onFallback(); };

  if (error) {
    return (
      <div className="cam-overlay">
        <div className="cam-error-box">
          <p className="cam-error-msg">
            {error === 'permission'
              ? 'Camera permission was denied. Allow camera access in browser settings, or use the file picker.'
              : 'Camera is unavailable on this device.'}
          </p>
          <button className="cam-fallback-btn" onClick={handleFallback}>
            📁 Use File Picker Instead
          </button>
          <button className="cam-cancel-text" onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cam-overlay">
      <video ref={videoRef} className="cam-video" playsInline muted autoPlay />
      {!ready && <div className="cam-loading">Starting camera…</div>}
      <div className="cam-controls">
        <button className="cam-cancel-btn" onClick={handleCancel} aria-label="Cancel">✕</button>
        <button
          className="cam-shutter-btn"
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Capture photo"
        />
        <button className="cam-flip-btn" onClick={handleFlip} disabled={!ready} aria-label="Flip camera">
          🔄
        </button>
      </div>
    </div>
  );
}
