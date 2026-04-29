import { useState } from 'react';
import { Ellipsis, FileSpreadsheet, Download, AlertCircle, CheckCircle2, TrendingUp, AlertTriangle, Layers, CheckSquare, Loader2 } from 'lucide-react';
import type { ProcessingSummary } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface FileProcessingPanelProps {
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
  const [showFixConfirmation, setShowFixConfirmation] = useState(false);
  const conflictCount = processingSummary.blockLevelBackgroundImageConflicts.length;
  const invalidCoordinateCount = processingSummary.coordinateIssues.invalidRowCount;
  const issueCount = invalidCoordinateCount + conflictCount;

  const requestApplyConflictFixes = () => {
    setShowFixConfirmation(true);
  };

  const cancelApplyConflictFixes = () => {
    setShowFixConfirmation(false);
  };

  const confirmApplyConflictFixes = () => {
    setShowFixConfirmation(false);
    void onApplyConflictImageFixes();
  };

  const handleToggleProcessingIssues = () => {
    onToggleProcessingIssues();
    if (showProcessingIssues) {
      if (showLevelIssueBlocks) {
        onToggleLevelIssueBlocks();
      }
    } else if (!showLevelIssueBlocks) {
      onToggleLevelIssueBlocks();
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8b5cf6'
        }}>
          <FileSpreadsheet size={32} />
        </div>
        <h2 style={{ 
          fontSize: '1.75rem', 
          marginBottom: '0.75rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #c4b5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700
        }}>
          File Processing
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Enhance your Excel file with Processed Block and Processed Level columns for better annotation accuracy
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <button 
          className="btn btn-primary" 
          onClick={() => void onProcessFile()} 
          disabled={isFileProcessing}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            minWidth: '220px'
          }}
        >
          {isFileProcessing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </span>
          ) : (
            isFileProcessed ? 'Reprocess Excel File' : 'Process Excel File'
          )}
        </button>

        {isFileProcessed && (
          <>
            <button 
              className="btn btn-secondary" 
              onClick={onDownloadProcessedFile}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={20} />
              Download Processed File
            </button>

            <button
              type="button"
              className={`issue-status-btn ${processingSummary.hasIssues ? 'has-issues' : 'no-issues'}`}
              onClick={handleToggleProcessingIssues}
              title="Show processing issue details"
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginLeft: 'auto'
              }}
            >
              <span className="issue-status-dot" aria-hidden="true" />
              {processingSummary.hasIssues ? `View Issues (${issueCount})` : 'No Issues'}
            </button>
          </>
        )}
      </div>


      {/* Success Status */}
      {isFileProcessed && conflictCount === 0 && issueCount === 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle2 size={24} color="#4ade80" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: 600 }}>Processing Complete</strong>
            <p style={{ color: '#86efac', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              File processed successfully with no issues detected.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {isFileProcessed && (
        <div className="processing-stats-grid" style={{ marginTop: '2rem' }}>
          {/* Total Rows */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <TrendingUp size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rows Evaluated</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {processingSummary.totalRows}
            </div>
          </div>

          {/* Valid Block Level */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <CheckSquare size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Block & Level Valid</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {processingSummary.validBlockLevel}
            </div>
          </div>

          {/* Missing Block */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(190, 24, 93, 0.05))',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(248, 113, 113, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171'
              }}>
                <AlertCircle size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidentified Block</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #fca5a5, #fb7185)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {processingSummary.missingBlock}
            </div>
          </div>

          {/* Missing Level */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(234, 88, 12, 0.05))',
            border: '1px solid rgba(250, 204, 21, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.22), rgba(250, 204, 21, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#facc15'
                }}>
                  <Layers size={18} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidentified Level</span>
            </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #fde047, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {processingSummary.missingLevel}
            </div>
          </div>

            {/* Coordinate Issues */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(139, 92, 246, 0.05))',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(167, 139, 250, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a78bfa'
                }}>
                  <AlertTriangle size={18} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>X/Y Coordinate Issues</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {invalidCoordinateCount}
              </div>
            </div>

          {/* Background Image Conflicts */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 198, 128, 0.16), rgba(255, 198, 128, 0.05))',
            border: '1px solid rgba(255, 198, 128, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(255, 198, 128, 0.3), rgba(255, 198, 128, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffc680'
              }}>
                <AlertCircle size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Background Image Conflicts</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #ffd7a3, #ffc680)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {conflictCount}
            </div>
          </div>
        </div>
      )}

      {isFileProcessed && showProcessingIssues && showLevelIssueBlocks && (
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Blocks Where Level is Unidentified</h3>
          {processingSummary.blocksWithMissingOrBlankLevel.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No blocks found with Unidentified levels.</p>
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
            <h4 className="issue-section-title">X/Y Coordinate Column Issues</h4>
            <div className="issue-metric-grid">
              <div className="issue-metric-card zero">
                <span className="issue-metric-label">Invalid Count (X or Y is blank/0)</span>
                <span className="issue-metric-value">{invalidCoordinateCount}</span>
              </div>
            </div>
          </section>

          <section className="issue-section">
            <div className="issue-section-title-row">
              <h4 className="issue-section-title">Block-Level with Multiple Background Image Name</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="issue-count-capsule">{conflictCount} conflicts</span>
                {conflictCount > 0 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary issue-fix-btn" 
                    onClick={requestApplyConflictFixes}
                    disabled={isFileProcessing}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {isFileProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      'Fix Selected'
                    )}
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

      <ConfirmationModal
        isOpen={showFixConfirmation}
        title="Apply selected image fixes?"
        message="This will reprocess your selected file using the image choices you made for each block-level conflict."
        confirmLabel="Apply Fixes"
        cancelLabel="Cancel"
        onConfirm={confirmApplyConflictFixes}
        onCancel={cancelApplyConflictFixes}
      />
    </div>
  );
}
