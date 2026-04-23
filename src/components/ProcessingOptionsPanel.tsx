import type { Dispatch, SetStateAction } from 'react';
import { Loader2, Play } from 'lucide-react';
import type { RenderOptions } from '../types';

interface ProcessingOptionsPanelProps {
  options: RenderOptions;
  setOptions: Dispatch<SetStateAction<RenderOptions>>;
  isProcessing: boolean;
  annotateFromProcessedFile: boolean;
  hasConflicts: boolean;
  onStart: () => void | Promise<void>;
}

export default function ProcessingOptionsPanel({
  options,
  setOptions,
  isProcessing,
  annotateFromProcessedFile,
  hasConflicts,
  onStart
}: ProcessingOptionsPanelProps) {
  return (
    <div className="glass-panel text-center animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Configure Your Processing Settings</h2>

      <div className="options-panel animate-fade-in" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
        <div className="option-group">
          <label>Fill Color</label>
          <input
            type="color"
            value={options.color}
            onChange={(e) => setOptions((prev) => ({ ...prev, color: e.target.value }))}
          />
        </div>

        <div className="option-group">
          <label>Radius (px)</label>
          <input
            type="range"
            min="5"
            max="100"
            value={options.radius}
            onChange={(e) => setOptions((prev) => ({ ...prev, radius: parseInt(e.target.value, 10) }))}
          />
          <span>{options.radius}px</span>
        </div>

        <div className="option-group checkbox-group">
          <input
            type="checkbox"
            id="drawText"
            checked={options.drawText}
            onChange={(e) => setOptions((prev) => ({ ...prev, drawText: e.target.checked }))}
          />
          <label htmlFor="drawText">Show Labels</label>
        </div>

        {options.drawText && (
          <div className="option-group">
            <label>Label Type</label>
            <select
              value={options.labelType}
              onChange={(e) => setOptions((prev) => ({ ...prev, labelType: e.target.value as RenderOptions['labelType'] }))}
            >
              <option value="displayName">Sensor Display Name</option>
              <option value="sensorId">Sensor Id</option>
            </select>
          </div>
        )}

        <div className="option-group">
          <label>Output DPI</label>
          <select
            value={options.dpi}
            onChange={(e) => setOptions((prev) => ({ ...prev, dpi: parseInt(e.target.value, 10) }))}
          >
            <option value={72}>72 DPI (Standard Web)</option>
            <option value={150}>150 DPI</option>
            <option value={300}>300 DPI (Print/High Res)</option>
            <option value={600}>600 DPI</option>
          </select>
        </div>

      </div>

      {annotateFromProcessedFile && hasConflicts && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24' }}>
          <strong>⚠️ Conflicts Detected:</strong> Please resolve Block-Level background image conflicts in the Processing Issues panel before starting annotation.
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={() => void onStart()}
        disabled={isProcessing || (annotateFromProcessedFile && hasConflicts)}
        style={{ width: '100%', maxWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
      >
        {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} />}
        {isProcessing ? 'Processing...' : (annotateFromProcessedFile ? (hasConflicts ? 'Resolve Conflicts First' : 'Start Annotation from Processed File') : 'Start Annotation')}
      </button>
    </div>
  );
}
