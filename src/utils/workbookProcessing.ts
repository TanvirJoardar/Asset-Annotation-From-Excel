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
    const hasBackground = row.some((cell) => {
      const key = normalizeHeaderKey(cell);
      return key === 'background image name' || key === 'background image';
    });

    if (hasXCoords && hasYCoords && hasBackground) {
      return i;
    }
  }

  return -1;
};

export interface ProcessedWorkbookResult {
  outputBlob: Blob;
  outputName: string;
  summary: ProcessingSummary;
}

interface ProcessWorkbookOptions {
  backgroundImageFixByBlockLevel?: Record<string, string>;
}

export const buildProcessedWorkbook = async (
  inputFile: File,
  deleteFirstRow: boolean,
  options: ProcessWorkbookOptions = {}
): Promise<ProcessedWorkbookResult> => {
  const inputBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(inputBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  const jsonRaw = deleteFirstRow ? rawRows.slice(1) : rawRows;

  if (jsonRaw.length === 0) {
    throw new Error('No data rows available after applying row deletion option.');
  }

  const headerRowIndex = findHeaderRow(jsonRaw);
  if (headerRowIndex === -1) {
    throw new Error("Could not detect standard columns ('X Coords', 'Y Coords', 'Background Image Name') in the spreadsheet.");
  }

  const updatedRows = jsonRaw.map((row) => (Array.isArray(row) ? [...row] : []));
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
    for (const row of updatedRows) {
      if (Array.isArray(row) && row.length > colIndex) {
        row.splice(colIndex, 1);
      }
    }
  }

  const normalizedHeader = updatedRows[headerRowIndex] || [];
  const colLocationDescriptor = normalizedHeader.findIndex((h) => normalize(h).toLowerCase() === 'location descriptor');
  const insertAt = colLocationDescriptor === -1 ? normalizedHeader.length : colLocationDescriptor + 1;

  for (const row of updatedRows) {
    if (Array.isArray(row)) {
      row.splice(insertAt, 0, '', '');
    }
  }

  const headerAfterProcessedColumns = updatedRows[headerRowIndex] || [];
  headerAfterProcessedColumns[insertAt] = 'Processed Block';
  headerAfterProcessedColumns[insertAt + 1] = 'Processed Level';

  const colYCoordsBeforeIssues = headerAfterProcessedColumns.findIndex((h) => isYCoordsHeader(h));
  if (colYCoordsBeforeIssues !== -1) {
    const issuesInsertAt = colYCoordsBeforeIssues + 1;
    for (const row of updatedRows) {
      if (Array.isArray(row)) {
        row.splice(issuesInsertAt, 0, '');
      }
    }

    const headerAfterIssuesColumn = updatedRows[headerRowIndex] || [];
    headerAfterIssuesColumn[issuesInsertAt] = 'Issues';
  }

  const finalHeader = updatedRows[headerRowIndex] || [];
  const colBlock = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'processed block');
  const colLevel = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'processed level');
  const colXCoords = finalHeader.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = finalHeader.findIndex((h) => isYCoordsHeader(h));
  const colIssues = finalHeader.findIndex((h) => normalizeHeaderKey(h) === 'issues');
  const colBackgroundImage = finalHeader.findIndex((h) => {
    const key = normalizeHeaderKey(h);
    return key === 'background image name' || key === 'background image';
  });

  let totalRows = 0;
  let missingBlock = 0;
  let missingLevel = 0;
  let validBlockLevel = 0;
  let coordinateBlankCount = 0;
  let coordinateSingleValueCount = 0;
  let coordinateMoreThanTwoValuesCount = 0;
  let coordinateZeroValueCount = 0;
  const coordinateInvalidBlankOrZeroRows = new Set<number>();
  const blocksWithMissingOrBlankLevelMap = new Map<string, { missingCount: number; blankCount: number }>();
  const blockLevelImageMap = new Map<string, {
    blockName: string;
    levelName: string;
    imageNameMap: Map<string, { imageName: string; count: number }>;
    rowIndexes: number[];
  }>();

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

      if (colIssues !== -1) {
        row[colIssues] = coordinateIssues.join('; ');
      }
    }

    if (colBackgroundImage !== -1) {
      const conflictKey = `${block.toLowerCase()}|${level.toLowerCase()}`;
      const selectedImageFix = options.backgroundImageFixByBlockLevel?.[conflictKey];
      if (selectedImageFix && normalize(row[colBackgroundImage])) {
        row[colBackgroundImage] = selectedImageFix;
      }

      const imageName = normalize(row[colBackgroundImage]);
      if (imageName) {
        const existing = blockLevelImageMap.get(conflictKey) ?? {
          blockName: block,
          levelName: level,
          imageNameMap: new Map<string, { imageName: string; count: number }>(),
          rowIndexes: [] as number[]
        };

        const imageKey = imageName.toLowerCase();
        const imageEntry = existing.imageNameMap.get(imageKey);
        if (!imageEntry) {
          existing.imageNameMap.set(imageKey, { imageName, count: 1 });
        } else {
          imageEntry.count += 1;
          existing.imageNameMap.set(imageKey, imageEntry);
        }
        existing.rowIndexes.push(i);
        blockLevelImageMap.set(conflictKey, existing);
      }
    }
  }

  const outputSheet = XLSX.utils.aoa_to_sheet(updatedRows);

  const blockLevelBackgroundImageConflicts = Array.from(blockLevelImageMap.values())
    .filter((entry) => entry.imageNameMap.size > 1)
    .map((entry) => ({
      blockName: entry.blockName,
      levelName: entry.levelName,
      imageStats: Array.from(entry.imageNameMap.values()).sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.imageName.localeCompare(b.imageName);
      }),
      affectedRows: entry.rowIndexes.length,
      rowIndexes: entry.rowIndexes
    }))
    .sort((a, b) => `${a.blockName}|${a.levelName}`.localeCompare(`${b.blockName}|${b.levelName}`));

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
      blockLevelBackgroundImageConflicts: blockLevelBackgroundImageConflicts.map((item) => ({
        blockName: item.blockName,
        levelName: item.levelName,
        imageStats: item.imageStats,
        affectedRows: item.affectedRows
      })),
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

