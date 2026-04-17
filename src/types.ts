export type LabelType = 'displayName' | 'sensorId';

export interface RenderOptions {
  color: string;
  drawText: boolean;
  radius: number;
  dpi: number;
  labelType: LabelType;
}

export interface Annotation {
  id: string;
  displayName: string;
  x: number;
  y: number;
}

export interface Stats {
  excelFiles: number;
  annotationsFound: number;
  distinctImages: number;
}

export interface ProcessingSummary {
  totalRows: number;
  missingBlock: number;
  missingLevel: number;
  validBlockLevel: number;
  blocksWithMissingOrBlankLevel: Array<{
    blockName: string;
    missingCount: number;
    blankCount: number;
  }>;
}

export interface AppFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
}

export interface AppDirectoryHandle {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<AppFileSystemHandle>;
}

export type AppFileSystemHandle = AppFileHandle | AppDirectoryHandle;
