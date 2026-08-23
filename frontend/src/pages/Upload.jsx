import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload as UploadIcon, FileAudio, X, Loader2, Puzzle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

const ACCEPTED_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'audio/x-m4a': ['.m4a'],
  'audio/m4a': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/flac': ['.flac'],
};

export default function UploadPage() {
  const [file,      setFile]      = useState(null);
  const [title,     setTitle]     = useState('');
  const [selfName,  setSelfName]  = useState(() => localStorage.getItem('nudge_self_name') || '');
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const navigate = useNavigate();

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Unsupported file format. Use: mp3, wav, mp4, webm, m4a, ogg, flac');
      return;
    }
    if (accepted.length > 0) {
      setFile(accepted[0]);
      if (!title) {
        setTitle(accepted[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024, // 200 MB
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(10);

    // Persist self name across sessions
    if (selfName.trim()) localStorage.setItem('nudge_self_name', selfName.trim());

    // Simulate progress since fetch doesn't support upload progress natively
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 8, 85));
    }, 500);

    try {
      const result = await toast.promise(
        api.uploadMeeting(file, title, selfName.trim() || undefined),
        {
          loading: '🎙️ Uploading & transcribing...',
          success: '✅ Transcription complete!',
          error: (err) => `❌ ${err.message}`,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      // Navigate to meeting detail after short delay
      setTimeout(() => {
        navigate(`/meetings/${result.meeting_id}`);
      }, 800);
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Upload Meeting</h1>
        <p>Upload an audio or video file — Whisper AI transcribes it in seconds</p>
      </div>

      {/* Chrome Extension Live Meeting Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(13, 148, 136, 0.08))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8',
            flexShrink: 0
          }}>
            <Puzzle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F8FAFC' }}>
              Recording a live Google Meet or Zoom call?
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Use the Nudge Chrome Extension for 1-click tab audio capture without background echo.
            </div>
          </div>
        </div>
        <a
          href="https://github.com/Kishan8548/Nudge/tree/main/extension"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#38BDF8',
            color: '#050505',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          Get Extension <ArrowRight size={14} />
        </a>
      </div>

      <div className="upload-container glass-card">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="dropzone-file">
              <FileAudio size={32} className="dropzone-file-icon" />
              <div className="dropzone-file-info">
                <div className="dropzone-file-name">{file.name}</div>
                <div className="dropzone-file-size">{formatSize(file.size)}</div>
              </div>
              <button
                className="btn btn-ghost"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="dropzone-placeholder">
              <div className="dropzone-icon">
                <UploadIcon size={32} />
              </div>
              <div className="dropzone-text">
                {isDragActive
                  ? 'Drop your file here...'
                  : 'Drag & drop your meeting recording'}
              </div>
              <div className="dropzone-hint">
                or click to browse • MP3, WAV, MP4, WebM, M4A, OGG, FLAC • Max 200 MB
              </div>
            </div>
          )}
        </div>

        {/* Your name — for is_mine tagging */}
        <div className="upload-field">
          <label htmlFor="self-name">
            Your name in the meeting
            <span className="field-hint"> — used to identify your tasks</span>
          </label>
          <input
            id="self-name"
            type="text"
            className="input-field"
            placeholder="e.g., Suren"
            value={selfName}
            onChange={(e) => setSelfName(e.target.value)}
            disabled={uploading}
          />
        </div>

        {/* Title input */}
        <div className="upload-field">
          <label htmlFor="meeting-title">Meeting Title (optional)</label>
          <input
            id="meeting-title"
            type="text"
            className="input-field"
            placeholder="e.g., Sprint Planning — July 25"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {/* Upload button */}
        <button
          className="btn btn-primary upload-btn"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="spin" /> Transcribing...
            </>
          ) : (
            <>
              <UploadIcon size={16} /> Upload & Transcribe
            </>
          )}
        </button>
      </div>

      <style>{`
        .upload-container {
          max-width: 640px;
        }
        .dropzone {
          border: 2px dashed var(--glass-border);
          border-radius: var(--radius-md);
          padding: var(--space-2xl);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-base);
          margin-bottom: var(--space-lg);
        }
        .dropzone:hover, .dropzone-active {
          border-color: var(--accent-primary);
          background: rgba(13, 148, 136, 0.05);
        }
        .dropzone-active {
          transform: scale(1.01);
        }
        .dropzone-has-file {
          border-style: solid;
          border-color: var(--accent-primary);
          padding: var(--space-lg);
        }
        .dropzone-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
        }
        .dropzone-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(13, 148, 136, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-secondary);
        }
        .dropzone-text {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .dropzone-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .dropzone-file {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          text-align: left;
        }
        .dropzone-file-icon {
          color: var(--accent-secondary);
          flex-shrink: 0;
        }
        .dropzone-file-info {
          flex: 1;
          min-width: 0;
        }
        .dropzone-file-name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropzone-file-size {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .upload-field {
          margin-bottom: var(--space-lg);
        }
        .upload-field label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: var(--space-sm);
        }
        .upload-progress {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .progress-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent-primary);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .progress-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
          min-width: 36px;
        }
        .upload-btn {
          width: 100%;
          justify-content: center;
          padding: var(--space-md);
          font-size: 1rem;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
