export type LabelType = 'displayName' | 'sensorId';

export interface RenderOptions {
  color: string;
  labelColor: string;
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

export interface DiscoveredImageFile {
  handle: AppFileHandle;
  path: string;
  pathLower: string;
  fileName: string;
  fileNameLower: string;
  segmentsLower: string[];
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
  coordinateIssues: {
    blankCount: number;
    singleValueCount: number;
    moreThanTwoValuesCount: number;
    zeroValueCount: number;
    invalidRowCount: number;
    totalCount: number;
  };
  blockLevelBackgroundImageConflicts: Array<{
    blockName: string;
    levelName: string;
    imageStats: Array<{
      imageName: string;
      count: number;
    }>;
    affectedRows: number;
  }>;
  hasIssues: boolean;
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
