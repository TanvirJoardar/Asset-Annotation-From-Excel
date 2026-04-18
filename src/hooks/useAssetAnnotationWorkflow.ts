import { useCallback, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { changeDpiDataUrl } from 'dpi-tools';
import { collectExcelAndImageHandles } from '../utils/fileDiscovery';
import { buildProcessedWorkbook, extractAnnotationsFromWorkbook } from '../utils/workbookProcessing';
import type {
  Annotation,
  AppDirectoryHandle,
  AppFileHandle,
  ProcessingSummary,
  RenderOptions,
  Stats
} from '../types';

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

export function useAssetAnnotationWorkflow() {
  const [directoryHandle, setDirectoryHandle] = useState<AppDirectoryHandle | null>(null);
  const [excelHandle, setExcelHandle] = useState<AppFileHandle | null>(null);
  const [allImageHandlesByName, setAllImageHandlesByName] = useState<Map<string, AppFileHandle>>(new Map());
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [isFileProcessed, setIsFileProcessed] = useState(false);
  const [processedWorkbookBlob, setProcessedWorkbookBlob] = useState<Blob | null>(null);
  const [processedWorkbookName, setProcessedWorkbookName] = useState('Processed_Location_Data.xlsx');
  const [deleteFirstRow, setDeleteFirstRow] = useState(true);
  const [deleteFirstRowOnAnnotation, setDeleteFirstRowOnAnnotation] = useState(false);
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

  const resetWorkspaceState = useCallback(() => {
    setExcelHandle(null);
    setAllImageHandlesByName(new Map());
    setIsFileProcessing(false);
    setIsFileProcessed(false);
    setProcessedWorkbookBlob(null);
    setProcessedWorkbookName('Processed_Location_Data.xlsx');
    setDeleteFirstRow(true);
    setDeleteFirstRowOnAnnotation(false);
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

  const resetApp = useCallback(() => {
    setDirectoryHandle(null);
    resetWorkspaceState();
  }, [resetWorkspaceState]);

  const selectFolder = useCallback(async () => {
    try {
      const maybeWindow = window as Window & { showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<unknown> };
      if (!maybeWindow.showDirectoryPicker) {
        alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
        return;
      }

      const dirHandle = (await maybeWindow.showDirectoryPicker({ mode: 'read' })) as AppDirectoryHandle;
      setDirectoryHandle(dirHandle);
      resetWorkspaceState();
    } catch (e) {
      console.error(e);
    }
  }, [resetWorkspaceState]);

  const processSiteFile = useCallback(async () => {
    if (!directoryHandle) {
      return;
    }

    setIsFileProcessing(true);

    try {
      const { excelFileHandle, imageMap } = await collectExcelAndImageHandles(directoryHandle);
      if (!excelFileHandle) {
        alert('No Excel or CSV file found in the chosen folder.');
        setIsFileProcessing(false);
        return;
      }

      const inputFile = await excelFileHandle.getFile();
      const processed = await buildProcessedWorkbook(inputFile, deleteFirstRow);

      setProcessedWorkbookName(processed.outputName);
      setProcessedWorkbookBlob(processed.outputBlob);
      setProcessingSummary(processed.summary);
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
    if (!processedWorkbookBlob) {
      return;
    }

    saveAs(processedWorkbookBlob, processedWorkbookName);
  }, [processedWorkbookBlob, processedWorkbookName]);

  const startProcessing = useCallback(async () => {
    if (!directoryHandle) {
      return;
    }

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
      const annotationData = await extractAnnotationsFromWorkbook(file, deleteFirstRowOnAnnotation);

      setDataMap(annotationData.dataMap);

      if (annotationData.invalidCoordsCount > 0) {
        alert(`${annotationData.invalidCoordsCount} rows had invalid coordinates and were skipped. Examples: ${annotationData.invalidExamples.join(', ')}`);
      }

      if (!annotationData.hasAnyLabelColumn) {
        alert("Warning: Neither 'Sensor Id' nor 'Sensor Display Name' columns were found. Labels will be empty.");
      }

      setStats({
        excelFiles: 1,
        annotationsFound: annotationData.annotationsFound,
        distinctImages: annotationData.dataMap.size
      });

      const nextImageHandles = new Map<string, AppFileHandle>();
      for (const [imgName] of annotationData.dataMap.entries()) {
        const handle = availableImageHandles.get(imgName);
        if (handle) {
          nextImageHandles.set(imgName, handle);
        }
      }

      setImageHandles(nextImageHandles);
      setIsProcessed(true);
    } catch (e) {
      console.error(e);
      alert('Error processing folder: ' + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [allImageHandlesByName, deleteFirstRowOnAnnotation, directoryHandle, excelHandle]);

  const exportZip = useCallback(async () => {
    if (dataMap.size === 0) {
      return;
    }

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

  const editOptions = useCallback(() => {
    setIsProcessed(false);
  }, []);

  const toggleLevelIssueBlocks = useCallback(() => {
    setShowLevelIssueBlocks((prev) => !prev);
  }, []);

  return {
    directoryHandle,
    isProcessed,
    deleteFirstRow,
    setDeleteFirstRow,
    isFileProcessing,
    isFileProcessed,
    processSiteFile,
    downloadProcessedWorkbook,
    processingSummary,
    showLevelIssueBlocks,
    toggleLevelIssueBlocks,
    options,
    setOptions,
    isProcessing,
    startProcessing,
    deleteFirstRowOnAnnotation,
    setDeleteFirstRowOnAnnotation,
    stats,
    dataMap,
    imageHandles,
    resetApp,
    editOptions,
    exportZip,
    isExporting,
    selectFolder
  };
}
