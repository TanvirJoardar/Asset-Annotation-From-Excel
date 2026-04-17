import React, { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { changeDpiDataUrl } from 'dpi-tools';
import FolderPickerPanel from './components/FolderPickerPanel';
import ProcessingOptionsPanel from './components/ProcessingOptionsPanel';
import StatsOverview from './components/StatsOverview';
import PreviewGridPanel from './components/PreviewGridPanel';
import ModalPreview from './components/ModalPreview';
import './App.css';

// Offscreen canvas logic for rendering the circle directly onto the image
const drawCirclesOnImage = async (fileHandle, annotations, options) => {
  const file = await fileHandle.getFile();
  const bmp = await createImageBitmap(file);

  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(bmp, 0, 0);

  // Draw circles
  annotations.forEach((ann) => {
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
  });

  return new Promise((resolve) => {
    // Generate PNG to properly apply DPI without loss of quality
    const dataUrl = canvas.toDataURL('image/png');
    let finalUrl = dataUrl;
    
    try {
      if (options.dpi && options.dpi !== 72) {
        finalUrl = changeDpiDataUrl(dataUrl, options.dpi);
      }
    } catch (e) {
      console.warn("Failed to apply DPI metadata:", e);
    }
    
    // Fetch blob from dataUrl
    fetch(finalUrl)
      .then(res => res.blob())
      .then(blob => resolve(blob));
  });
}

export default function App() {
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [dataMap, setDataMap] = useState(new Map());
  const [imageHandles, setImageHandles] = useState(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });

  const [options, setOptions] = useState({
    color: '#ef4444',
    drawText: true,
    radius: 15,
    dpi: 300,
    labelType: 'displayName' // 'displayName' or 'sensorId'
  });

  const resetApp = useCallback(() => {
    setDirectoryHandle(null);
    setIsProcessed(false);
    setDataMap(new Map());
    setImageHandles(new Map());
    setStats({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });
  }, []);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [modalZoom, setModalZoom] = useState(1);
  const modalContentRef = useRef(null);

  const selectFolder = useCallback(async () => {
    try {
      if (!window.showDirectoryPicker) {
        alert("Your browser does not support the File System Access API. Please use Chrome or Edge.");
        return;
      }
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      setDirectoryHandle(dirHandle);
      setIsProcessed(false);
      setDataMap(new Map());
      setImageHandles(new Map());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const startProcessing = useCallback(async () => {
    if (!directoryHandle) return;
    setIsProcessing(true);

    try {
      const allHandles = {};
      let excelFileNode = null;

      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
          allHandles[entry.name] = entry;
          if (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls') || entry.name.endsWith('.csv')) {
            excelFileNode = entry;
          }
        }
      }

      if (!excelFileNode) {
        alert("No Excel or CSV file found in the chosen folder.");
        setIsProcessing(false);
        return;
      }

      const file = await excelFileNode.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let headerRowIndex = -1;
      let headers = [];
      for (let i = 0; i < Math.min(10, jsonRaw.length); i++) {
        if (jsonRaw[i] && typeof jsonRaw[i][0] === 'string' && (jsonRaw[i].includes('Coordinates') || jsonRaw[i].includes('Sensor Id') || jsonRaw[i].includes('Background Image Name'))) {
          headerRowIndex = i;
          headers = jsonRaw[i];
          break;
        }
      }

      if (headerRowIndex === -1) {
        alert("Could not detect standard columns ('Coordinates', 'Background Image Name') in the spreadsheet.");
        resetApp();
        setIsProcessing(false);
        return;
      }

      const colSensorId = headers.findIndex(h => h && h.toString().trim() === 'Sensor Id');
      const colDisplayName = headers.findIndex(h => h && /display\s*name/i.test(h.toString()));
      const colCoords = headers.findIndex(h => h && h.toString().trim() === 'Coordinates');
      const colImage = headers.findIndex(h => h && (h.toString().trim() === 'Background Image Name' || h.toString().trim() === 'Background Image'));

      const missingCols = [];
      if (colCoords === -1) missingCols.push('Coordinates');
      if (colImage === -1) missingCols.push('Background Image Name');
      if (missingCols.length > 0) {
        alert("Missing crucial columns: " + missingCols.join(', '));
        resetApp();
        setIsProcessing(false);
        return;
      }

      if (colSensorId === -1 && colDisplayName === -1) {
        alert("Warning: Neither 'Sensor Id' nor 'Sensor Display Name' columns were found. Labels will be empty.");
      }

      let dMap = new Map();
      let annCount = 0;
      let invalidCoordsCount = 0;
      const invalidExamples = [];

      for (let i = headerRowIndex + 1; i < jsonRaw.length; i++) {
        const row = jsonRaw[i];
        if (!row || row.length === 0) continue;

        const sensorId = row[colSensorId] || '';
        const sensorDisplayName = (colDisplayName !== -1) ? (row[colDisplayName] || '') : '';
        const coords = row[colCoords];
        const imageName = row[colImage];

        if (coords && imageName) {
          const coordsStr = coords.toString().trim();
          const cleanedImageName = imageName.toString().trim();

          // Validate coordinates: must be two numbers separated by a space (e.g. "123 456" or "12.3 -45.6")
          const coordRegex = /^\s*-?\d+(?:\.\d+)?(?:\s+|,\s*)-?\d+(?:\.\d+)?\s*$/;
          if (!coordRegex.test(coordsStr)) {
            invalidCoordsCount++;
            if (invalidExamples.length < 5) invalidExamples.push(coordsStr);
            continue; // skip invalid coordinate row
          }

          const [x, y] = coordsStr.trim().replace(',', ' ').split(/\s+/).map(Number);

          if (!dMap.has(cleanedImageName)) {
            dMap.set(cleanedImageName, []);
          }
          dMap.get(cleanedImageName).push({ id: sensorId, displayName: sensorDisplayName, x, y });
          annCount++;
        }
      }

      if (invalidCoordsCount > 0) {
        alert(`${invalidCoordsCount} rows had invalid coordinates and were skipped. Examples: ${invalidExamples.join(', ')}`);
        resetApp();
        setIsProcessing(false);
        return;
      }

      setDataMap(dMap);
      setStats({
        excelFiles: 1,
        annotationsFound: annCount,
        distinctImages: dMap.size
      });

      let iHandles = new Map();
      for (const [imgName, _] of dMap.entries()) {
        if (allHandles[imgName]) {
          iHandles.set(imgName, allHandles[imgName]);
        }
      }
      setImageHandles(iHandles);
      setIsProcessed(true);

    } catch (e) {
      console.error(e);
      alert("Error processing folder: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  }, [directoryHandle, resetApp]);

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
      alert("Error generating zip: " + err.message);
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

      {!directoryHandle && (
        <FolderPickerPanel onSelectFolder={selectFolder} />
      )}

      {directoryHandle && !isProcessed && (
        <ProcessingOptionsPanel
          options={options}
          setOptions={setOptions}
          isProcessing={isProcessing}
          onStart={startProcessing}
        />
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
