import { memo, useEffect, useMemo, useState } from 'react';
import { Crosshair, Download, FileImage, FolderX, ImageOff, Loader2, RefreshCw, Settings2, TriangleAlert, type LucideIcon } from 'lucide-react';
import PreviewCanvas from './PreviewCanvas';
import type { Annotation, AppFileHandle, RenderOptions } from '../types';

interface PreviewCardProps {
  imagePath: string;
  annotations: Annotation[];
  handle?: AppFileHandle;
  onOpen: (imagePath: string) => void;
  options: RenderOptions;
}

const getFileName = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
};

const getFolderPath = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return 'root';
  }
  return parts.slice(0, -1).join('/');
};

const getPathSegments = (path: string): string[] => path.split('/').filter(Boolean);

const getBlockName = (path: string): string => {
  const [first] = getPathSegments(path);
  return first ?? 'root';
};

const shouldShowBlock = (blockName: string): boolean => blockName.toLowerCase() !== 'unassigned block';

const getIssueCardVisual = (issueLabel: string): {
  Icon: LucideIcon;
  accentColor: string;
  accentBackground: string;
  cardBackground: string;
} => {
  const normalized = issueLabel.toLowerCase();

  if (normalized === 'missing folder') {
    return {
      Icon: FolderX,
      accentColor: '#fb923c',
      accentBackground: 'rgba(249, 115, 22, 0.22)',
      cardBackground: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(154, 52, 18, 0.18))'
    };
  }

  if (normalized === 'image missing') {
    return {
      Icon: ImageOff,
      accentColor: '#fda4af',
      accentBackground: 'rgba(244, 63, 94, 0.22)',
      cardBackground: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(127, 29, 29, 0.16))'
    };
  }

  if (normalized === 'background image name missing') {
    return {
      Icon: FileImage,
      accentColor: '#67e8f9',
      accentBackground: 'rgba(6, 182, 212, 0.22)',
      cardBackground: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 47, 73, 0.18))'
    };
  }

  if (normalized === 'coordinates missing') {
    return {
      Icon: Crosshair,
      accentColor: '#fcd34d',
      accentBackground: 'rgba(245, 158, 11, 0.22)',
      cardBackground: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(120, 53, 15, 0.18))'
    };
  }

  return {
    Icon: TriangleAlert,
    accentColor: '#d8b4fe',
    accentBackground: 'rgba(168, 85, 247, 0.24)',
    cardBackground: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2))'
  };
};

const getFloorName = (path: string): string => {
  const segments = getPathSegments(path);
  if (segments.length <= 2) {
    return 'root';
  }
  return segments.slice(1, -1).join('/');
};

