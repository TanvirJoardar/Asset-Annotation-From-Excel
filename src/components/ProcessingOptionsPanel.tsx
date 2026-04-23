import type { CSSProperties, Dispatch, SetStateAction } from "react";
import {
  Loader2,
  Play,
  Palette,
  Ruler,
  Type,
  Image,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { RenderOptions } from "../types";

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
  onStart,
}: ProcessingOptionsPanelProps) {
  const buttonLabel = isProcessing
    ? "Processing..."
    : annotateFromProcessedFile
      ? hasConflicts
        ? "Resolve Conflicts First"
        : "Start Annotation from Processed File"
      : "Start Annotation";

  const colorPreviewStyle = {
    "--preview-color": options.color,
  } as CSSProperties;

  return (
    <div className="glass-panel animate-fade-in processing-options-panel">
      <div className="processing-options-header">
        <h2>Configure Processing Settings</h2>
        <p>Customize how your annotations will be rendered</p>
      </div>

      <div className="processing-options-grid">
        <section
          className="processing-option-card is-label-card"
          data-accent="blue"
        >
          <div className="option-card-title-row label-card-head">
            <div className="label-card-title-wrap">
              <div className="option-icon-wrap">
                <Type size={16} />
              </div>
              <div>
                <h3>Labels</h3>
                <p>Control annotation text output</p>
              </div>
            </div>
            <label className="toggle-row label-top-toggle">
              <input
                type="checkbox"
                checked={options.drawText}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    drawText: e.target.checked,
                  }))
                }
                className="option-checkbox"
              />
              <span>Show Labels</span>
            </label>
          </div>
          <div className="option-card-content">
            {options.drawText && (
              <div className="label-controls-row">
                <div className="option-select-wrap label-color-compact">
                  <label htmlFor="label-color">Label Color</label>
                  <div className="label-color-group">
                    <div
                      className="label-color-row"
                      style={
                        {
                          "--preview-color": options.labelColor,
                        } as CSSProperties
                      }
                    >
                      <input
                        id="label-color"
                        type="color"
                        value={options.labelColor}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            labelColor: e.target.value,
                          }))
                        }
                        className="option-color-input"
                        aria-label="Label text color"
                      />
                    </div>
                    <div className="label-color-code">
                      {options.labelColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="option-select-wrap label-type-wide">
                  <label htmlFor="label-type">Label Type</label>
                  <select
                    id="label-type"
                    value={options.labelType}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        labelType: e.target.value as RenderOptions["labelType"],
                      }))
                    }
                    className="option-select"
                  >
                    <option value="displayName">Sensor Display Name</option>
                    <option value="sensorId">Sensor Id</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="processing-option-card is-fill-radius-card" data-accent="danger">
          <div className="option-card-title-row label-card-head">
            <div className="label-card-title-wrap">
              <div className="option-icon-wrap">
                <Palette size={16} />
              </div>
              <div>
                <h3>Marker Color & Radius</h3>
                <p>Marker appearance settings</p>
              </div>
            </div>
          </div>
          <div className="option-card-content">
            <div className="label-controls-row">
              <div className="option-select-wrap label-color-compact">
                <label htmlFor="fill-color">Fill Color</label>
                <div className="label-color-group">
                  <div
                    className="label-color-row"
                    style={
                      {
                        "--preview-color": options.color,
                      } as CSSProperties
                    }
                  >
                    <input
                      id="fill-color"
                      type="color"
                      value={options.color}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="option-color-input"
                      aria-label="Marker fill color"
                    />
                  </div>
                  <div className="label-color-code">
                    {options.color.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="option-select-wrap label-type-wide">
                <label htmlFor="marker-radius">Marker Radius</label>
                <div className="radius-slider-group">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={options.radius}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        radius: parseInt(e.target.value, 10),
                      }))
                    }
                    className="option-radius-input"
                    aria-label="Marker radius"
                  />
                  <div className="radius-value-pill">{options.radius}px</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="processing-option-card" data-accent="emerald">
          <div className="option-card-title-row">
            <div className="option-icon-wrap">
              <Image size={16} />
            </div>
            <div>
              <h3>Output Quality</h3>
              <p>Export resolution profile</p>
            </div>
          </div>
          <div className="option-card-content">
            <div className="option-select-wrap">
              <label htmlFor="dpi-select">Output DPI</label>
              <select
                id="dpi-select"
                value={options.dpi}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    dpi: parseInt(e.target.value, 10),
                  }))
                }
                className="option-select"
                aria-label="Output quality"
              >
                <option value={72}>72 DPI - Standard Web</option>
                <option value={150}>150 DPI - High Quality</option>
                <option value={300}>300 DPI - Print/Professional</option>
                <option value={600}>600 DPI - Ultra High</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {annotateFromProcessedFile && hasConflicts && (
        <div className="processing-status-banner warning">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Conflicts Detected</strong>
            <p>
              Please resolve Block-Level background image conflicts in the
              Processing Issues panel before starting annotation.
            </p>
          </div>
        </div>
      )}

      {annotateFromProcessedFile && !hasConflicts && (
        <div className="processing-status-banner success">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Ready to Annotate</strong>
            <p>Processed file is ready. Click below to start annotation.</p>
          </div>
        </div>
      )}

      <div className="processing-action-row">
        <button
          className={`btn btn-primary processing-start-btn${annotateFromProcessedFile && !hasConflicts ? " is-ready" : ""}`}
          onClick={() => void onStart()}
          disabled={isProcessing || (annotateFromProcessedFile && hasConflicts)}
        >
          <span className="processing-start-inner">
            {isProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            <span className="processing-start-label">{buttonLabel}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
