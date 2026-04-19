import { useState } from 'react';
import AppHeader from './components/AppHeader';
import FileProcessingPanel from './components/FileProcessingPanel';
import FolderPickerPanel from './components/FolderPickerPanel';
import ProcessingOptionsPanel from './components/ProcessingOptionsPanel';
import StatsOverview from './components/StatsOverview';
import PreviewGridPanel from './components/PreviewGridPanel';
import ModalPreview from './components/ModalPreview';
import { useAssetAnnotationWorkflow } from './hooks/useAssetAnnotationWorkflow';
import './App.css';

export default function App() {
  const {
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
    showProcessingIssues,
    toggleProcessingIssues,
    selectedConflictImageByKey,
    setConflictImageSelection,
    applyConflictImageFixes,
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
  } = useAssetAnnotationWorkflow();

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [modalZoom, setModalZoom] = useState(1);

  return (
    <div className="app-container animate-fade-in">
      <AppHeader />

      {!directoryHandle && <FolderPickerPanel onSelectFolder={selectFolder} />}

      {directoryHandle && !isProcessed && (
        <>
          <FileProcessingPanel
            deleteFirstRow={deleteFirstRow}
            onToggleDeleteFirstRow={setDeleteFirstRow}
            isFileProcessing={isFileProcessing}
            isFileProcessed={isFileProcessed}
            onProcessFile={processSiteFile}
            onDownloadProcessedFile={downloadProcessedWorkbook}
            processingSummary={processingSummary}
            showLevelIssueBlocks={showLevelIssueBlocks}
            onToggleLevelIssueBlocks={toggleLevelIssueBlocks}
            showProcessingIssues={showProcessingIssues}
            onToggleProcessingIssues={toggleProcessingIssues}
            selectedConflictImageByKey={selectedConflictImageByKey}
            onSelectConflictImage={setConflictImageSelection}
            onApplyConflictImageFixes={applyConflictImageFixes}
          />

          <ProcessingOptionsPanel
            options={options}
            setOptions={setOptions}
            isProcessing={isProcessing}
            onStart={startProcessing}
            deleteFirstRowOnAnnotation={deleteFirstRowOnAnnotation}
            setDeleteFirstRowOnAnnotation={setDeleteFirstRowOnAnnotation}
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
            onEditOptions={editOptions}
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
      />
    </div>
  );
}
