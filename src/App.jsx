import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { UploadCloud, FolderOpen, Download, Image as ImageIcon, CheckCircle, FileSpreadsheet, Loader2, Settings2, Play, RefreshCw } from 'lucide-react';
import { changeDpiDataUrl } from 'dpi-tools';
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
  annotations.forEach(ann => {
    let rawX, rawY;
    if (ann.coords.includes(' ')) {
      [rawX, rawY] = ann.coords.split(' ').map(Number);
    } else if (ann.coords.includes(',')) {
      [rawX, rawY] = ann.coords.split(',').map(Number);
    } else {
      [rawX, rawY] = [0, 0];
    }

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
    } catch(e) {
      console.warn("Failed to apply DPI metadata:", e);
    }
    
    // Fetch blob from dataUrl
    fetch(finalUrl)
      .then(res => res.blob())
      .then(blob => resolve(blob));
  });
};

function PreviewCanvas({ fileHandle, annotations, options }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    const renderPreview = async () => {
      if (!fileHandle || !canvasRef.current) return;
      const file = await fileHandle.getFile();
      const bmp = await createImageBitmap(file);

      if (!active) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = bmp.width;
      canvas.height = bmp.height;

      ctx.drawImage(bmp, 0, 0);

      annotations.forEach(ann => {
        let rawX, rawY;
        if (ann.coords.includes(' ')) {
          [rawX, rawY] = ann.coords.split(' ').map(Number);
        } else if (ann.coords.includes(',')) {
          [rawX, rawY] = ann.coords.split(',').map(Number);
        } else {
          [rawX, rawY] = [0, 0];
        }

        ctx.beginPath();
        ctx.arc(rawX, rawY, options.radius, 0, Math.PI * 2);
        ctx.fillStyle = options.color;
        ctx.fill();

        if (options.drawText) {
          const labelText = options.labelType === 'displayName'
            ? (ann.displayName || ann.id || '')
            : (ann.id || ann.displayName || '');
          ctx.font = `bold ${options.radius}px Arial`;
          ctx.fillStyle = options.color;
          ctx.fillText(labelText, rawX + options.radius + 5, rawY + 5);
        }
      });
    };
    renderPreview();
    return () => { active = false; };
  }, [fileHandle, annotations, options]);

  if (!fileHandle) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Missing</div>;
  }

  return <canvas ref={canvasRef} />;
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

  const resetApp = () => {
    setDirectoryHandle(null);
    setIsProcessed(false);
    setDataMap(new Map());
    setImageHandles(new Map());
    setStats({ excelFiles: 0, annotationsFound: 0, distinctImages: 0 });
  };

  const selectFolder = async () => {
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
  };

  const startProcessing = async () => {
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
          const coordRegex = /^\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s*$/;
          if (!coordRegex.test(coordsStr)) {
            invalidCoordsCount++;
            if (invalidExamples.length < 5) invalidExamples.push(coordsStr);
            continue; // skip invalid coordinate row
          }

          if (!dMap.has(cleanedImageName)) {
            dMap.set(cleanedImageName, []);
          }
          dMap.get(cleanedImageName).push({ id: sensorId, displayName: sensorDisplayName, coords: coordsStr });
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
  };

  const exportZip = async () => {
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
  };

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <h1>Asset Annotation</h1>
        <p>Map structural data intuitively with breathtaking visual processing.</p>
      </header>

      {!directoryHandle && (
        <div className="glass-panel text-center">
          <div className="dropzone" onClick={selectFolder}>
            <div className="icon-container">
              <FolderOpen size={40} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select Working Folder</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Choose the folder containing both your Excel data and the unannotated images.</p>
            </div>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); selectFolder(); }}>
              <UploadCloud size={20} /> Browse Folder
            </button>
          </div>
        </div>
      )}

      {directoryHandle && !isProcessed && (
        <div className="glass-panel text-center animate-fade-in">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Configure Your Processing Settings</h2>
          
          <div className="options-panel animate-fade-in" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="option-group">
              <label>Fill Color</label>
              <input 
                type="color" 
                value={options.color} 
                onChange={e => setOptions({...options, color: e.target.value})}
              />
            </div>
            <div className="option-group">
              <label>Radius (px)</label>
              <input 
                type="range" 
                min="5" max="100" 
                value={options.radius} 
                onChange={e => setOptions({...options, radius: parseInt(e.target.value)})}
              />
              <span>{options.radius}px</span>
            </div>
            <div className="option-group checkbox-group">
              <input 
                type="checkbox" 
                id="drawText"
                checked={options.drawText} 
                onChange={e => setOptions({...options, drawText: e.target.checked})}
              />
              <label htmlFor="drawText">Show Labels</label>
            </div>
            {options.drawText && (
              <div className="option-group">
                <label>Label Type</label>
                <select
                  value={options.labelType}
                  onChange={e => setOptions({...options, labelType: e.target.value})}
                >
                  <option value="displayName">Sensor Display Name</option>
                  <option value="sensorId">Sensor Id</option>
                </select>
              </div>
            )}
            <div className="option-group">
              <label>Output DPI</label>
              <select 
                value={options.dpi} 
                onChange={e => setOptions({...options, dpi: parseInt(e.target.value)})}
              >
                <option value={72}>72 DPI (Standard Web)</option>
                <option value={150}>150 DPI</option>
                <option value={300}>300 DPI (Print/High Res)</option>
                <option value={600}>600 DPI</option>
              </select>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={startProcessing} 
            disabled={isProcessing}
            style={{ width: '100%', maxWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
          >
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} />}
            {isProcessing ? 'Processing...' : 'Start Annotation'}
          </button>
        </div>
      )}

      {directoryHandle && isProcessed && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Source Spreadsheet</span>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-400" />
                <span className="stat-value">{stats.excelFiles > 0 ? "Loaded" : "Missing"}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Images Referenced</span>
              <div className="flex items-center gap-2">
                <ImageIcon className="text-fuchsia-400" />
                <span className="stat-value">{stats.distinctImages}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Annotations</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-violet-400" />
                <span className="stat-value">{stats.annotationsFound}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="preview-header">
              <h2 style={{ fontSize: '1.5rem' }}>Match Preview</h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={resetApp}
                >
                  <RefreshCw size={20} /> New Location
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsProcessed(false)}
                >
                  <Settings2 size={20} /> Edit Options
                </button>
                <button
                  className="btn btn-primary"
                  onClick={exportZip}
                  disabled={isExporting || dataMap.size === 0}
                >
                  {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                  {isExporting ? 'Packaging...' : 'Export Annotated ZIP'}
                </button>
              </div>
            </div>

            <div className="preview-grid mt-4">
              {Array.from(dataMap.entries()).map(([imgName, annotations]) => {
                const handle = imageHandles.get(imgName);
                const isMissing = !handle;
                return (
                  <div key={imgName} className={`preview-card ${isMissing ? 'missing' : ''}`}>
                    <div className="preview-image-container">
                      <PreviewCanvas fileHandle={handle} annotations={annotations} options={options} />
                    </div>
                    <div className="preview-footer">
                      <span className="preview-title" title={imgName}>{imgName}</span>
                      <span className={`preview-badge ${isMissing ? 'missing' : ''}`}>
                        {annotations.length} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
