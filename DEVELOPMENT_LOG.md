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

### Additional Update (Directory + Site Processing Workflow)
- Added a dedicated File Processing stage right after folder selection.
- Implemented recursive folder scanning so image files inside block/level folders are detected.
- Added Excel preprocessing based on `Location Descriptor`:
  - Split by `_`
  - Block = second value
  - Level = last token matching `L` or `B` + 1 to 3 digits; if not found, fallback to second-last token
  - Missing values are set to `Missing`
- Added/updated output columns in processed Excel:
  - `Block`
  - `Level`
- Added UI summary before annotation starts:
  - Rows evaluated
  - Missing block count
  - Missing level count
  - Valid block+level count
- Added processed file download action so users can review data first, then choose whether to start annotation.

### Additional Update (TypeScript Support Enabled)
- Installed TypeScript as a dev dependency.
- Added `tsconfig.json` configured for Vite + React with strict type checking and gradual migration support (`allowJs: true`).
- Added `src/vite-env.d.ts` for Vite client type definitions.
- Added a `typecheck` script (`tsc --noEmit`) to validate TypeScript at any time.
- Verified both typecheck and production build succeed after setup.

### Additional Update (Full Source Migration to TypeScript)
- Migrated all React source files from `.jsx` to `.tsx`.
- Migrated Vite config from `vite.config.js` to `vite.config.ts`.
- Added shared app types in `src/types.ts` and third-party module declarations in `src/types/third-party.d.ts`.
- Removed legacy `.jsx` files after migration to avoid duplicate source paths.
- Tightened TypeScript configuration to `allowJs: false` after migration completion.
- Added `@types/file-saver` and custom `dpi-tools` declaration for clean strict typecheck.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

Note:
- `eslint.config.js` remains JavaScript because ESLint runtime config loading in this setup is JS-based.

### Additional Update (Optional Processing + Processed Column Rules)
- File processing is now optional.
- After selecting a directory, both sections are shown together:
  - Optional File Processing
  - Annotation settings/start section
- Added `Delete first row before processing` checkbox to file processing UI.
  - Default state is checked.
  - If checked, first row is removed before processing logic runs.
- Processed output columns are now:
  - `Processed Block`
  - `Processed Level`
- These two columns are inserted immediately after `Location Descriptor`.
- Start annotation now works even if file processing is skipped.
  - App auto-discovers Excel and image files directly from directory when needed.

### Additional Update (Blank vs Missing + Level Issue Block List)
- Updated parsing rule for `Location Descriptor`:
  - If descriptor is blank, both processed values are `Blank`.
  - If descriptor is not blank but value cannot be matched, processed value is `Missing`.
- Updated processed summary:
  - `Rows With Missing/Blank Level` now counts both `Missing` and `Blank` levels.
- Added small expand (`...`) icon button in processed summary card area.
  - On click, it toggles a list of block names where level is `Missing` or `Blank`.

### Additional Update (Missing/Blank Count Rules + Tagged Details)
- `Rows With Missing/Blank Block` now counts both `Missing` and `Blank` block values.
- Expanded details section now shows per-block tags and counts:
  - `Missing (count)` when present
  - `Blank (count)` when present
- Counts are shown next to each tag for each block entry.
