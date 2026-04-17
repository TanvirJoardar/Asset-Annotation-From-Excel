import React from 'react';
import { Download, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import PreviewCanvas from './PreviewCanvas';

function PreviewCard({ imgName, annotations, handle, onOpen, options }) {
  const isMissing = !handle;

  return (
    <div
      className={`preview-card ${isMissing ? 'missing' : ''}`}
      onClick={() => {
        if (!isMissing) onOpen(imgName);
      }}
      style={{ cursor: isMissing ? 'default' : 'pointer' }}
    >
      <div className="preview-image-container">
        <PreviewCanvas fileHandle={handle} annotations={annotations} options={options} />
      </div>
      <div className="preview-footer">
        <span className="preview-title" title={imgName}>{imgName}</span>
        <span className={`preview-badge ${isMissing ? 'missing' : ''}`}>{annotations.length} pts</span>
      </div>
    </div>
  );
}

const MemoPreviewCard = React.memo(PreviewCard);

export default function PreviewGridPanel({
  dataMap,
  imageHandles,
  options,
  onReset,
  onEditOptions,
  onExport,
  isExporting,
  onOpenPreview
}) {
  return (
    <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="preview-header">
        <h2 style={{ fontSize: '1.5rem' }}>Match Preview</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onReset}>
            <RefreshCw size={20} /> New Location
          </button>
          <button className="btn btn-secondary" onClick={onEditOptions}>
            <Settings2 size={20} /> Edit Options
          </button>
          <button className="btn btn-primary" onClick={onExport} disabled={isExporting || dataMap.size === 0}>
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isExporting ? 'Packaging...' : 'Export Annotated ZIP'}
          </button>
        </div>
      </div>

      <div className="preview-grid mt-4">
        {Array.from(dataMap.entries()).map(([imgName, annotations]) => (
          <MemoPreviewCard
            key={imgName}
            imgName={imgName}
            annotations={annotations}
            handle={imageHandles.get(imgName)}
            onOpen={onOpenPreview}
            options={options}
          />
        ))}
      </div>
    </div>
  );
}
