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
  showProcessingIssues: boolean;
  onToggleProcessingIssues: () => void;
  selectedConflictImageByKey: Record<string, string>;
  onSelectConflictImage: (conflictKey: string, imageName: string) => void;
  onApplyConflictImageFixes: () => void | Promise<void>;
}

const buildConflictKey = (blockName: string, levelName: string): string => `${blockName.toLowerCase()}|${levelName.toLowerCase()}`;

export default function FileProcessingPanel({
  deleteFirstRow,
  onToggleDeleteFirstRow,
  isFileProcessing,
  isFileProcessed,
  onProcessFile,
  onDownloadProcessedFile,
  processingSummary,
  showLevelIssueBlocks,
  onToggleLevelIssueBlocks,
  showProcessingIssues,
  onToggleProcessingIssues,
  selectedConflictImageByKey,
  onSelectConflictImage,
  onApplyConflictImageFixes
}: FileProcessingPanelProps) {
  const conflictCount = processingSummary.blockLevelBackgroundImageConflicts.length;
  const issueCount = processingSummary.coordinateIssues.totalCount + conflictCount;

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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => void onProcessFile()} disabled={isFileProcessing}>
          {isFileProcessing ? 'Processing File...' : (isFileProcessed ? 'Reprocess File' : 'Process Excel File')}
        </button>

        {isFileProcessed && (
          <button className="btn btn-secondary" onClick={onDownloadProcessedFile}>
            Download Processed File
          </button>
        )}

        {isFileProcessed && (
          <button
            type="button"
            className={`issue-status-btn ${processingSummary.hasIssues ? 'has-issues' : 'no-issues'}`}
            onClick={onToggleProcessingIssues}
            title="Show processing issue details"
          >
            <span className="issue-status-dot" aria-hidden="true" />
            {processingSummary.hasIssues ? `Issues (${issueCount})` : 'No Issues'}
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
              <span className="stat-label">Rows With Blank Block</span>
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

      {isFileProcessed && showProcessingIssues && (
        <div className="glass-panel processing-issues-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div className="issue-panel-header">
            <h3 style={{ fontSize: '1rem', marginBottom: 0 }}>Processing Issues</h3>
            <span className="issue-panel-total">{issueCount} total</span>
          </div>

          <section className="issue-section">
            <h4 className="issue-section-title">Coordinates Column Issues</h4>
            <div className="issue-metric-grid">
              <div className="issue-metric-card blank">
                <span className="issue-metric-label">Blank Coordinates</span>
                <span className="issue-metric-value">{processingSummary.coordinateIssues.blankCount}</span>
              </div>
              <div className="issue-metric-card partial">
                <span className="issue-metric-label">Only X or Y</span>
                <span className="issue-metric-value">{processingSummary.coordinateIssues.singleValueCount}</span>
              </div>
              <div className="issue-metric-card multi">
                <span className="issue-metric-label">More Than 2 Values</span>
                <span className="issue-metric-value">{processingSummary.coordinateIssues.moreThanTwoValuesCount}</span>
              </div>
              <div className="issue-metric-card zero">
                <span className="issue-metric-label">X or Y Equals 0</span>
                <span className="issue-metric-value">{processingSummary.coordinateIssues.zeroValueCount}</span>
              </div>
            </div>
          </section>

          <section className="issue-section">
            <div className="issue-section-title-row">
              <h4 className="issue-section-title">Block/Level with Multiple Background Image Name Values</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="issue-count-capsule">{conflictCount} conflicts</span>
                {conflictCount > 0 && (
                  <button type="button" className="btn btn-secondary issue-fix-btn" onClick={() => void onApplyConflictImageFixes()}>
                    Fix Selected
                  </button>
                )}
              </div>
            </div>

            {processingSummary.blockLevelBackgroundImageConflicts.length === 0 ? (
              <p className="issue-empty-state">No block-level background image conflicts detected.</p>
            ) : (
              <div className="issue-conflict-grid">
                {processingSummary.blockLevelBackgroundImageConflicts.map((item) => (
                  <article key={`${item.blockName}|${item.levelName}`} className="issue-conflict-card">
                    <div className="issue-card-meta-row">
                      <span className="issue-meta-pill">Block: {item.blockName}</span>
                      <span className="issue-meta-pill">Level: {item.levelName}</span>
                      <span className="issue-meta-pill issue-meta-pill-danger">Rows: {item.affectedRows}</span>
                    </div>
                    <p className="issue-image-label">Image Names</p>
                    <div className="issue-image-pills-wrap">
                      {item.imageStats.map((imageInfo) => {
                        const conflictKey = buildConflictKey(item.blockName, item.levelName);
                        const isSelected = selectedConflictImageByKey[conflictKey] === imageInfo.imageName;

                        return (
                          <button
                            key={imageInfo.imageName}
                            type="button"
                            className={`issue-image-pill selectable ${isSelected ? 'selected' : ''}`}
                            title={`${imageInfo.imageName} (${imageInfo.count})`}
                            onClick={() => onSelectConflictImage(conflictKey, imageInfo.imageName)}
                          >
                            <span className="issue-image-pill-name">{imageInfo.imageName}</span>
                            <span className="issue-image-pill-count">{imageInfo.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
