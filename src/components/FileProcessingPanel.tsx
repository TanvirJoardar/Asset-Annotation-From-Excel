import { Ellipsis } from 'lucide-react';
import type { ProcessingSummary } from '../types';

interface FileProcessingPanelProps {
  deleteFirstRow: boolean;
  onToggleDeleteFirstRow: (checked: boolean) => void;
  isFileProcessing: boolean;
  isFileProcessed: boolean;
  onProcessFile: () => void | Promise<void>;
  onDownloadProcessedFile: () => void;
  processingSummary: ProcessingSummary;
  showLevelIssueBlocks: boolean;
  onToggleLevelIssueBlocks: () => void;
}

export default function FileProcessingPanel({
  deleteFirstRow,
  onToggleDeleteFirstRow,
  isFileProcessing,
  isFileProcessed,
  onProcessFile,
  onDownloadProcessedFile,
  processingSummary,
  showLevelIssueBlocks,
  onToggleLevelIssueBlocks
}: FileProcessingPanelProps) {
  return (
    <div className="glass-panel animate-fade-in" style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>File Processing (Optional)</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        You can process the file to generate Processed Block and Processed Level columns, or start annotation directly.
      </p>

      <div className="option-group checkbox-group" style={{ marginBottom: '1rem' }}>
        <input
          type="checkbox"
          id="deleteFirstRow"
          checked={deleteFirstRow}
          onChange={(event) => onToggleDeleteFirstRow(event.target.checked)}
        />
        <label htmlFor="deleteFirstRow">Delete first row before processing</label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => void onProcessFile()} disabled={isFileProcessing}>
          {isFileProcessing ? 'Processing File...' : (isFileProcessed ? 'Reprocess File' : 'Process Excel File')}
        </button>

        {isFileProcessed && (
          <button className="btn btn-secondary" onClick={onDownloadProcessedFile}>
            Download Processed File
          </button>
        )}
      </div>

      {isFileProcessed && (
        <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-label">Rows Evaluated</span>
            <span className="stat-value">{processingSummary.totalRows}</span>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span className="stat-label">Rows With Missing/Blank Block</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onToggleLevelIssueBlocks}
                style={{ padding: '0.25rem 0.5rem', minWidth: 'unset' }}
                title="Show block names where level is Missing/Blank"
              >
                <Ellipsis size={16} />
              </button>
            </div>
            <span className="stat-value">{processingSummary.missingBlock}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Rows With Missing/Blank Level</span>
            <span className="stat-value">{processingSummary.missingLevel}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Rows With Both Values</span>
            <span className="stat-value">{processingSummary.validBlockLevel}</span>
          </div>
        </div>
      )}

      {isFileProcessed && showLevelIssueBlocks && (
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Blocks With Missing/Blank Levels</h3>
          {processingSummary.blocksWithMissingOrBlankLevel.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No blocks found with Missing/Blank levels.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {processingSummary.blocksWithMissingOrBlankLevel.map((item) => (
                <div
                  key={item.blockName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem'
                  }}
                >
                  <span className="preview-badge" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}>
                    {item.blockName}
                  </span>
                  {item.missingCount > 0 && (
                    <span className="preview-badge missing">Missing ({item.missingCount})</span>
                  )}
                  {item.blankCount > 0 && (
                    <span className="preview-badge" style={{ background: 'rgba(245, 158, 11, 0.22)', color: '#fcd34d' }}>
                      Blank ({item.blankCount})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
