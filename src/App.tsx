import { useCallback, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { changeDpiDataUrl } from 'dpi-tools';
import FolderPickerPanel from './components/FolderPickerPanel';
import ProcessingOptionsPanel from './components/ProcessingOptionsPanel';
import StatsOverview from './components/StatsOverview';
import PreviewGridPanel from './components/PreviewGridPanel';
import ModalPreview from './components/ModalPreview';
import type {
  Annotation,
  AppDirectoryHandle,
  AppFileHandle,
  ProcessingSummary,
  RenderOptions,
  Stats
} from './types';
import './App.css';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const normalize = (value: unknown): string => (value ?? '').toString().trim();

const isExcelFileName = (name: string): boolean => {
  const lower = normalize(name).toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const extractLevelToken = (value: unknown): string | null => {
  const match = normalize(value).match(/^[LB]\d{1,3}/i);
  return match ? match[0].toUpperCase() : null;
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
    if (!Array.isArray(row)) continue;

    const lowered = row.map((cell) => normalize(cell).toLowerCase());
    const hasCoordinates = lowered.includes('coordinates');
    const hasBackground = lowered.includes('background image name') || lowered.includes('background image');
    if (hasCoordinates && hasBackground) {
      return i;
    }
  }

  return -1;
};

const collectFilesRecursively = async (
  dirHandle: AppDirectoryHandle,
  currentPath = ''
): Promise<Array<{ handle: AppFileHandle; path: string }>> => {
  const files: Array<{ handle: AppFileHandle; path: string }> = [];
  for await (const entry of dirHandle.values()) {
    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      files.push({ handle: entry, path: nextPath });
    } else if (entry.kind === 'directory') {
      const nested = await collectFilesRecursively(entry, nextPath);
      files.push(...nested);
    }
  }
  return files;
};

const collectExcelAndImageHandles = async (
  dirHandle: AppDirectoryHandle
): Promise<{ excelFileHandle: AppFileHandle | null; imageMap: Map<string, AppFileHandle> }> => {
  const allFiles = await collectFilesRecursively(dirHandle);
  const excelFileEntry = allFiles.find((item) => isExcelFileName(item.handle.name));

  const imageMap = new Map<string, AppFileHandle>();
  for (const fileEntry of allFiles) {
    if (isExcelFileName(fileEntry.handle.name)) continue;
    if (!imageMap.has(fileEntry.handle.name)) {
      imageMap.set(fileEntry.handle.name, fileEntry.handle);
    }
  }

  return {
    excelFileHandle: excelFileEntry?.handle ?? null,
    imageMap
  };
};

const drawCirclesOnImage = async (
  fileHandle: AppFileHandle,
  annotations: Annotation[],
  options: RenderOptions
): Promise<Blob> => {
  const file = await fileHandle.getFile();
  const bmp = await createImageBitmap(file);

  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close();
    return new Blob();
  }

  ctx.drawImage(bmp, 0, 0);

  for (const ann of annotations) {
    const rawX = Number.isFinite(ann.x) ? ann.x : 0;
    const rawY = Number.isFinite(ann.y) ? ann.y : 0;

    ctx.beginPath();
    ctx.arc(rawX, rawY, options.radius, 0, Math.PI * 2);
    ctx.fillStyle = options.color;
    ctx.fill();

    if (options.drawText) {
      const labelText = options.labelType === 'displayName'
        ? (ann.displayName || ann.id || '')
        : (ann.id || ann.displayName || '');
      ctx.font = `bold ${options.radius}px Inter`;
      ctx.fillStyle = options.color;
      ctx.fillText(labelText, rawX + options.radius + 5, rawY + 5);
    }
  }

  bmp.close();

  return new Promise((resolve) => {
    const dataUrl = canvas.toDataURL('image/png');
    let finalUrl = dataUrl;

    try {
      if (options.dpi && options.dpi !== 72) {
        finalUrl = changeDpiDataUrl(dataUrl, options.dpi);
      }
    } catch (e) {
      console.warn('Failed to apply DPI metadata:', e);
    }

    fetch(finalUrl)
      .then((res) => res.blob())
      .then((blob) => resolve(blob));
  });
};

