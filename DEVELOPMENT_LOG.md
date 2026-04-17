# Development Log

This file tracks what has been developed in this project.

## 2026-04-17

### Implemented
- Refactored `App.jsx` into reusable UI components for better readability and maintainability.
- Added component files:
  - `src/components/FolderPickerPanel.jsx`
  - `src/components/ProcessingOptionsPanel.jsx`
  - `src/components/StatsOverview.jsx`
  - `src/components/PreviewGridPanel.jsx`
  - `src/components/PreviewCanvas.jsx`
  - `src/components/ModalPreview.jsx`
- Kept core processing logic intact while improving organization and reducing monolithic code.

### Performance Improvements
- Parsed annotation coordinates once during data ingestion and stored as numeric `x`/`y` values.
- Updated preview and export rendering paths to use pre-parsed numeric coordinates instead of repeated string parsing.
- Memoized preview canvas and preview cards to reduce unnecessary re-renders during UI updates.
- Used stable callbacks in `App.jsx` (`useCallback`) for frequently passed handlers.

### Rule Alignment
- Component-first structure applied to improve understanding.
- Rendering and processing flow optimized for smooth usage.
- Development updates are now tracked in this markdown log.
