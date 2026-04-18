import { memo, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, Settings2 } from 'lucide-react';
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

  return (
    <div
      className={`preview-card ${isMissing ? 'missing' : ''}`}
      onClick={() => {
        if (!isMissing) onOpen(imagePath);
      }}
      style={{ cursor: isMissing ? 'default' : 'pointer' }}
    >
      <div className="preview-image-container">
        <PreviewCanvas fileHandle={handle} annotations={annotations} options={options} />
      </div>
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

interface PreviewGridPanelProps {
  dataMap: Map<string, Annotation[]>;
  imageHandles: Map<string, AppFileHandle>;
  options: RenderOptions;
  onReset: () => void;
  onEditOptions: () => void;
  onExport: () => void | Promise<void>;
  isExporting: boolean;
  onOpenPreview: (imageName: string) => void;
}

export default function PreviewGridPanel({
  dataMap,
  imageHandles,
  options,
  onReset,
  onEditOptions,
  onExport,
  isExporting,
  onOpenPreview
}: PreviewGridPanelProps) {
  const groupedByBlock = useMemo(() => {
    const blockMap = new Map<string, Map<string, Array<[string, Annotation[]]>>>();

    for (const [imagePath, annotations] of dataMap.entries()) {
      const blockName = getBlockName(imagePath);
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

  const blockTabs = useMemo(() => Array.from(groupedByBlock.keys()), [groupedByBlock]);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  useEffect(() => {
    if (blockTabs.length === 0) {
      setActiveBlock(null);
      return;
    }

    if (!activeBlock || !groupedByBlock.has(activeBlock)) {
      setActiveBlock(blockTabs[0]);
    }
  }, [activeBlock, blockTabs, groupedByBlock]);

  const selectedFloors = activeBlock ? groupedByBlock.get(activeBlock) : undefined;
  const selectedFloorEntries = selectedFloors ? Array.from(selectedFloors.entries()) : [];
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
            {isExporting ? 'Packaging...' : 'Export Annotated ZIP'}
          </button>
        </div>
      </div>

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

        {selectedFloors && (
          <div className={`preview-level-columns ${isSingleLevel ? 'single-level' : ''}`} role="list" aria-label="Levels">
            {selectedFloorEntries.map(([floorName, items]) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