export default function App() {
  const [directoryHandle, setDirectoryHandle] = useState<AppDirectoryHandle | null>(null);
  const [excelHandle, setExcelHandle] = useState<AppFileHandle | null>(null);
  const [allImageHandlesByName, setAllImageHandlesByName] = useState<Map<string, AppFileHandle>>(new Map());
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [isFileProcessed, setIsFileProcessed] = useState(false);
  const [processedWorkbookBlob, setProcessedWorkbookBlob] = useState<Blob | null>(null);
  const [processedWorkbookName, setProcessedWorkbookName] = useState('Processed_Location_Data.xlsx');
  const [deleteFirstRow, setDeleteFirstRow] = useState(true);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary>({
    totalRows: 0,
    missingBlock: 0,
    missingLevel: 0,
    validBlockLevel: 0,
    blocksWithMissingOrBlankLevel: []
  });
  const [showLevelIssueBlocks, setShowLevelIssueBlocks] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [dataMap, setDataMap] = useState<Map<string, Annotation[]>>(new Map());
  const [imageHandles, setImageHandles] = useState<Map<string, AppFileHandle>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<Stats>({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });

  const [options, setOptions] = useState<RenderOptions>({
    color: '#ef4444',
    drawText: true,
    radius: 15,
    dpi: 300,
    labelType: 'displayName'
  });

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [modalZoom, setModalZoom] = useState(1);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const resetApp = useCallback(() => {
    setDirectoryHandle(null);
    setExcelHandle(null);
    setAllImageHandlesByName(new Map());
    setIsFileProcessing(false);
    setIsFileProcessed(false);
    setProcessedWorkbookBlob(null);
    setProcessedWorkbookName('Processed_Location_Data.xlsx');
    setDeleteFirstRow(true);
    setProcessingSummary({
      totalRows: 0,
      missingBlock: 0,
      missingLevel: 0,
      validBlockLevel: 0,
      blocksWithMissingOrBlankLevel: []
    });
    setShowLevelIssueBlocks(false);
    setIsProcessed(false);
    setDataMap(new Map());
    setImageHandles(new Map());
    setStats({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });
  }, []);

  const selectFolder = useCallback(async () => {
    try {
      const maybeWindow = window as Window & { showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<unknown> };
      if (!maybeWindow.showDirectoryPicker) {
        alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
        return;
      }
      const dirHandle = (await maybeWindow.showDirectoryPicker({ mode: 'read' })) as AppDirectoryHandle;
      setDirectoryHandle(dirHandle);
      setExcelHandle(null);
      setAllImageHandlesByName(new Map());
      setIsFileProcessing(false);
      setIsFileProcessed(false);
      setProcessedWorkbookBlob(null);
      setProcessedWorkbookName('Processed_Location_Data.xlsx');
      setDeleteFirstRow(true);
      setProcessingSummary({
        totalRows: 0,
        missingBlock: 0,
        missingLevel: 0,
        validBlockLevel: 0,
        blocksWithMissingOrBlankLevel: []
      });
      setShowLevelIssueBlocks(false);
      setIsProcessed(false);
      setDataMap(new Map());
      setImageHandles(new Map());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const processSiteFile = useCallback(async () => {
    if (!directoryHandle) return;

    setIsFileProcessing(true);
    try {
      const { excelFileHandle, imageMap } = await collectExcelAndImageHandles(directoryHandle);
      if (!excelFileHandle) {
        alert('No Excel or CSV file found in the chosen folder.');
        setIsFileProcessing(false);
        return;
      }

      const inputFile = await excelFileHandle.getFile();
      const inputBuffer = await inputFile.arrayBuffer();
      const workbook = XLSX.read(inputBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      const jsonRaw = deleteFirstRow ? rawRows.slice(1) : rawRows;

      if (jsonRaw.length === 0) {
        alert('No data rows available after applying row deletion option.');
        setIsFileProcessing(false);
        return;
      }

      const headerRowIndex = findHeaderRow(jsonRaw);
      if (headerRowIndex === -1) {
        alert("Could not detect standard columns ('Coordinates', 'Background Image Name') in the spreadsheet.");
        setIsFileProcessing(false);
        return;
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

      let totalRows = 0;
      let missingBlock = 0;
      let missingLevel = 0;
      let validBlockLevel = 0;
      const blocksWithMissingOrBlankLevelMap = new Map<string, { missingCount: number; blankCount: number }>();

      for (let i = headerRowIndex + 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const descriptor = colLocationDescriptor === -1 ? '' : row[colLocationDescriptor];
        const { block, level } = parseBlockAndLevel(descriptor);

        row[colBlock] = block;
        row[colLevel] = level;

        totalRows++;
        if (block === 'Missing' || block === 'Blank') missingBlock++;
        if (level === 'Missing' || level === 'Blank') {
          missingLevel++;
          const key = block || 'Missing';
          const current = blocksWithMissingOrBlankLevelMap.get(key) ?? { missingCount: 0, blankCount: 0 };
          if (level === 'Missing') {
            current.missingCount += 1;
          }
          if (level === 'Blank') {
            current.blankCount += 1;
          }
          blocksWithMissingOrBlankLevelMap.set(key, current);
        }
        if (block !== 'Missing' && block !== 'Blank' && level !== 'Missing' && level !== 'Blank') validBlockLevel++;
      }

      const outputSheet = XLSX.utils.aoa_to_sheet(updatedRows);
      const outputWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, firstSheetName || 'Sheet1');

      const outputArray = XLSX.write(outputWorkbook, { type: 'array', bookType: 'xlsx' });
      const outputBlob = new Blob([outputArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const sourceName = normalize(inputFile.name).replace(/\.[^.]+$/, '');
      setProcessedWorkbookName(`${sourceName || 'site_data'}_processed.xlsx`);
      setProcessedWorkbookBlob(outputBlob);
      setProcessingSummary({
        totalRows,
        missingBlock,
        missingLevel,
        validBlockLevel,
        blocksWithMissingOrBlankLevel: Array.from(blocksWithMissingOrBlankLevelMap.entries())
          .map(([blockName, counts]) => ({
            blockName,
            missingCount: counts.missingCount,
            blankCount: counts.blankCount
          }))
          .sort((a, b) => a.blockName.localeCompare(b.blockName))
      });
      setShowLevelIssueBlocks(false);
      setExcelHandle(excelFileHandle);
      setAllImageHandlesByName(imageMap);
      setIsFileProcessed(true);
      setIsProcessed(false);
      setDataMap(new Map());
      setImageHandles(new Map());
    } catch (e) {
      console.error(e);
      alert('Error while processing the Excel file: ' + (e as Error).message);
    } finally {
      setIsFileProcessing(false);
    }
  }, [deleteFirstRow, directoryHandle]);

  const downloadProcessedWorkbook = useCallback(() => {
    if (!processedWorkbookBlob) return;
    saveAs(processedWorkbookBlob, processedWorkbookName);
  }, [processedWorkbookBlob, processedWorkbookName]);

  const startProcessing = useCallback(async () => {
    if (!directoryHandle) return;

    setIsProcessing(true);

    try {
      let excelFileNode = excelHandle;
      let availableImageHandles = allImageHandlesByName;

      if (!excelFileNode || availableImageHandles.size === 0) {
        const discovered = await collectExcelAndImageHandles(directoryHandle);
        excelFileNode = discovered.excelFileHandle;
        availableImageHandles = discovered.imageMap;

        if (excelFileNode) {
          setExcelHandle(excelFileNode);
        }
        setAllImageHandlesByName(availableImageHandles);
      }

      if (!excelFileNode) {
        alert('No Excel or CSV file found in the chosen folder.');
        setIsProcessing(false);
        return;
      }

      const file = await excelFileNode.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      const headerRowIndex = findHeaderRow(jsonRaw);
      const headers = jsonRaw[headerRowIndex] || [];

      if (headerRowIndex === -1) {
        alert("Could not detect standard columns ('Coordinates', 'Background Image Name') in the spreadsheet.");
        setIsProcessing(false);
        return;
      }

      const colSensorId = headers.findIndex((h) => normalize(h) === 'Sensor Id');
      const colDisplayName = headers.findIndex((h) => /display\s*name/i.test(normalize(h)));
      const colCoords = headers.findIndex((h) => normalize(h) === 'Coordinates');
      const colImage = headers.findIndex((h) => {
        const key = normalize(h);
        return key === 'Background Image Name' || key === 'Background Image';
      });

      const missingCols: string[] = [];
      if (colCoords === -1) missingCols.push('Coordinates');
      if (colImage === -1) missingCols.push('Background Image Name');
      if (missingCols.length > 0) {
        alert('Missing crucial columns: ' + missingCols.join(', '));
        setIsProcessing(false);
        return;
      }

      if (colSensorId === -1 && colDisplayName === -1) {
        alert("Warning: Neither 'Sensor Id' nor 'Sensor Display Name' columns were found. Labels will be empty.");
      }

      const dMap = new Map<string, Annotation[]>();
      let annCount = 0;
      let invalidCoordsCount = 0;
      const invalidExamples: string[] = [];

      for (let i = headerRowIndex + 1; i < jsonRaw.length; i++) {
        const row = jsonRaw[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const sensorId = normalize(row[colSensorId]);
        const sensorDisplayName = colDisplayName !== -1 ? normalize(row[colDisplayName]) : '';
        const coords = row[colCoords];
        const imageName = row[colImage];

        if (coords && imageName) {
          const cleanedImageName = normalize(imageName);

          const parsed = parseCoordinates(coords);
          if (!parsed) {
            invalidCoordsCount++;
            if (invalidExamples.length < 5) invalidExamples.push(normalize(coords));
            continue;
          }

          if (!dMap.has(cleanedImageName)) {
            dMap.set(cleanedImageName, []);
          }
          dMap.get(cleanedImageName)?.push({
            id: sensorId,
            displayName: sensorDisplayName,
            x: parsed.x,
            y: parsed.y
          });
          annCount++;
        }
      }

      if (invalidCoordsCount > 0) {
        alert(`${invalidCoordsCount} rows had invalid coordinates and were skipped. Examples: ${invalidExamples.join(', ')}`);
      }

      setDataMap(dMap);
      setStats({
        excelFiles: 1,
        annotationsFound: annCount,
        distinctImages: dMap.size
      });

      const iHandles = new Map<string, AppFileHandle>();
      for (const [imgName] of dMap.entries()) {
        const handle = availableImageHandles.get(imgName);
        if (handle) {
          iHandles.set(imgName, handle);
        }
      }
      setImageHandles(iHandles);
      setIsProcessed(true);
    } catch (e) {
      console.error(e);
      alert('Error processing folder: ' + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [allImageHandlesByName, directoryHandle, excelHandle]);

  const exportZip = useCallback(async () => {
    if (dataMap.size === 0) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();

      const promises = Array.from(dataMap.entries()).map(async ([imgName, annotations]) => {
        const handle = imageHandles.get(imgName);
        if (handle) {
          const annotatedBlob = await drawCirclesOnImage(handle, annotations, options);
          const finalName = imgName.replace(/\.(jpg|jpeg|png)$/i, '') + '.png';
          zip.file(finalName, annotatedBlob);
        }
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'Annotated_Images.zip');
    } catch (err) {
      alert('Error generating zip: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [dataMap, imageHandles, options]);

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <h1>Asset Annotation</h1>
        <p>Map structural data intuitively with breathtaking visual processing.</p>
      </header>

      {!directoryHandle && <FolderPickerPanel onSelectFolder={selectFolder} />}

      {directoryHandle && !isProcessed && (
        <>
          <div className="glass-panel animate-fade-in" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>File Processing (Optional)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You can process the file to generate Processed Block and Processed Level columns, or start annotation directly.
            </p>

            <div className="option-group checkbox-group" style={{ marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="deleteFirstRow"
                checked={deleteFirstRow}
                onChange={(e) => setDeleteFirstRow(e.target.checked)}
              />
              <label htmlFor="deleteFirstRow">Delete first row before processing</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => void processSiteFile()} disabled={isFileProcessing}>
                {isFileProcessing ? 'Processing File...' : (isFileProcessed ? 'Reprocess File' : 'Process Excel File')}
              </button>

              {isFileProcessed && (
                <button className="btn btn-secondary" onClick={downloadProcessedWorkbook}>
                  Download Processed File
                </button>
              )}
            </div>

            {isFileProcessed && (
              <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
                <div className="stat-card">
                  <span className="stat-label">Rows Evaluated</span>
                  <span className="stat-value">{processingSummary.totalRows}</span>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <span className="stat-label">Rows With Missing/Blank Block</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowLevelIssueBlocks((prev) => !prev)}
                      style={{ padding: '0.25rem 0.5rem', minWidth: 'unset' }}
                      title="Show block names where level is Missing/Blank"
                    >
                      <Ellipsis size={16} />
                    </button>
                  </div>
                  <span className="stat-value">{processingSummary.missingBlock}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Rows With Missing/Blank Level</span>
                  <span className="stat-value">{processingSummary.missingLevel}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Rows With Both Values</span>
                  <span className="stat-value">{processingSummary.validBlockLevel}</span>
                </div>
              </div>
            )}

            {isFileProcessed && showLevelIssueBlocks && (
              <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Blocks With Missing/Blank Levels</h3>
                {processingSummary.blocksWithMissingOrBlankLevel.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No blocks found with Missing/Blank levels.</p>
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
          </div>

          <ProcessingOptionsPanel
            options={options}
            setOptions={setOptions}
            isProcessing={isProcessing}
            onStart={startProcessing}
          />
        </>
      )}

      {directoryHandle && isProcessed && (
        <>
          <StatsOverview stats={stats} />

          <PreviewGridPanel
            dataMap={dataMap}
            imageHandles={imageHandles}
            options={options}
            onReset={resetApp}
            onEditOptions={() => setIsProcessed(false)}
            onExport={exportZip}
            isExporting={isExporting}
            onOpenPreview={setSelectedPreview}
          />
        </>
      )}

      <ModalPreview
        selectedPreview={selectedPreview}
        setSelectedPreview={setSelectedPreview}
        imageHandles={imageHandles}
        dataMap={dataMap}
        options={options}
        modalZoom={modalZoom}
        setModalZoom={setModalZoom}
        modalContentRef={modalContentRef}
      />
    </div>
  );
}
