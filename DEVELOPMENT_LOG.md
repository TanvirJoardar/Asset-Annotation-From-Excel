# Development Log

This file tracks what has been developed in this project.

## 2026-04-19

### Additional Update (Processing Row Count Inflation Fix)
- Fixed an inflated `Rows Evaluated` count during file processing.
- Root cause: empty worksheet rows were being expanded when inserting `Processed Block`/`Processed Level`, then incorrectly counted as data rows.
- Updated processing loop to validate row content from original source row data before counting/issue checks.
- Result: summary counts now align with actual non-empty data rows in Excel.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Reduced Red Tint in Issues Panel)
- Tuned Processing Issues visual theme to reduce the heavy red glass background.
- Switched panel and section backgrounds to neutral dark slate tones.
- Kept red as a focused accent only for risk indicators:
  - conflict count capsule
  - left border on conflict cards
  - rows danger pill
- Result: clearer, less fatiguing UI while preserving issue visibility.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Processing Issues UI Polish)
- Refined the Processing Issues panel visual hierarchy for better readability.
- Added a clearer section layout with:
  - Header summary capsule (`total issues`).
  - Dedicated coordinate issue metric cards.
  - Dedicated conflict list section with conflict count capsule.
- Replaced comma-separated image-name text with capsule/chip style items for each image name.
- Improved conflict cards with stronger metadata tags for Block, Level, and affected Rows.
- Added responsive adjustments for issue-panel headers and section controls on smaller screens.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Processing Issue Status + Conflict Highlighting)
- Added a clickable processing issue status indicator in `File Processing (Optional)`.
  - Green status when no issues are detected.
  - Issue count appears when problems are found.
  - Clicking the status opens an issue details panel.
- Added issue details for `Coordinates` column quality checks:
  - Count of rows where coordinates are blank.
  - Count of rows where only one numeric coordinate value exists (only X or only Y).
- Added block/level conflict detection for `Background Image Name`:
  - Detects when the same processed `Block + Level` has multiple image names.
  - Lists all conflicting image names in the issue panel.
- Updated processed workbook export to mark conflicting `Background Image Name` cells with red fill and white bold text.
- Validation target for this update:
  - `npm run typecheck`

### Additional Update (Skip Incomplete Coordinate Annotations)
- Fixed preview annotation rendering so rows with only one coordinate value (`x` without `y`, or `y` without `x`) are skipped entirely.
- Updated `src/components/PreviewCanvas.tsx` draw loop to require both coordinates as finite numbers before rendering.
- Result: no circle and no label are drawn for incomplete coordinate rows.

### Additional Update (Single-Level Blocks: Fixed Side-by-Side Cards)
- Refined preview layout for blocks that resolve to only one level (for example `UnassignedLevel`).
- Kept the outer level grid behavior unchanged while restoring single-level full-width usage only for that one level.
- Within the single-level group, cards now render in a fixed 5-column row so they stay compact and appear side-by-side instead of stacking vertically.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Always 5 Levels Per Row)
- Adjusted preview level layout to consistently render 5 level columns per row.
- Removed single-level full-width expansion rule that caused oversized cards when only one level existed.
- Removed responsive overrides that changed level column count, keeping the requested fixed 5-column grid behavior.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Single-Level Block Side-by-Side Cards)
- Fixed preview layout for blocks that have only one resolved level (for example `Unassigned Level`).
- When a block has a single level, that level column now spans the full preview width.
- Images inside that single level now flow side-by-side using an auto-fit grid instead of stacking in one narrow vertical column.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Blank Block Regression Fix)
- Fixed a regression where many images were grouped under `Blank/Blank` instead of showing side-by-side under meaningful block/level values.
- Added fallback block/level resolution in `src/hooks/useAssetAnnotationWorkflow.ts`:
  - Primary source: processed block/level values from workbook grouping.
  - Fallback 1: matched image path segments (block and level folders).
  - Fallback 2: image name parsing (`L##`/`B##` for level and first token for block).
  - Final fallback labels: `Unassigned Block` / `Unassigned Level`.
- This prevents unexpected movement into the `Blank` tab when usable context exists and restores side-by-side level grouping consistency.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Processed Level Labeling + Consistent Side-by-Side Levels)
- Fixed preview grouping source so level names come from processed annotation data (`Processed Level`) instead of depending on discovered image folder depth.
- Updated preview key generation in `src/hooks/useAssetAnnotationWorkflow.ts` to always build paths as:
  - `Processed Block/Processed Level/ImageName.png`
