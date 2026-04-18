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

const parseCoordinates = (coords: unknown): { x: number; y: number } | null => {
  const coordsStr = normalize(coords);
  const coordRegex = /^\s*-?\d+(?:\.\d+)?(?:\s+|,\s*)-?\d+(?:\.\d+)?\s*$/;
  if (!coordRegex.test(coordsStr)) {
    return null;
  }

  const [x, y] = coordsStr.replace(',', ' ').split(/\s+/).map(Number);
  return { x, y };
};

const findHeaderRow = (jsonRaw: unknown[][]): number => {
  for (let i = 0; i < Math.min(30, jsonRaw.length); i++) {
    const row = jsonRaw[i];
    if (!Array.isArray(row)) {
      continue;
    }

    const lowered = row.map((cell) => normalize(cell).toLowerCase());
    const hasCoordinates = lowered.includes('coordinates');
    const hasBackground = lowered.includes('background image name') || lowered.includes('background image');

    if (hasCoordinates && hasBackground) {
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

export const buildProcessedWorkbook = async (
  inputFile: File,
  deleteFirstRow: boolean
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
    throw new Error("Could not detect standard columns ('Coordinates', 'Background Image Name') in the spreadsheet.");
  }

  const updatedRows = jsonRaw.map((row) => (Array.isArray(row) ? [...row] : []));
  const headerRow = updatedRows[headerRowIndex] || [];

  const columnsToRemove = headerRow
    .map((h, idx) => ({
      idx,
      key: normalize(h).toLowerCase()
    }))
    .filter((item) => item.key === 'block' || item.key === 'level' || item.key === 'processed block' || item.key === 'processed level')
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

  const finalHeader = updatedRows[headerRowIndex] || [];
  finalHeader[insertAt] = 'Processed Block';
  finalHeader[insertAt + 1] = 'Processed Level';

  const colBlock = insertAt;
  const colLevel = insertAt + 1;
  const colCoordinates = finalHeader.findIndex((h) => normalize(h).toLowerCase() === 'coordinates');
  const colBackgroundImage = finalHeader.findIndex((h) => {
    const key = normalize(h).toLowerCase();
    return key === 'background image name' || key === 'background image';
  });

  let totalRows = 0;
  let missingBlock = 0;
  let missingLevel = 0;
  let validBlockLevel = 0;
  let coordinateBlankCount = 0;
  let coordinateSingleValueCount = 0;
  const blocksWithMissingOrBlankLevelMap = new Map<string, { missingCount: number; blankCount: number }>();
  const blockLevelImageMap = new Map<string, {
    blockName: string;
    levelName: string;
    imageNameMap: Map<string, string>;
    rowIndexes: number[];
  }>();

  for (let i = headerRowIndex + 1; i < updatedRows.length; i++) {
    const row = updatedRows[i];
    if (!Array.isArray(row) || row.length === 0) {
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

    if (colCoordinates !== -1) {
      const coordinatesText = normalize(row[colCoordinates]);
      if (!coordinatesText) {
        coordinateBlankCount++;
      } else {
        const parts = coordinatesText.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
        if (parts.length === 1 && isNumericValue(parts[0])) {
          coordinateSingleValueCount++;
        }
      }
    }

    if (colBackgroundImage !== -1) {
      const imageName = normalize(row[colBackgroundImage]);
      if (imageName) {
        const conflictKey = `${block.toLowerCase()}|${level.toLowerCase()}`;
        const existing = blockLevelImageMap.get(conflictKey) ?? {
          blockName: block,
          levelName: level,
          imageNameMap: new Map<string, string>(),
          rowIndexes: []
        };

        const imageKey = imageName.toLowerCase();
        if (!existing.imageNameMap.has(imageKey)) {
          existing.imageNameMap.set(imageKey, imageName);
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
      imageNames: Array.from(entry.imageNameMap.values()).sort((a, b) => a.localeCompare(b)),
      affectedRows: entry.rowIndexes.length,
      rowIndexes: entry.rowIndexes
    }))
    .sort((a, b) => `${a.blockName}|${a.levelName}`.localeCompare(`${b.blockName}|${b.levelName}`));

  if (colBackgroundImage !== -1) {
    for (const conflict of blockLevelBackgroundImageConflicts) {
      for (const rowIndex of conflict.rowIndexes) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colBackgroundImage });
        const cell = outputSheet[cellAddress];
        if (!cell) {
          continue;
        }

        cell.s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FFFF4D4F' }
          },
          font: {
            color: { rgb: 'FFFFFFFF' },
            bold: true
          }
        };
      }
    }
  }

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
        totalCount: coordinateBlankCount + coordinateSingleValueCount
      },
      blockLevelBackgroundImageConflicts: blockLevelBackgroundImageConflicts.map((item) => ({
        blockName: item.blockName,
        levelName: item.levelName,
        imageNames: item.imageNames,
        affectedRows: item.affectedRows
      })),
      hasIssues: coordinateBlankCount + coordinateSingleValueCount > 0 || blockLevelBackgroundImageConflicts.length > 0,
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
    throw new Error("Could not detect standard columns ('Coordinates', 'Background Image Name') in the spreadsheet.");
  }

  const headers = jsonRaw[headerRowIndex] || [];
  const colSensorId = headers.findIndex((h) => normalize(h) === 'Sensor Id');
  const colDisplayName = headers.findIndex((h) => /display\s*name/i.test(normalize(h)));
  const colCoords = headers.findIndex((h) => normalize(h) === 'Coordinates');
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
  if (colCoords === -1) {
    missingCols.push('Coordinates');
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

  for (let i = headerRowIndex + 1; i < jsonRaw.length; i++) {
    const row = jsonRaw[i];
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const sensorId = normalize(row[colSensorId]);
    const sensorDisplayName = colDisplayName !== -1 ? normalize(row[colDisplayName]) : '';
    const coords = row[colCoords];
    const imageName = row[colImage];

    if (!coords || !imageName) {
      continue;
    }

    const cleanedImageName = normalize(imageName);
    const parsed = parseCoordinates(coords);

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
      if (invalidExamples.length < 5) {
        invalidExamples.push(normalize(coords));
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
    hasAnyLabelColumn: colSensorId !== -1 || colDisplayName !== -1
  };
};