function PreviewCard({ imagePath, annotations, handle, onOpen, options }: PreviewCardProps) {
  const isMissing = !handle;
  const fileName = getFileName(imagePath);
  const folderPath = getFolderPath(imagePath);
  const missingVisual = getIssueCardVisual('Image Missing');

  return (
    <div
      className={`preview-card ${isMissing ? 'missing' : ''}`}
      onClick={() => {
        if (!isMissing) onOpen(imagePath);
      }}
      style={{ cursor: isMissing ? 'default' : 'pointer' }}
    >
      {isMissing ? (
        <div
          className="preview-image-container"
          style={{ background: missingVisual.cardBackground, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div
              style={{
                width: '3.25rem',
                height: '3.25rem',
                margin: '0 auto 0.65rem',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: missingVisual.accentBackground,
                color: missingVisual.accentColor
              }}
            >
              <missingVisual.Icon size={28} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '500', lineHeight: 1.2, maxWidth: '8.5rem' }}>
              Image Missing in Folder
            </div>
          </div>
        </div>
      ) : (
        <div className="preview-image-container">
          <PreviewCanvas
            fileHandle={handle}
            annotations={annotations}
            options={options}
            deferUntilVisible
          />
        </div>
      )}
      <div className="preview-footer">
        <span className="preview-title" title={imagePath}>{fileName}</span>
        <span className={`preview-badge ${isMissing ? 'missing' : ''}`}>{annotations.length} pts</span>
      </div>
      <div style={{ padding: '0 1rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {folderPath}
      </div>
    </div>
  );
}

const MemoPreviewCard = memo(PreviewCard);

function CoordinateIssueCard({
  imagePath,
  pointsCount,
  issueLabel
}: {
  imagePath: string;
  pointsCount: number;
  issueLabel: string;
}) {
  const fileName = getFileName(imagePath);
  const folderPath = getFolderPath(imagePath);
  const { Icon, accentColor, accentBackground, cardBackground } = getIssueCardVisual(issueLabel);

  return (
    <div
      className="preview-card coordinate-issue"
      style={{ cursor: 'default' }}
    >
      <div
        className="preview-image-container"
        style={{ background: cardBackground, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div
            style={{
              width: '3.25rem',
              height: '3.25rem',
              margin: '0 auto 0.65rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: accentBackground,
              color: accentColor
            }}
          >
            <Icon size={28} strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: '500', lineHeight: 1.2, maxWidth: '8.5rem' }}>
            {issueLabel}
          </div>
        </div>
      </div>
      <div className="preview-footer">
        <span className="preview-title" title={imagePath}>{fileName}</span>
        <span className="preview-badge" style={{ background: accentBackground, color: accentColor }}>{pointsCount} pts</span>
      </div>
      <div style={{ padding: '0 1rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {folderPath}
      </div>
    </div>
  );
}

const MemoCoordinateIssueCard = memo(CoordinateIssueCard);

interface PreviewGridPanelProps {
  dataMap: Map<string, Annotation[]>;
  imageHandles: Map<string, AppFileHandle>;
  coordinateIssueKeys: Set<string>;
  coordinateIssueCounts: Map<string, number>;
  coordinateIssueLabels: Map<string, string>;
  options: RenderOptions;
  onReset: () => void;
  onEditOptions: () => void;
  onExport: () => void | Promise<void>;
  isExporting: boolean;
  exportProgressPercent: number;
  exportProgressLabel: string;
  onOpenPreview: (imageName: string) => void;
}

export default function PreviewGridPanel({
  dataMap,
  imageHandles,
  coordinateIssueKeys,
  coordinateIssueCounts,
  coordinateIssueLabels,
  options,
  onReset,
  onEditOptions,
  onExport,
  isExporting,
  exportProgressPercent,
  exportProgressLabel,
  onOpenPreview
}: PreviewGridPanelProps) {
  const groupedByBlock = useMemo(() => {
    const blockMap = new Map<string, Map<string, Array<[string, Annotation[]]>>>();

    for (const [imagePath, annotations] of dataMap.entries()) {
      const blockName = getBlockName(imagePath);
      if (!shouldShowBlock(blockName)) {
        continue;
      }

      const floorName = getFloorName(imagePath);
      const floors = blockMap.get(blockName) ?? new Map<string, Array<[string, Annotation[]]>>();
      const images = floors.get(floorName) ?? [];

      images.push([imagePath, annotations]);
      floors.set(floorName, images);
      blockMap.set(blockName, floors);
    }

    const sortedBlocks = Array.from(blockMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([blockName, floors]) => {
        const sortedFloors = Array.from(floors.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([floorName, items]) => [
            floorName,
            [...items].sort(([aPath], [bPath]) => aPath.localeCompare(bPath))
          ] as [string, Array<[string, Annotation[]]>]);

        return [blockName, new Map(sortedFloors)] as [string, Map<string, Array<[string, Annotation[]]>>];
      });

    return new Map(sortedBlocks);
  }, [dataMap]);

  const coordinateIssuesByBlock = useMemo(() => {
    const blockMap = new Map<string, Map<string, string[]>>();

    for (const imagePath of coordinateIssueKeys) {
      const blockName = getBlockName(imagePath);
      if (!shouldShowBlock(blockName)) {
        continue;
      }

      const floorName = getFloorName(imagePath);
      const floors = blockMap.get(blockName) ?? new Map<string, string[]>();
      const images = floors.get(floorName) ?? [];

      images.push(imagePath);
      floors.set(floorName, images.sort());
      blockMap.set(blockName, floors);
    }

    const sortedBlocks = Array.from(blockMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([blockName, floors]) => {
        const sortedFloors = Array.from(floors.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([floorName, items]) => [floorName, items] as [string, string[]]);

        return [blockName, new Map(sortedFloors)] as [string, Map<string, string[]>];
      });

    return new Map(sortedBlocks);
  }, [coordinateIssueKeys]);

  const blockTabs = useMemo(() => {
    return Array.from(new Set([
      ...groupedByBlock.keys(),
      ...coordinateIssuesByBlock.keys()
    ])).sort((a, b) => a.localeCompare(b));
  }, [coordinateIssuesByBlock, groupedByBlock]);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  useEffect(() => {
    if (blockTabs.length === 0) {
      setActiveBlock(null);
      return;
    }

    if (!activeBlock || !blockTabs.includes(activeBlock)) {
      setActiveBlock(blockTabs[0]);
    }
  }, [activeBlock, blockTabs]);

  const selectedFloors = activeBlock ? groupedByBlock.get(activeBlock) : undefined;
  const selectedIssueFloors = activeBlock ? coordinateIssuesByBlock.get(activeBlock) : undefined;
  const selectedFloorEntries = useMemo(() => {
    const floorNames = new Set<string>();

    selectedFloors?.forEach((_, floorName) => floorNames.add(floorName));
    selectedIssueFloors?.forEach((_, floorName) => floorNames.add(floorName));

    return Array.from(floorNames)
      .sort((a, b) => a.localeCompare(b))
      .map((floorName) => [floorName, selectedFloors?.get(floorName) ?? []] as [string, Array<[string, Annotation[]]>]);
  }, [selectedFloors, selectedIssueFloors]);
  const isSingleLevel = selectedFloorEntries.length === 1;

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
          <button className="btn btn-primary" onClick={() => void onExport()} disabled={isExporting || dataMap.size === 0}>
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isExporting ? `Packaging... ${exportProgressPercent}%` : 'Export Annotated ZIP'}
          </button>
        </div>
      </div>

      {isExporting && (
        <div style={{ marginTop: '-0.5rem', marginBottom: '0.8rem', display: 'grid', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            {exportProgressLabel || 'Preparing export...'}
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, exportProgressPercent))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22d3ee, #22c55e)',
                transition: 'width 120ms ease-out'
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-4" style={{ display: 'grid', gap: '1.25rem' }}>
        <div className="preview-tabs" role="tablist" aria-label="Blocks">
          {blockTabs.map((blockName) => (
            <button
              key={blockName}
              type="button"
              role="tab"
              aria-selected={activeBlock === blockName}
              className={`preview-tab ${activeBlock === blockName ? 'active' : ''}`}
              onClick={() => setActiveBlock(blockName)}
            >
              {blockName}
            </button>
          ))}
        </div>

        {selectedFloorEntries.length > 0 && (
          <div className={`preview-level-columns ${isSingleLevel ? 'single-level' : ''}`} role="list" aria-label="Levels">
            {selectedFloorEntries.map(([floorName, items]) => {
              const issueItems = selectedIssueFloors?.get(floorName) ?? [];
              const hasAnyItems = items.length > 0 || issueItems.length > 0;

              if (!hasAnyItems) {
                return null;
              }

              return (
                <div key={floorName} className="preview-level-column" role="listitem">
                  <h3 style={{ marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{floorName}</h3>
                  <div className="preview-level-images" role="list" aria-label={`Images for ${floorName}`}>
                    {items.map(([imagePath, annotations]) => (
                      <MemoPreviewCard
                        key={imagePath}
                        imagePath={imagePath}
                        annotations={annotations}
                        handle={imageHandles.get(imagePath)}
                        onOpen={onOpenPreview}
                        options={options}
                      />
                    ))}
                    {issueItems.map((imagePath) => (
                      <MemoCoordinateIssueCard
                        key={imagePath}
                        imagePath={imagePath}
                        pointsCount={coordinateIssueCounts.get(imagePath) ?? 0}
                        issueLabel={coordinateIssueLabels.get(imagePath) ?? 'Coordinates Missing'}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
