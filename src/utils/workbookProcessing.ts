import * as XLSX from 'xlsx-js-style';
import type { Annotation, ProcessingSummary } from '../types';

const normalize = (value: unknown): string => (value ?? '').toString().trim();

const extractLevelToken = (value: unknown): string | null => {
  const match = normalize(value).match(/^[LB]\d{1,3}/i);
  return match ? match[0].toUpperCase() : null;
};

const isMissingOrBlank = (value: unknown): boolean => {
  const normalized = normalize(value).toLowerCase();
  return normalized === 'missing' || normalized === 'blank';
};

const isNumericValue = (value: string): boolean => /^-?\d+(?:\.\d+)?$/.test(value);

const normalizeHeaderKey = (value: unknown): string => normalize(value).toLowerCase().replace(/\s+/g, ' ');

const isXCoordsHeader = (value: unknown): boolean => normalizeHeaderKey(value) === 'x coords';

const isYCoordsHeader = (value: unknown): boolean => normalizeHeaderKey(value) === 'y coords';

const toNumeric = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = normalize(value);
  if (!isNumericValue(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBlockAndLevel = (locationDescriptor: unknown): { block: string; level: string } => {
  const descriptorText = normalize(locationDescriptor);
  if (!descriptorText) {
    return { block: 'Blank', level: 'Blank' };
  }

  const parts = descriptorText.split('_').map((item) => item.trim());
  const rawBlock = parts[1] || '';
  const block = rawBlock || 'Missing';

  const last = parts[parts.length - 1] || '';
  const secondLast = parts[parts.length - 2] || '';
  let level = 'Missing';

  const levelFromLast = extractLevelToken(last);
  const levelFromSecondLast = extractLevelToken(secondLast);

  if (levelFromLast) {
    level = levelFromLast;
  } else if (levelFromSecondLast) {
    level = levelFromSecondLast;
  }

  return { block, level };
};

const parseCoordinates = (xCoords: unknown, yCoords: unknown): { x: number; y: number } | null => {
  const x = toNumeric(xCoords);
  const y = toNumeric(yCoords);

  if (x === null || y === null) {
    return null;
  }

  return { x, y };
};

const findHeaderRow = (jsonRaw: unknown[][]): number => {
  for (let i = 0; i < Math.min(30, jsonRaw.length); i++) {
    const row = jsonRaw[i];
    if (!Array.isArray(row)) {
      continue;
    }

    const hasXCoords = row.some((cell) => isXCoordsHeader(cell));
    const hasYCoords = row.some((cell) => isYCoordsHeader(cell));
    const hasBackground = row.some((cell) => normalizeHeaderKey(cell) === 'background image name');

    if (hasXCoords && hasYCoords && hasBackground) {
      return i;
    }
  }

  return -1;
};

const resolveHeaderRowIndex = (rows: unknown[][]): number => {
  return rows.length > 1 ? 1 : -1;
};

const cloneStyle = (style: unknown): unknown => {
  if (!style) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(style));
};

const getCellStyle = (sheet: XLSX.WorkSheet, rowIndex: number, colIndex: number): unknown => {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = sheet[address] as (XLSX.CellObject & { s?: unknown }) | undefined;
  return cloneStyle(cell?.s);
};

const pickAdjacentStyle = (rowStyles: unknown[], index: number): unknown => {
  return cloneStyle(rowStyles[index - 1] ?? rowStyles[index + 1]);
};

const applyIssueHighlight = (style: unknown): unknown => {
  const base = (style && typeof style === 'object') ? (style as Record<string, unknown>) : {};
  return {
    ...base,
    fill: {
      patternType: 'solid',
      fgColor: { rgb: 'FFFECACA' }
    }
  };
};

export interface ProcessedWorkbookResult {
  outputBlob: Blob;
  outputName: string;
  summary: ProcessingSummary;
}

interface ProcessWorkbookOptions {
  backgroundImageFixByBlockLevel?: Record<string, string>;
}

const collectBlockLevelBackgroundImageConflicts = (
  rows: unknown[][],
  colLocationDescriptor: number,
  colBackgroundImage: number,
  selectedFixes?: Record<string, string>
): ProcessingSummary['blockLevelBackgroundImageConflicts'] => {
  const blockLevelImageMap = new Map<string, {
    blockName: string;
    levelName: string;
    imageNameMap: Map<string, { imageName: string; count: number }>;
    blankCount: number;
    rowIndexes: number[];
  }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const sourceHasContent = row.some((cell) => normalize(cell) !== '');
    if (!sourceHasContent) {
      continue;
    }

    const descriptor = colLocationDescriptor === -1 ? '' : row[colLocationDescriptor];
    const { block, level } = parseBlockAndLevel(descriptor);
    const conflictKey = `${block.toLowerCase()}|${level.toLowerCase()}`;
    const hasSelectedImageFix = Object.prototype.hasOwnProperty.call(selectedFixes ?? {}, conflictKey);
    const selectedImageFix = selectedFixes?.[conflictKey] ?? '';
    const imageName = normalize(hasSelectedImageFix ? selectedImageFix : row[colBackgroundImage]);
    const existing = blockLevelImageMap.get(conflictKey) ?? {
      blockName: block,
      levelName: level,
      imageNameMap: new Map<string, { imageName: string; count: number }>(),
      blankCount: 0,
      rowIndexes: [] as number[]
    };

    existing.rowIndexes.push(i);

    if (imageName) {
      const imageKey = imageName.toLowerCase();
      const imageEntry = existing.imageNameMap.get(imageKey);
      if (!imageEntry) {
        existing.imageNameMap.set(imageKey, { imageName, count: 1 });
      } else {
        imageEntry.count += 1;
        existing.imageNameMap.set(imageKey, imageEntry);
      }
    } else {
      existing.blankCount += 1;
    }

    blockLevelImageMap.set(conflictKey, existing);
  }

  return Array.from(blockLevelImageMap.values())
    .filter((entry) => normalize(entry.blockName).toLowerCase() !== 'blank')
    .filter((entry) => entry.imageNameMap.size > 1 || (entry.blankCount > 0 && entry.imageNameMap.size > 0))
    .map((entry) => ({
      blockName: entry.blockName,
      levelName: entry.levelName,
      imageStats: [
        ...Array.from(entry.imageNameMap.values()),
        ...(entry.blankCount > 0 ? [{ imageName: '', count: entry.blankCount }] : [])
      ].sort((a, b) => {
        if (!a.imageName && b.imageName) {
          return 1;
        }
        if (a.imageName && !b.imageName) {
          return -1;
        }
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.imageName.localeCompare(b.imageName);
      }),
      affectedRows: entry.rowIndexes.length
    }))
    .sort((a, b) => `${a.blockName}|${a.levelName}`.localeCompare(`${b.blockName}|${b.levelName}`));
};