export interface AnnotationExtractionResult {
  groupedAnnotations: Map<string, {
    block: string;
    level: string;
    imageName: string;
    annotations: Annotation[];
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

export const extractAnnotationsFromWorkbook = async (
  inputFile: File,
  deleteFirstRowOnAnnotation: boolean
): Promise<AnnotationExtractionResult> => {
  const arrayBuffer = await inputFile.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  const jsonRaw = deleteFirstRowOnAnnotation ? rawRows.slice(1) : rawRows;

  if (jsonRaw.length === 0) {
    throw new Error('No data rows available after applying row deletion option for annotation.');
  }

  const headerRowIndex = findHeaderRow(jsonRaw);
  if (headerRowIndex === -1) {
    throw new Error("Could not detect standard columns ('X Coords', 'Y Coords', 'Background Image Name') in the spreadsheet.");
  }

  const headers = jsonRaw[headerRowIndex] || [];
  const colSensorId = headers.findIndex((h) => normalize(h) === 'Sensor Id');
  const colDisplayName = headers.findIndex((h) => /display\s*name/i.test(normalize(h)));
  const colXCoords = headers.findIndex((h) => isXCoordsHeader(h));
  const colYCoords = headers.findIndex((h) => isYCoordsHeader(h));
  const colImage = headers.findIndex((h) => {
    const key = normalize(h);
    return key === 'Background Image Name' || key === 'Background Image';
  });
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

    if ((!normalize(xCoords) && !normalize(yCoords)) || !imageName) {
      continue;
    }

    const cleanedImageName = normalize(imageName);
    const parsed = parseCoordinates(xCoords, yCoords);

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

    const groupKey = `${resolvedBlock.toLowerCase()}|${resolvedLevel.toLowerCase()}|${cleanedImageName.toLowerCase()}`;

    if (!parsed) {
      invalidCoordsCount++;
      invalidCoordinates.push({
        rowNumber: i + (deleteFirstRowOnAnnotation ? 2 : 1),
        coordinate: `X: ${normalize(xCoords)}, Y: ${normalize(yCoords)}`
      });
      if (invalidExamples.length < 5) {
        invalidExamples.push(`X: ${normalize(xCoords)}, Y: ${normalize(yCoords)}`);
      }
      continue;
    }

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

  return {
    groupedAnnotations,
    annotationsFound,
    invalidCoordsCount,
    invalidExamples,
    invalidCoordinates,
    hasAnyLabelColumn: colSensorId !== -1 || colDisplayName !== -1
  };
};
