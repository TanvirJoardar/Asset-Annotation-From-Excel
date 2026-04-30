import { useCallback, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { changeDpiDataUrl } from 'dpi-tools';
import toast from 'react-hot-toast';
import { collectExcelAndImageHandles } from '../utils/fileDiscovery';
import {
  buildProcessedWorkbook,
  extractAnnotationsFromWorkbook,
  checkRequiredAnnotationColumns,
  checkRequiredProcessingColumns
} from '../utils/workbookProcessing';
import { getSafeRenderPlan } from '../utils/imageRendering';
import type {
  Annotation,
  AppDirectoryHandle,
  AppFileHandle,
  DiscoveredImageFile,
  ProcessingSummary,
  RenderOptions,
  Stats
} from '../types';

const normalizeText = (value: unknown): string => (value ?? '').toString().trim();

const normalizeKeyPart = (value: unknown): string => normalizeText(value).toLowerCase();

const isUnknownValue = (value: string): boolean => {
  const key = normalizeKeyPart(value);
  return !key || key === 'blank' || key === 'missing';
};

const extractLevelFromText = (value: string): string | null => {
  const normalized = normalizeText(value);
  const match = normalized.match(/(?:^|[_\s-])([LB]\d{1,3})(?=$|[_\s.-])/i);
  return match ? match[1].toUpperCase() : null;
};

const sanitizePathPart = (value: string, fallback: string): string => {
  const cleaned = normalizeText(value).replace(/[\\/]+/g, '-');
  return cleaned || fallback;
};

const getImageBaseName = (value: string): string => {
  const normalized = normalizeText(value).replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? normalized;
  return fileName.replace(/\.[^.]+$/, '') || 'missing-image';
};

const buildConflictKey = (blockName: string, levelName: string): string => `${blockName.toLowerCase()}|${levelName.toLowerCase()}`;

const buildDefaultConflictSelections = (summary: ProcessingSummary): Record<string, string> => {
  const selections: Record<string, string> = {};

  for (const item of summary.blockLevelBackgroundImageConflicts) {
    if (item.imageStats.length === 0) {
      continue;
    }

    const bestImage = item.imageStats[0]?.imageName;
    if (bestImage !== undefined) {
      selections[buildConflictKey(item.blockName, item.levelName)] = bestImage;
    }
  }

  return selections;
};

const buildOutputPath = (block: string, level: string, imageNameOrPath: string): string => {
  const blockSafe = sanitizePathPart(block, 'missing-block');
  const levelSafe = sanitizePathPart(level, 'missing-level');
  const imageBase = sanitizePathPart(getImageBaseName(imageNameOrPath), 'missing-image');
  return `${blockSafe}/${levelSafe}/${imageBase}.png`;
};

const extractBlockAndLevelFromOutputPath = (outputPath: string): { block: string; level: string } => {
  const segments = normalizeText(outputPath).replace(/\\/g, '/').split('/').filter(Boolean);
  const block = segments[0] || 'Unknown Block';
  const level = segments.length > 2
    ? segments.slice(1, -1).join('/')
    : (segments[1] || 'Unknown Level');

  return { block, level };
};

const shouldExportBlock = (block: string): boolean => normalizeText(block).toLowerCase() !== 'unassigned block';

const resolveBlockAndLevel = (
  block: string,
  level: string,
  imageName: string,
  matchedImagePath?: string
): { block: string; level: string } => {
  let resolvedBlock = normalizeText(block);
  let resolvedLevel = normalizeText(level);

  const pathSegments = normalizeText(matchedImagePath).replace(/\\/g, '/').split('/').filter(Boolean);
  const levelFromPath = pathSegments.length > 2 ? pathSegments.slice(1, -1).join('/') : '';

  if (isUnknownValue(resolvedLevel)) {
    if (levelFromPath) {
      resolvedLevel = levelFromPath;
    } else {
      const levelFromName = extractLevelFromText(imageName)
        ?? extractLevelFromText(pathSegments[pathSegments.length - 1] ?? '');
      if (levelFromName) {
        resolvedLevel = levelFromName;
      }
    }
  }

  if (isUnknownValue(resolvedBlock)) {
    resolvedBlock = 'Unassigned Block';
  }

  if (isUnknownValue(resolvedLevel)) {
    resolvedLevel = 'Unassigned Level';
  }

  return {
    block: resolvedBlock,
    level: resolvedLevel
  };
};

const resolveIssueBlockAndLevel = (
  block: string,
  level: string
): { block: string; level: string } => {
  const resolvedBlock = normalizeText(block);
  const resolvedLevel = normalizeText(level);

  return {
    block: isUnknownValue(resolvedBlock) ? 'Unassigned Block' : resolvedBlock,
    level: isUnknownValue(resolvedLevel) ? 'Unassigned Level' : resolvedLevel
  };
};

const hasBlockFolder = (
  imageFiles: DiscoveredImageFile[],
  block: string
): boolean => {
  const blockLower = normalizeKeyPart(block);
  if (!blockLower || isUnknownValue(block)) {
    return true;
  }

  return imageFiles.some((file) => file.segmentsLower.includes(blockLower));
};

const pickImageForGroup = (
  imageFiles: DiscoveredImageFile[],
  block: string,
  level: string,
  imageName: string
): DiscoveredImageFile | undefined => {
  const blockLower = normalizeKeyPart(block);
  const levelLower = normalizeKeyPart(level);
  const imageNameLower = normalizeKeyPart(imageName);

  const blockPool = blockLower && !isUnknownValue(block)
    ? imageFiles.filter((file) => file.segmentsLower.includes(blockLower))
    : imageFiles;
  const pool = blockPool.filter((file) => file.fileNameLower === imageNameLower);

  if (pool.length === 0) {
    return undefined;
  }

  const inLevel = levelLower ? pool.filter((file) => file.segmentsLower.includes(levelLower)) : pool;
  const ranked = (inLevel.length > 0 ? inLevel : pool).sort((a, b) => a.path.length - b.path.length);
  return ranked[0];
};

const drawCirclesOnImage = async (
  fileHandle: AppFileHandle,
  annotations: Annotation[],
  options: RenderOptions
): Promise<Blob> => {
  const file = await fileHandle.getFile();
  const bmp = await createImageBitmap(file);

  try {
    const canvas = document.createElement('canvas');
    const renderPlan = getSafeRenderPlan(bmp.width, bmp.height);
    canvas.width = renderPlan.width;
    canvas.height = renderPlan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context for image rendering.');
    }

    ctx.drawImage(bmp, 0, 0, renderPlan.width, renderPlan.height);

    const radius = Math.max(1, options.radius * renderPlan.scale);
    const textSize = Math.max(8, Math.round(options.radius * renderPlan.scale));

    for (const ann of annotations) {
      const rawX = Number.isFinite(ann.x) ? ann.x : 0;
      const rawY = Number.isFinite(ann.y) ? ann.y : 0;
      const x = rawX * renderPlan.scale;
      const y = rawY * renderPlan.scale;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = options.color;
      ctx.fill();

      if (options.drawText) {
        const labelText = options.labelType === 'displayName'
          ? (ann.displayName || ann.id || '')
          : (ann.id || ann.displayName || '');
        ctx.font = `bold ${textSize}px Inter`;
        ctx.fillStyle = options.labelColor;
        ctx.fillText(labelText, x + radius + 5, y + 5);
      }
    }

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Failed to encode annotated image as PNG blob (size: ${canvas.width}x${canvas.height}).`));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });

    if (!options.dpi || options.dpi === 72) {
      return pngBlob;
    }

    let dataUrl: string;
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed reading rendered PNG blob.'));
        reader.readAsDataURL(pngBlob);
      });
    } catch {
      // Last-resort fallback when blob read fails under memory pressure.
      dataUrl = canvas.toDataURL('image/png');
    }

    try {
      const finalUrl = changeDpiDataUrl(dataUrl, options.dpi);
      const result = await fetch(finalUrl);
      return await result.blob();
    } catch (e) {
      console.warn('Failed to apply DPI metadata, using standard PNG blob:', e);
      return pngBlob;
    }
  } finally {
    bmp.close();
  }
};

export function useAssetAnnotationWorkflow() {
  const [directoryHandle, setDirectoryHandle] = useState<AppDirectoryHandle | null>(null);
  const [excelHandle, setExcelHandle] = useState<AppFileHandle | null>(null);
  const [allImageFiles, setAllImageFiles] = useState<DiscoveredImageFile[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [isFileProcessed, setIsFileProcessed] = useState(false);
  const [processedWorkbookBlob, setProcessedWorkbookBlob] = useState<Blob | null>(null);
  const [processedWorkbookName, setProcessedWorkbookName] = useState('Processed_Location_Data.xlsx');
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary>({
    totalRows: 0,
    missingBlock: 0,
    missingLevel: 0,
    validBlockLevel: 0,
    coordinateIssues: {
      blankCount: 0,
      singleValueCount: 0,
      moreThanTwoValuesCount: 0,
      zeroValueCount: 0,
      invalidRowCount: 0,
      totalCount: 0
    },
    blockLevelBackgroundImageConflicts: [],
    hasIssues: false,
    blocksWithMissingOrBlankLevel: []
  });
  const [showLevelIssueBlocks, setShowLevelIssueBlocks] = useState(false);
  const [showProcessingIssues, setShowProcessingIssues] = useState(false);
  const [selectedConflictImageByKey, setSelectedConflictImageByKey] = useState<Record<string, string>>({});
  const [isProcessed, setIsProcessed] = useState(false);
  const [dataMap, setDataMap] = useState<Map<string, Annotation[]>>(new Map());
  const [imageHandles, setImageHandles] = useState<Map<string, AppFileHandle>>(new Map());
  const [coordinateIssueKeys, setCoordinateIssueKeys] = useState<Set<string>>(new Set());
  const [coordinateIssueCounts, setCoordinateIssueCounts] = useState<Map<string, number>>(new Map());
  const [coordinateIssueLabels, setCoordinateIssueLabels] = useState<Map<string, string>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressPercent, setExportProgressPercent] = useState(0);
  const [exportProgressLabel, setExportProgressLabel] = useState('');
  const [stats, setStats] = useState<Stats>({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });
  const annotateFromProcessedFile = isFileProcessed && !!processedWorkbookBlob;

  const [options, setOptions] = useState<RenderOptions>({
    color: '#ef4444',
    labelColor: '#0F0BDA',
    drawText: true,
    radius: 15,
    dpi: 300,
    labelType: 'displayName'
  });

  const resetWorkspaceState = useCallback(() => {
    setExcelHandle(null);
    setAllImageFiles([]);
    setIsFileProcessing(false);
    setIsFileProcessed(false);
    setProcessedWorkbookBlob(null);
    setProcessedWorkbookName('Processed_Location_Data.xlsx');
    setProcessingSummary({
      totalRows: 0,
      missingBlock: 0,
      missingLevel: 0,
      validBlockLevel: 0,
      coordinateIssues: {
        blankCount: 0,
        singleValueCount: 0,
        moreThanTwoValuesCount: 0,
        zeroValueCount: 0,
        invalidRowCount: 0,
        totalCount: 0
      },
      blockLevelBackgroundImageConflicts: [],
      hasIssues: false,
      blocksWithMissingOrBlankLevel: []
    });
    setShowLevelIssueBlocks(false);
    setShowProcessingIssues(false);
    setSelectedConflictImageByKey({});
    setExportProgressPercent(0);
    setExportProgressLabel('');
    setIsProcessed(false);
    setDataMap(new Map());
    setImageHandles(new Map());
    setCoordinateIssueKeys(new Set());
    setCoordinateIssueCounts(new Map());
    setCoordinateIssueLabels(new Map());
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
        toast.error('Your browser does not support the File System Access API. Please use Chrome or Edge.');
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
      const { excelFileHandle, imageFiles } = await collectExcelAndImageHandles(directoryHandle);
      if (!excelFileHandle) {
        toast.error('No Excel or CSV file found in the chosen folder.');
        setIsFileProcessing(false);
        return;
      }

      const inputFile = await excelFileHandle.getFile();
      const processingColumnCheck = await checkRequiredProcessingColumns(inputFile);

      if (processingColumnCheck.missingColumns.length > 0) {
        toast.error(`Missing required columns: \n${'- ' + processingColumnCheck.missingColumns.join(', \n- ')}. \n\nPlease update your file and try again.`);
        setIsFileProcessing(false);
        return;
      }

      const processed = await buildProcessedWorkbook(inputFile);

      setProcessedWorkbookName(processed.outputName);
      setProcessedWorkbookBlob(processed.outputBlob);
      setProcessingSummary(processed.summary);
      setShowLevelIssueBlocks(false);
      setShowProcessingIssues(false);
      setSelectedConflictImageByKey(buildDefaultConflictSelections(processed.summary));
      setExcelHandle(excelFileHandle);
      setAllImageFiles(imageFiles);
      setIsFileProcessed(true);
      setIsProcessed(false);
      setDataMap(new Map());
      setImageHandles(new Map());
      toast.success('Excel file processed successfully.');
    } catch (e) {
      console.error(e);
      toast.error('Error while processing the Excel file: ' + (e as Error).message);
    } finally {
      setIsFileProcessing(false);
    }
  }, [directoryHandle]);

  const downloadProcessedWorkbook = useCallback(() => {
    if (!processedWorkbookBlob) {
      return;
    }

    saveAs(processedWorkbookBlob, processedWorkbookName);
  }, [processedWorkbookBlob, processedWorkbookName]);

  const setConflictImageSelection = useCallback((conflictKey: string, imageName: string) => {
    setSelectedConflictImageByKey((prev) => ({
      ...prev,
      [conflictKey]: imageName
    }));
  }, []);

  const applyConflictImageFixes = useCallback(async () => {
    if (!directoryHandle) {
      return;
    }

    let excelFileNode = excelHandle;
    if (!excelFileNode) {
      const discovered = await collectExcelAndImageHandles(directoryHandle);
      excelFileNode = discovered.excelFileHandle;
      if (excelFileNode) {
        setExcelHandle(excelFileNode);
      }
    }

    if (!excelFileNode) {
      toast.error('No Excel or CSV file found in the chosen folder.');
      return;
    }

    setIsFileProcessing(true);

    try {
      const inputFile = await excelFileNode.getFile();
      const processed = await buildProcessedWorkbook(inputFile, {
        backgroundImageFixByBlockLevel: selectedConflictImageByKey
      });

      setProcessedWorkbookName(processed.outputName);
      setProcessedWorkbookBlob(processed.outputBlob);
      setProcessingSummary(processed.summary);
      setSelectedConflictImageByKey(buildDefaultConflictSelections(processed.summary));

      const fixedConflictsCount = processingSummary.blockLevelBackgroundImageConflicts.length - processed.summary.blockLevelBackgroundImageConflicts.length;
      toast.success(`Applied image fixes. Resolved ${Math.max(0, fixedConflictsCount)} conflict(s).`);
    } catch (e) {
      console.error(e);
      toast.error('Error while applying image fixes: ' + (e as Error).message);
    } finally {
      setIsFileProcessing(false);
    }
  }, [directoryHandle, excelHandle, processingSummary.blockLevelBackgroundImageConflicts.length, selectedConflictImageByKey]);

  const startProcessing = useCallback(async () => {
    if (!directoryHandle) {
      return;
    }

    // Block annotation from processed file if block-level background image conflicts exist
    if (annotateFromProcessedFile && processingSummary.blockLevelBackgroundImageConflicts.length > 0) {
      toast.error('Cannot start annotation: Block-Level background image conflicts detected. Please resolve all conflicts in the Processing Issues panel first.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      let excelFileNode = excelHandle;
      let availableImageFiles = allImageFiles;

      if (availableImageFiles.length === 0 || (!excelFileNode && !annotateFromProcessedFile)) {
        const discovered = await collectExcelAndImageHandles(directoryHandle);
        excelFileNode = discovered.excelFileHandle;
        availableImageFiles = discovered.imageFiles;

        if (excelFileNode) {
          setExcelHandle(excelFileNode);
        }
        setAllImageFiles(availableImageFiles);
      }

      if (!excelFileNode && !annotateFromProcessedFile) {
        toast.error('No Excel or CSV file found in the chosen folder.');
        setIsProcessing(false);
        return;
      }

      // If not using processed file, validate required columns before annotation
      if (!annotateFromProcessedFile && excelFileNode) {
        const originalFile = await excelFileNode.getFile();
        const columnCheck = await checkRequiredAnnotationColumns(originalFile);
        
        if (columnCheck.missingColumns.length > 0) {
          toast.error(`Missing required columns: \n${'- ' + columnCheck.missingColumns.join(', \n- ')}. \n\nPlease process the file first or ensure all required columns exist.`);
          setIsProcessing(false);
          return;
        }
      }

      const annotationSourceFile = annotateFromProcessedFile && processedWorkbookBlob
        ? new File([processedWorkbookBlob], processedWorkbookName || 'processed.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        : await excelFileNode!.getFile();

      const annotationData = await extractAnnotationsFromWorkbook(annotationSourceFile);

      const nextDataMap = new Map<string, Annotation[]>();
      const nextImageHandles = new Map<string, AppFileHandle>();
      const coordinateIssueKeysSet = new Set<string>();
      const coordinateIssueCountsMap = new Map<string, number>();
      const coordinateIssueLabelsMap = new Map<string, string>();

      const sortedGroups = Array.from(annotationData.groupedAnnotations.values()).sort((a, b) => {
        const aKey = `${a.block}/${a.level}/${a.imageName}`.toLowerCase();
        const bKey = `${b.block}/${b.level}/${b.imageName}`.toLowerCase();
        return aKey.localeCompare(bKey);
      });

      for (const group of sortedGroups) {
        const blockFolderExists = hasBlockFolder(availableImageFiles, group.block);
        const matchedImage = blockFolderExists
          ? pickImageForGroup(availableImageFiles, group.block, group.level, group.imageName)
          : undefined;
        const { block: resolvedBlock, level: resolvedLevel } = resolveBlockAndLevel(
          group.block,
          group.level,
          group.imageName,
          matchedImage?.path
        );
        const outputPath = buildOutputPath(
          resolvedBlock,
          resolvedLevel,
          matchedImage ? matchedImage.path : group.imageName
        );

        if (!blockFolderExists) {
          coordinateIssueKeysSet.add(outputPath);
          coordinateIssueCountsMap.set(outputPath, group.annotations.length);
          coordinateIssueLabelsMap.set(outputPath, 'Missing Folder');
          continue;
        }

        nextDataMap.set(outputPath, group.annotations);
        if (matchedImage) {
          nextImageHandles.set(outputPath, matchedImage.handle);
        }
      }

      for (const issueGroup of annotationData.coordinateIssueGroups) {
        const blockFolderExists = hasBlockFolder(availableImageFiles, issueGroup.block);
        const matchedImage = blockFolderExists
          ? pickImageForGroup(availableImageFiles, issueGroup.block, issueGroup.level, issueGroup.imageName)
          : undefined;
        const { block: resolvedBlock, level: resolvedLevel } = resolveBlockAndLevel(
          issueGroup.block,
          issueGroup.level,
          issueGroup.imageName,
          matchedImage?.path
        );
        const outputPath = buildOutputPath(
          resolvedBlock,
          resolvedLevel,
          matchedImage ? matchedImage.path : issueGroup.imageName
        );
        coordinateIssueKeysSet.add(outputPath);
        coordinateIssueCountsMap.set(outputPath, issueGroup.invalidCount);
        coordinateIssueLabelsMap.set(outputPath, blockFolderExists ? 'Coordinates Missing' : 'Missing Folder');
      }

      for (const issueGroup of annotationData.backgroundImageIssueGroups) {
        const blockFolderExists = hasBlockFolder(availableImageFiles, issueGroup.block);
        const { block: resolvedBlock, level: resolvedLevel } = resolveIssueBlockAndLevel(
          issueGroup.block,
          issueGroup.level
        );
        const outputPath = buildOutputPath(
          resolvedBlock,
          resolvedLevel,
          issueGroup.imageName
        );
        coordinateIssueKeysSet.add(outputPath);
        coordinateIssueCountsMap.set(outputPath, issueGroup.missingCount);
        coordinateIssueLabelsMap.set(outputPath, blockFolderExists ? 'Background Image Name Missing' : 'Missing Folder');
      }

      setDataMap(nextDataMap);

      if (annotationData.invalidCoordsCount > 0) {
        console.groupCollapsed(`[X/Y Coords] Annotation Invalid Rows: ${annotationData.invalidCoordsCount}`);
        console.log(annotationData.invalidCoordinates);
        console.groupEnd();
        toast(`Warning: ${annotationData.invalidCoordsCount} rows had invalid X/Y coordinates and were skipped. Examples: ${annotationData.invalidExamples.join(', ')} \n\n Check Console for Details`, {
          duration: 6000
        });
      }

      if (!annotationData.hasAnyLabelColumn) {
        toast("Warning: Neither 'Sensor Id' nor 'Sensor Display Name' columns were found. Labels will be empty.", {
          duration: 5000
        });
      }

      setStats({
        excelFiles: 1,
        annotationsFound: annotationData.annotationsFound,
        distinctImages: new Set([...nextDataMap.keys(), ...coordinateIssueKeysSet]).size
      });

      setImageHandles(nextImageHandles);
      setCoordinateIssueKeys(coordinateIssueKeysSet);
      setCoordinateIssueCounts(coordinateIssueCountsMap);
      setCoordinateIssueLabels(coordinateIssueLabelsMap);
      setIsProcessed(true);
      toast.success('Annotation groups prepared successfully.');
    } catch (e) {
      console.error(e);
      toast.error('Error processing folder: ' + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [allImageFiles, annotateFromProcessedFile, directoryHandle, excelHandle, processedWorkbookBlob, processedWorkbookName]);

  const exportZip = useCallback(async () => {
    if (dataMap.size === 0) {
      return;
    }

    setIsExporting(true);
    setExportProgressPercent(0);
    setExportProgressLabel('Preparing images...');

    try {
      const zip = new JSZip();
      const entries = Array.from(dataMap.entries()).filter(([imgName]) => {
        if (!imageHandles.has(imgName)) {
          return false;
        }

        const { block } = extractBlockAndLevelFromOutputPath(imgName);
        return shouldExportBlock(block);
      });
      const total = entries.length;
      const maxWorkers = Math.max(1, Math.min(2, (typeof navigator !== 'undefined' ? Math.floor((navigator.hardwareConcurrency || 4) / 3) : 2)));

      if (total === 0) {
        toast('Warning: No matching images found to export.', {
          duration: 4500
        });
        return;
      }

      let completed = 0;
      let failed = 0;
      const failedItems: Array<{ imagePath: string; block: string; level: string; reason: string }> = [];
      let nextIndex = 0;

      const processNext = async (): Promise<void> => {
        const currentIndex = nextIndex;
        nextIndex++;

        if (currentIndex >= total) {
          return;
        }

        const [imgName, annotations] = entries[currentIndex];
        const handle = imageHandles.get(imgName);
        const { block, level } = extractBlockAndLevelFromOutputPath(imgName);

        if (!handle) {
          failed++;
          failedItems.push({
            imagePath: imgName,
            block,
            level,
            reason: 'Image file handle not found in selected folder.'
          });
        } else {
          try {
            const annotatedBlob = await drawCirclesOnImage(handle, annotations, options);
            zip.file(imgName, annotatedBlob);
          } catch (error) {
            failed++;
            const reason = error instanceof Error ? error.message : 'Unknown decode/render error.';
            failedItems.push({ imagePath: imgName, block, level, reason });
            console.warn(`Skipping image during export due to decode/render error: ${imgName}`, error);
          }
        }

        completed++;
        setExportProgressPercent(Math.max(1, Math.min(90, Math.round((completed / total) * 90))));
        setExportProgressLabel(`Rendering ${completed}/${total}`);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        await processNext();
      };

      await Promise.all(Array.from({ length: Math.min(maxWorkers, total) }, () => processNext()));

      setExportProgressLabel('Compressing ZIP...');

      const content = await zip.generateAsync(
        {
          type: 'blob',
          streamFiles: true,
          compression: 'STORE'
        },
        (metadata) => {
          const zipPercent = Math.round(metadata.percent);
          setExportProgressPercent(Math.min(100, 90 + Math.round(zipPercent * 0.1)));
        }
      );

      saveAs(content, 'Annotated_Images.zip');
      toast.success('Annotated ZIP export completed.');

      if (failed > 0) {
        console.groupCollapsed(`[Export] Skipped images: ${failed}`);
        console.table(failedItems);
        console.groupEnd();
        toast.error(`Export finished with ${failed} skipped image(s). Open browser console for details.`);
      }
    } catch (err) {
      toast.error('Error generating zip: ' + (err as Error).message);
    } finally {
      setExportProgressPercent(0);
      setExportProgressLabel('');
      setIsExporting(false);
    }
  }, [dataMap, imageHandles, options]);

  const editOptions = useCallback(() => {
    setIsProcessed(false);
  }, []);

  const toggleLevelIssueBlocks = useCallback(() => {
    setShowLevelIssueBlocks((prev) => !prev);
  }, []);

  const toggleProcessingIssues = useCallback(() => {
    setShowProcessingIssues((prev) => !prev);
  }, []);

  return {
    directoryHandle,
    isProcessed,
    isFileProcessing,
    isFileProcessed,
    processSiteFile,
    downloadProcessedWorkbook,
    processingSummary,
    showLevelIssueBlocks,
    toggleLevelIssueBlocks,
    showProcessingIssues,
    toggleProcessingIssues,
    selectedConflictImageByKey,
    setConflictImageSelection,
    applyConflictImageFixes,
    options,
    setOptions,
    isProcessing,
    startProcessing,
    annotateFromProcessedFile,
    stats,
    dataMap,
    imageHandles,
    coordinateIssueKeys,
    coordinateIssueCounts,
    coordinateIssueLabels,
    resetApp,
    editOptions,
    exportZip,
    isExporting,
    exportProgressPercent,
    exportProgressLabel,
    selectFolder
  };
}