export const buildProcessedWorkbook = async (
  inputFile: File,
  options: ProcessWorkbookOptions = {}
): Promise<ProcessedWorkbookResult> => {
  const inputBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(inputBuffer, { type: 'array', cellStyles: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  const jsonRaw = rawRows;

  if (jsonRaw.length === 0) {
    throw new Error('No data rows available after applying row deletion option.');
  }

  const headerRowIndex = resolveHeaderRowIndex(jsonRaw);
  if (headerRowIndex === -1) {
    throw new Error("Could not use second row as header. Ensure row 2 contains 'X Coords', 'Y Coords', and 'Background Image Name'.");
  }

  const updatedRows = jsonRaw.map((row) => (Array.isArray(row) ? [...row] : []));
  const updatedStyles = jsonRaw.map((row, rowIndex) => (
    Array.isArray(row)
      ? row.map((_, colIndex) => getCellStyle(worksheet, rowIndex, colIndex))
      : []
  ));
  const headerRow = updatedRows[headerRowIndex] || [];

  const columnsToRemove = headerRow
    .map((h, idx) => ({
      idx,
      key: normalize(h).toLowerCase()
    }))
    .filter((item) => item.key === 'block' || item.key === 'level' || item.key === 'processed block' || item.key === 'processed level' || item.key === 'issues')
    .map((item) => item.idx)
    .sort((a, b) => b - a);

  for (const colIndex of columnsToRemove) {
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      const row = updatedRows[rowIndex];
      const styleRow = updatedStyles[rowIndex];
      if (Array.isArray(row) && row.length > colIndex) {
        row.splice(colIndex, 1);
        styleRow.splice(colIndex, 1);
      }
    }
  }

  const normalizedHeader = updatedRows[headerRowIndex] || [];
  const colLocationDescriptor = normalizedHeader.findIndex((h) => normalize(h).toLowerCase() === 'location descriptor');
  const insertAt = colLocationDescriptor === -1 ? normalizedHeader.length : colLocationDescriptor + 1;

  for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
    const row = updatedRows[rowIndex];
    const styleRow = updatedStyles[rowIndex];
    if (Array.isArray(row)) {
      row.splice(insertAt, 0, '', '');
      styleRow.splice(insertAt, 0, undefined, undefined);
    }
  }

  const headerAfterProcessedColumns = updatedRows[headerRowIndex] || [];
  const headerStylesAfterProcessedColumns = updatedStyles[headerRowIndex] || [];
  headerAfterProcessedColumns[insertAt] = 'Processed Block';
  headerAfterProcessedColumns[insertAt + 1] = 'Processed Level';
  headerStylesAfterProcessedColumns[insertAt] = pickAdjacentStyle(headerStylesAfterProcessedColumns, insertAt);
  headerStylesAfterProcessedColumns[insertAt + 1] = pickAdjacentStyle(headerStylesAfterProcessedColumns, insertAt + 1);

  const colYCoordsBeforeIssues = headerAfterProcessedColumns.findIndex((h) => isYCoordsHeader(h));
  let issuesInsertAt = -1;
  if (colYCoordsBeforeIssues !== -1) {
    issuesInsertAt = colYCoordsBeforeIssues + 1;
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      const row = updatedRows[rowIndex];
      const styleRow = updatedStyles[rowIndex];
      if (Array.isArray(row)) {
        row.splice(issuesInsertAt, 0, '');
        styleRow.splice(issuesInsertAt, 0, undefined);
      }
    }

    const headerAfterIssuesColumn = updatedRows[headerRowIndex] || [];
    const headerStylesAfterIssuesColumn = updatedStyles[headerRowIndex] || [];
    headerAfterIssuesColumn[issuesInsertAt] = 'Issues';
    headerStylesAfterIssuesColumn[issuesInsertAt] = pickAdjacentStyle(headerStylesAfterIssuesColumn, issuesInsertAt);
  }

  const finalHeader = updatedRows[headerRowIndex] || [];
  const colBlock = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'processed block');
  const colLevel = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'processed level');
  const colXCoords = finalHeader.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = finalHeader.findIndex((h) => isYCoordsHeader(h));
  const colIssues = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'issues');
  const colBackgroundImage = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'background image name');

  let totalRows = 0;
  let missingBlock = 0;
  let missingLevel = 0;
  let validBlockLevel = 0;
  let coordinateBlankCount = 0;
  let coordinateSingleValueCount = 0;
  let coordinateMoreThanTwoValuesCount = 0;
  let coordinateZeroValueCount = 0;
  const coordinateInvalidBlankOrZeroRows = new Set<number>();
  const coordinateIssueRows: number[] = [];
  const blocksWithMissingOrBlankLevelMap = new Map<string, { missingCount: number; blankCount: number }>();
  for (let i = headerRowIndex + 1; i < updatedRows.length; i++) {
    const row = updatedRows[i];
    const sourceRow = jsonRaw[i];

    if (!Array.isArray(row) || row.length === 0 || !Array.isArray(sourceRow)) {
      continue;
    }

    // Count/process only rows that had actual source values before we inserted processed columns.
    const sourceHasContent = sourceRow.some((cell) => normalize(cell) !== '');
    if (!sourceHasContent) {
      continue;
    }

    const descriptor = colLocationDescriptor === -1 ? '' : row[colLocationDescriptor];
    const { block, level } = parseBlockAndLevel(descriptor);

    row[colBlock] = block;
    row[colLevel] = level;

    totalRows++;

    if (isMissingOrBlank(block)) {
      missingBlock++;
    }

    if (isMissingOrBlank(level)) {
      missingLevel++;

      const key = block || 'Missing';
      const current = blocksWithMissingOrBlankLevelMap.get(key) ?? { missingCount: 0, blankCount: 0 };

      if (normalize(level).toLowerCase() === 'missing') {
        current.missingCount += 1;
      }
      if (normalize(level).toLowerCase() === 'blank') {
        current.blankCount += 1;
      }

      blocksWithMissingOrBlankLevelMap.set(key, current);
    }

    if (!isMissingOrBlank(block) && !isMissingOrBlank(level)) {
      validBlockLevel++;
    }

    if (colXCoords !== -1 && colYCoords !== -1) {
      const xText = normalize(row[colXCoords]);
      const yText = normalize(row[colYCoords]);
      const xBlank = !xText;
      const yBlank = !yText;
      const xTokenCount = xText ? xText.replace(/,/g, ' ').split(/\s+/).filter(Boolean).length : 0;
      const yTokenCount = yText ? yText.replace(/,/g, ' ').split(/\s+/).filter(Boolean).length : 0;
      const xNumericValue = toNumeric(row[colXCoords]);
      const yNumericValue = toNumeric(row[colYCoords]);
      const coordinateIssues: string[] = [];

      if (xBlank && yBlank) {
        coordinateBlankCount++;
        coordinateInvalidBlankOrZeroRows.add(i);
        coordinateIssues.push('both coordinates blank');
      } else {
        if (xBlank !== yBlank) {
          coordinateSingleValueCount++;
          coordinateInvalidBlankOrZeroRows.add(i);
          coordinateIssues.push('one coordinate blank');
        }

        if (xTokenCount > 1) {
          coordinateMoreThanTwoValuesCount++;
          coordinateIssues.push('X multiple values');
        }

        if (yTokenCount > 1) {
          coordinateMoreThanTwoValuesCount++;
          coordinateIssues.push('Y multiple values');
        }

        const xIsZero = xNumericValue === 0;
        const yIsZero = yNumericValue === 0;
        if (xIsZero && yIsZero) {
          coordinateZeroValueCount++;
          coordinateInvalidBlankOrZeroRows.add(i);
          coordinateIssues.push('both coordinates 0');
        } else if (xIsZero || yIsZero) {
          coordinateZeroValueCount++;
          coordinateInvalidBlankOrZeroRows.add(i);
          coordinateIssues.push('one coordinates 0');
        }
      }

      if (coordinateIssues.length > 0) {
        coordinateIssueRows.push(i);
      }

      if (colIssues !== -1) {
        row[colIssues] = coordinateIssues.join('; ');
      }
    }

    if (colBackgroundImage !== -1) {
      const conflictKey = `${block.toLowerCase()}|${level.toLowerCase()}`;
      const hasSelectedImageFix = Object.prototype.hasOwnProperty.call(
        options.backgroundImageFixByBlockLevel ?? {},
        conflictKey
      );
      const selectedImageFix = options.backgroundImageFixByBlockLevel?.[conflictKey] ?? '';
      if (hasSelectedImageFix) {
        row[colBackgroundImage] = selectedImageFix;
      }
    }
  }

  const outputSheet = XLSX.utils.aoa_to_sheet(updatedRows);

  if (colXCoords !== -1 && colYCoords !== -1 && coordinateIssueRows.length > 0) {
    for (const rowIndex of coordinateIssueRows) {
      const styleRow = updatedStyles[rowIndex] || [];
      for (const colIndex of [colXCoords, colYCoords]) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const existing = outputSheet[address] as (XLSX.CellObject & { s?: unknown }) | undefined;
        if (!existing) {
          const baseStyle = styleRow[colIndex];
          outputSheet[address] = {
            t: 's',
            v: '',
            s: applyIssueHighlight(baseStyle)
          } as XLSX.CellObject & { s?: unknown };
          continue;
        }
        const baseStyle = styleRow[colIndex] ?? existing.s;
        existing.s = applyIssueHighlight(baseStyle);
      }
    }
  }

  // Preserve first-row grouped header formatting and second-row header colors.
  for (const rowIndex of [0, headerRowIndex]) {
    const row = updatedRows[rowIndex] || [];
    const styleRow = updatedStyles[rowIndex] || [];

    for (let colIndex = 0; colIndex < styleRow.length; colIndex++) {
      const style = styleRow[colIndex];
      if (!style) {
        continue;
      }

      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const existing = outputSheet[address] as (XLSX.CellObject & { s?: unknown }) | undefined;
      if (existing) {
        existing.s = cloneStyle(style);
      } else {
        outputSheet[address] = {
          t: 's',
          v: normalize(row[colIndex]),
          s: cloneStyle(style)
        } as XLSX.CellObject & { s?: unknown };
      }
    }
  }

  const removedColumnsAsc = [...columnsToRemove].sort((a, b) => a - b);
  const transformColumnIndex = (colIndex: number): number | null => {
    let next = colIndex;

    for (const removedCol of removedColumnsAsc) {
      if (next === removedCol) {
        return null;
      }
      if (next > removedCol) {
        next -= 1;
      }
    }

    if (next >= insertAt) {
      next += 2;
    }
    if (issuesInsertAt !== -1 && next >= issuesInsertAt) {
      next += 1;
    }

    return next;
  };

  const originalMerges = (worksheet['!merges'] ?? []) as XLSX.Range[];
  const transformedMerges: XLSX.Range[] = [];
  for (const merge of originalMerges) {
    const survivingCols: number[] = [];
    for (let col = merge.s.c; col <= merge.e.c; col++) {
      const mapped = transformColumnIndex(col);
      if (mapped !== null) {
        survivingCols.push(mapped);
      }
    }

    if (survivingCols.length === 0) {
      continue;
    }

    transformedMerges.push({
      s: { r: merge.s.r, c: Math.min(...survivingCols) },
      e: { r: merge.e.r, c: Math.max(...survivingCols) }
    });
  }
  if (transformedMerges.length > 0) {
    outputSheet['!merges'] = transformedMerges;
  }

  const blockLevelBackgroundImageConflicts = collectBlockLevelBackgroundImageConflicts(
    updatedRows.slice(headerRowIndex + 1),
    colLocationDescriptor,
    colBackgroundImage,
    options.backgroundImageFixByBlockLevel
  );

  const outputWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, firstSheetName || 'Sheet1');

  const outputArray = XLSX.write(outputWorkbook, { type: 'array', bookType: 'xlsx' });
  const outputBlob = new Blob([outputArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const sourceName = normalize(inputFile.name).replace(/\.[^.]+$/, '');

  return {
    outputBlob,
    outputName: `${sourceName || 'site_data'}_processed.xlsx`,
    summary: {
      totalRows,
      missingBlock,
      missingLevel,
      validBlockLevel,
      coordinateIssues: {
        blankCount: coordinateBlankCount,
        singleValueCount: coordinateSingleValueCount,
        moreThanTwoValuesCount: coordinateMoreThanTwoValuesCount,
        zeroValueCount: coordinateZeroValueCount,
        invalidRowCount: coordinateInvalidBlankOrZeroRows.size,
        totalCount:
          coordinateBlankCount
          + coordinateSingleValueCount
          + coordinateMoreThanTwoValuesCount
          + coordinateZeroValueCount
      },
      blockLevelBackgroundImageConflicts,
      hasIssues:
        coordinateBlankCount + coordinateSingleValueCount + coordinateMoreThanTwoValuesCount + coordinateZeroValueCount > 0
        || blockLevelBackgroundImageConflicts.length > 0,
      blocksWithMissingOrBlankLevel: Array.from(blocksWithMissingOrBlankLevelMap.entries())
        .map(([blockName, counts]) => ({
          blockName,
          missingCount: counts.missingCount,
          blankCount: counts.blankCount
        }))
        .sort((a, b) => a.blockName.localeCompare(b.blockName))
    }
  };
};

export const checkAnnotationBackgroundImageConflicts = async (
  inputFile: File
): Promise<ProcessingSummary['blockLevelBackgroundImageConflicts']> => {
  const arrayBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (rawRows.length === 0) {
    return [];
  }

  const headerRowIndex = resolveHeaderRowIndex(rawRows);
  if (headerRowIndex === -1) {
    return [];
  }

  const headers = rawRows[headerRowIndex] || [];
  const colLocationDescriptor = headers.findIndex((h) => normalizeHeaderKey(h) === 'location descriptor');
  const colBackgroundImage = headers.findIndex((h) => normalizeHeaderKey(h) === 'background image name');

  if (colBackgroundImage === -1) {
    return [];
  }

  return collectBlockLevelBackgroundImageConflicts(
    rawRows.slice(headerRowIndex + 1),
    colLocationDescriptor,
    colBackgroundImage
  );
};

export interface AnnotationExtractionResult {
  groupedAnnotations: Map<string, {
    block: string;
    level: string;
    imageName: string;
    annotations: Annotation[];
  }>;
  coordinateIssueGroups: Array<{
    block: string;
    level: string;
    imageName: string;
    invalidCount: number;
  }>;
  backgroundImageIssueGroups: Array<{
    block: string;
    level: string;
    imageName: string;
    missingCount: number;
  }>;
  annotationsFound: number;
  invalidCoordsCount: number;
  invalidExamples: string[];
  invalidCoordinates: Array<{
    rowNumber: number;
    coordinate: string;
  }>;
  hasAnyLabelColumn: boolean;
}

export interface RequiredAnnotationColumns {
  hasXCoords: boolean;
  hasYCoords: boolean;
  hasBackgroundImage: boolean;
  hasBlockOrProcessedBlock: boolean;
  hasLevelOrProcessedLevel: boolean;
  missingColumns: string[];
}

export interface RequiredProcessingColumns {
  hasLocationDescriptor: boolean;
  hasSensorId: boolean;
  hasSensorDisplayName: boolean;
  hasBackgroundImage: boolean;
  hasXCoords: boolean;
  hasYCoords: boolean;
  missingColumns: string[];
}

export const checkRequiredProcessingColumns = async (
  inputFile: File
): Promise<RequiredProcessingColumns> => {
  const arrayBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (rawRows.length === 0) {
    return {
      hasLocationDescriptor: false,
      hasSensorId: false,
      hasSensorDisplayName: false,
      hasBackgroundImage: false,
      hasXCoords: false,
      hasYCoords: false,
      missingColumns: ['File is empty']
    };
  }

  const headerRowIndex = resolveHeaderRowIndex(rawRows);
  if (headerRowIndex === -1) {
    return {
      hasLocationDescriptor: false,
      hasSensorId: false,
      hasSensorDisplayName: false,
      hasBackgroundImage: false,
      hasXCoords: false,
      hasYCoords: false,
      missingColumns: ['Could not find header row']
    };
  }

  const headers = rawRows[headerRowIndex] || [];

  const colLocationDescriptor = headers.findIndex((h) => normalizeHeaderKey(h) === 'location descriptor');
  const colSensorId = headers.findIndex((h) => normalizeHeaderKey(h) === 'sensor id');
  const colSensorDisplayName = headers.findIndex((h) => normalizeHeaderKey(h) === 'sensor display name');
  const colXCoords = headers.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = headers.findIndex((h) => isYCoordsHeader(h));
  const colImage = headers.findIndex((h) => normalizeHeaderKey(h) === 'background image name');

  const hasLocationDescriptor = colLocationDescriptor !== -1;
  const hasSensorId = colSensorId !== -1;
  const hasSensorDisplayName = colSensorDisplayName !== -1;
  const hasBackgroundImage = colImage !== -1;
  const hasXCoords = colXCoords !== -1;
  const hasYCoords = colYCoords !== -1;

  const missingColumns: string[] = [];
  if (!hasLocationDescriptor) missingColumns.push('Location Descriptor');
  if (!hasSensorId) missingColumns.push('Sensor Id');
  if (!hasSensorDisplayName) missingColumns.push('Sensor Display Name');
  if (!hasBackgroundImage) missingColumns.push('Background Image Name');
  if (!hasXCoords) missingColumns.push('X Coords');
  if (!hasYCoords) missingColumns.push('Y Coords');

  return {
    hasLocationDescriptor,
    hasSensorId,
    hasSensorDisplayName,
    hasBackgroundImage,
    hasXCoords,
    hasYCoords,
    missingColumns
  };
};

export const checkRequiredAnnotationColumns = async (
  inputFile: File
): Promise<RequiredAnnotationColumns> => {
  const arrayBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (rawRows.length === 0) {
    return {
      hasXCoords: false,
      hasYCoords: false,
      hasBackgroundImage: false,
      hasBlockOrProcessedBlock: false,
      hasLevelOrProcessedLevel: false,
      missingColumns: ['File is empty']
    };
  }

  const headerRowIndex = resolveHeaderRowIndex(rawRows);
  if (headerRowIndex === -1) {
    return {
      hasXCoords: false,
      hasYCoords: false,
      hasBackgroundImage: false,
      hasBlockOrProcessedBlock: false,
      hasLevelOrProcessedLevel: false,
      missingColumns: ['Could not find header row']
    };
  }

  const headers = rawRows[headerRowIndex] || [];
  
  const colXCoords = headers.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = headers.findIndex((h) => isYCoordsHeader(h));
  const colImage = headers.findIndex((h) => normalize(h) === 'Background Image Name');
  const colProcessedBlock = headers.findIndex((h) => normalize(h).toLowerCase() === 'processed block');
  const colProcessedLevel = headers.findIndex((h) => normalize(h).toLowerCase() === 'processed level');

  const hasXCoords = colXCoords !== -1;
  const hasYCoords = colYCoords !== -1;
  const hasBackgroundImage = colImage !== -1;
  const hasBlockOrProcessedBlock = colProcessedBlock !== -1;
  const hasLevelOrProcessedLevel = colProcessedLevel !== -1;

  const missingColumns: string[] = [];
  if (!hasXCoords) missingColumns.push('X Coords');
  if (!hasYCoords) missingColumns.push('Y Coords');
  if (!hasBackgroundImage) missingColumns.push('Background Image Name');
  if (!hasBlockOrProcessedBlock) missingColumns.push('Processed Block');
  if (!hasLevelOrProcessedLevel) missingColumns.push('Processed Level');

  return {
    hasXCoords,
    hasYCoords,
    hasBackgroundImage,
    hasBlockOrProcessedBlock,
    hasLevelOrProcessedLevel,
    missingColumns
  };
};

export const extractAnnotationsFromWorkbook = async (
  inputFile: File
): Promise<AnnotationExtractionResult> => {
  const arrayBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  const jsonRaw = rawRows;

  if (jsonRaw.length === 0) {
    throw new Error('No data rows available after applying row deletion option for annotation.');
  }

  const headerRowIndex = resolveHeaderRowIndex(jsonRaw);
  if (headerRowIndex === -1) {
    throw new Error("Could not use second row as header for annotation. Ensure row 2 contains 'X Coords', 'Y Coords', and 'Background Image Name'.");
  }

  const headers = jsonRaw[headerRowIndex] || [];
  const colSensorId = headers.findIndex((h) => normalize(h) === 'Sensor Id');
  const colDisplayName = headers.findIndex((h) => /display\s*name/i.test(normalize(h)));
  const colXCoords = headers.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = headers.findIndex((h) => isYCoordsHeader(h));
  const colImage = headers.findIndex((h) => normalize(h) === 'Background Image Name');
  const colProcessedBlock = headers.findIndex((h) => normalize(h).toLowerCase() === 'processed block');
  const colProcessedLevel = headers.findIndex((h) => normalize(h).toLowerCase() === 'processed level');
  const colBlock = headers.findIndex((h) => normalize(h).toLowerCase() === 'block');
  const colLevel = headers.findIndex((h) => normalize(h).toLowerCase() === 'level');
  const colLocationDescriptor = headers.findIndex((h) => normalize(h).toLowerCase() === 'location descriptor');

  const missingCols: string[] = [];
  if (colXCoords === -1) {
    missingCols.push('X Coords');
  }
  if (colYCoords === -1) {
    missingCols.push('Y Coords');
  }
  if (colImage === -1) {
    missingCols.push('Background Image Name');
  }

  if (missingCols.length > 0) {
    throw new Error('Missing crucial columns: ' + missingCols.join(', '));
  }

  const groupedAnnotations = new Map<string, {
    block: string;
    level: string;
    imageName: string;
    annotations: Annotation[];
  }>();
  const groupStats = new Map<string, {
    block: string;
    level: string;
    imageName: string;
    validCount: number;
    invalidCount: number;
  }>();
  const backgroundImageIssueStats = new Map<string, {
    block: string;
    level: string;
    imageName: string;
    missingCount: number;
  }>();
  let annotationsFound = 0;
  let invalidCoordsCount = 0;
  const invalidExamples: string[] = [];
  const invalidCoordinates: Array<{ rowNumber: number; coordinate: string }> = [];

  for (let i = headerRowIndex + 1; i < jsonRaw.length; i++) {
    const row = jsonRaw[i];
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const sensorId = normalize(row[colSensorId]);
    const sensorDisplayName = colDisplayName !== -1 ? normalize(row[colDisplayName]) : '';
    const xCoords = row[colXCoords];
    const yCoords = row[colYCoords];
    const imageName = row[colImage];

    const descriptor = colLocationDescriptor !== -1 ? row[colLocationDescriptor] : '';
    const parsedFromDescriptor = parseBlockAndLevel(descriptor);

    const resolvedBlock = normalize(
      colProcessedBlock !== -1
        ? row[colProcessedBlock]
        : (colBlock !== -1 ? row[colBlock] : parsedFromDescriptor.block)
    ) || parsedFromDescriptor.block;

    const resolvedLevel = normalize(
      colProcessedLevel !== -1
        ? row[colProcessedLevel]
        : (colLevel !== -1 ? row[colLevel] : parsedFromDescriptor.level)
    ) || parsedFromDescriptor.level;

    const cleanedImageName = normalize(imageName);

    if (!cleanedImageName) {
      const missingImageKey = `${resolvedBlock.toLowerCase()}|${resolvedLevel.toLowerCase()}|missing-background-image`;

      if (!backgroundImageIssueStats.has(missingImageKey)) {
        backgroundImageIssueStats.set(missingImageKey, {
          block: resolvedBlock,
          level: resolvedLevel,
          imageName: 'Background Image Name Missing',
          missingCount: 0
        });
      }

      backgroundImageIssueStats.get(missingImageKey)!.missingCount += 1;
      continue;
    }

    const parsed = parseCoordinates(xCoords, yCoords);
    const groupKey = `${resolvedBlock.toLowerCase()}|${resolvedLevel.toLowerCase()}|${cleanedImageName.toLowerCase()}`;

    if (!groupStats.has(groupKey)) {
      groupStats.set(groupKey, {
        block: resolvedBlock,
        level: resolvedLevel,
        imageName: cleanedImageName,
        validCount: 0,
        invalidCount: 0
      });
    }

    if (!parsed) {
      invalidCoordsCount++;
      groupStats.get(groupKey)!.invalidCount += 1;
      invalidCoordinates.push({
        rowNumber: i + 1,
        coordinate: `X: ${normalize(xCoords)}, Y: ${normalize(yCoords)}`
      });
      if (invalidExamples.length < 5) {
        invalidExamples.push(`X: ${normalize(xCoords)}, Y: ${normalize(yCoords)}`);
      }
      continue;
    }

    groupStats.get(groupKey)!.validCount += 1;

    if (!groupedAnnotations.has(groupKey)) {
      groupedAnnotations.set(groupKey, {
        block: resolvedBlock,
        level: resolvedLevel,
        imageName: cleanedImageName,
        annotations: []
      });
    }

    groupedAnnotations.get(groupKey)?.annotations.push({
      id: sensorId,
      displayName: sensorDisplayName,
      x: parsed.x,
      y: parsed.y
    });

    annotationsFound++;
  }

  const coordinateIssueGroups = Array.from(groupStats.values())
    .filter((group) => group.validCount === 0 && group.invalidCount > 0)
    .map((group) => ({
      block: group.block,
      level: group.level,
      imageName: group.imageName,
      invalidCount: group.invalidCount
    }));
  const backgroundImageIssueGroups = Array.from(backgroundImageIssueStats.values())
    .filter((group) => group.missingCount > 0)
    .map((group) => ({
      block: group.block,
      level: group.level,
      imageName: group.imageName,
      missingCount: group.missingCount
    }));

  return {
    groupedAnnotations,
    coordinateIssueGroups,
    backgroundImageIssueGroups,
    annotationsFound,
    invalidCoordsCount,
    invalidExamples,
    invalidCoordinates,
    hasAnyLabelColumn: colSensorId !== -1 || colDisplayName !== -1
  };
};