- This removes incorrect `root` level labels and ensures blocks like `C1 Carpark and Outdoor` use consistent side-by-side level columns when levels differ.
- Added path-part sanitization to avoid malformed keys when block/level text contains path separators.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Compact Cards + 5 Levels Per Row)
- Updated level layout in preview to a wrapped grid with 5 level columns per row on desktop.
- Levels now continue to next row automatically (row 2: next 5 levels, then row 3, etc.).
- Reduced card visual size in level view for denser layout:
  - Smaller image aspect area.
  - Tighter card footer/title spacing.
- Added responsive breakpoints to reduce columns on smaller screens for usability.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Level Columns in Preview)
- Updated selected block preview layout so levels render side-by-side horizontally instead of stacking vertically.
- Each level now appears as its own column with its images grouped under that level title.
- Preserved existing block tabs and click-to-open modal behavior.
- Updated styles in `src/App.css` for level-column scrolling and responsive sizing.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Preview Tabs by Block + Row-wise Floor Images + Modal Fix)
- Updated preview organization in `src/components/PreviewGridPanel.tsx`:
  - Added block-level tabs.
  - Each selected block now shows floor groups as row-wise horizontal image lists.
  - Kept click behavior on each image card to open modal preview.
- Updated preview styles in `src/App.css` to support block tab buttons and row-wise floor image layout.
- Fixed modal preview regression in `src/components/ModalPreview.tsx`:
  - Added robust path matching for selected preview keys (exact, normalized, and filename fallback) to prevent missing-handle blank renders.
  - Hardened fit-zoom calculation with safe clamping to avoid invalid/near-zero scale values that could make content appear invisible.
  - Kept existing modal visual design and controls unchanged.
- Improved missing-image placeholder visibility in `src/components/PreviewCanvas.tsx`.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (App.tsx Readability Refactor)
- Extracted page header markup from `src/App.tsx` into `src/components/AppHeader.tsx`.
- Extracted optional file-processing UI block from `src/App.tsx` into `src/components/FileProcessingPanel.tsx`.
- Kept existing behavior and state flow intact while reducing JSX size and improving top-level readability in `src/App.tsx`.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (App.tsx Readability Refactor - Utility Extraction)
- Extracted recursive folder discovery logic from `src/App.tsx` to `src/utils/fileDiscovery.ts`.
- Extracted workbook parsing/transformation logic to `src/utils/workbookProcessing.ts`:
  - Processed workbook generation for `Processed Block` and `Processed Level`.
  - Annotation map extraction and invalid coordinate reporting.
- Refactored repeated state-reset logic in `src/App.tsx` into a shared callback used by both app reset and folder selection.
- Kept runtime behavior intact while reducing orchestration complexity in `src/App.tsx`.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (App.tsx Readability Refactor - Workflow Hook Extraction)
- Extracted app workflow state and actions from `src/App.tsx` into `src/hooks/useAssetAnnotationWorkflow.ts`.
- Moved processing, annotation start, ZIP export, reset, and folder selection handlers into the hook while preserving behavior.
- Reduced `src/App.tsx` to mostly UI composition and modal-local state, improving scanability.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Block/Level Directory Mapping + Structured Preview/ZIP)
- Updated annotation extraction to group rows by `Processed Block`, `Processed Level`, and `Background Image Name` (with fallback to parsed descriptor/legacy columns).
- Added case-insensitive block-folder matching during image resolution:
  - Find matching image name within the folder path that contains the processed block name.
  - Prefer paths that also include the processed level name when multiple matches exist.
- Updated preview data keys to use relative image paths (folder structure) instead of filename-only keys.
- Updated preview UI to group cards by folder path so results reflect directory structure.
- Updated ZIP export to preserve the same folder structure as preview/directory paths.
- Added richer file discovery metadata (`path`, normalized segments) to support robust matching.
- Validation status:
  - `npm run typecheck` passes

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

### Additional Update (Annotation Start Row Deletion Control)
- Added checkbox in annotation settings UI:
  - `Remove first row before annotation`
- Default state is unchecked.
- Annotation start now removes first row only when this checkbox is checked.
- This gives user control instead of always removing first row in annotation flow.
