import React from 'react';
import { FolderOpen, UploadCloud } from 'lucide-react';

export default function FolderPickerPanel({ onSelectFolder }) {
  return (
    <div className="glass-panel text-center">
      <div className="dropzone" onClick={onSelectFolder}>
        <div className="icon-container">
          <FolderOpen size={40} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select Working Folder</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Choose the folder containing both your Excel data and the unannotated images.
          </p>
        </div>
        <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onSelectFolder(); }}>
          <UploadCloud size={20} /> Browse Folder
        </button>
      </div>
    </div>
  );
}
