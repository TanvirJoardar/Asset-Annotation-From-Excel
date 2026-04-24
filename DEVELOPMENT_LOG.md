# Development Log

This file tracks what has been developed in this project.

## 2026-04-24

### Additional Update (Toast Notifications + Permission Confirmation Modal)
- Replaced workflow `alert(...)` messages with non-blocking toast notifications using `react-hot-toast`.
- Added app-level toaster in top-right position for consistent status/error/warning messaging.
- Added a reusable `ConfirmationModal` component for explicit user permission actions.
- Updated `FileProcessingPanel` so `Fix Selected` now opens a confirmation modal before applying image conflict fixes.
- Improved export feedback UX:
  - Success is shown with toast after ZIP generation.
  - Skipped export items are summarized via toast and detailed in browser console.
- Validation status:
  - `npm run build` passes

### Additional Update (Toaster Anchored To Viewport Top-Right)
- Fixed toast positioning so notifications appear at the screen top-right, not relative to the centered app container.
- Root cause: toaster was mounted inside `.app-container.animate-fade-in`, and container transform context affected fixed positioning behavior.
- Moved `<Toaster />` mount from `App.tsx` to `main.tsx` (root level under `StrictMode`).
- Kept existing toast theme/styles unchanged.
- Validation status:
  - `npm run build` passes

### Additional Update (Dropdown UX: Select Arrow & Visibility Fix)
- Fixed `Label Type` and `Output DPI` selects for better visibility and usability.
- Changes:
  - Set `.processing-options-panel` overflow to `visible` so the select popup isn't clipped by the panel container.
  - Added a compact, themed SVG arrow background and reserved right padding for `.option-select` so the down arrow appears reliably.
  - Styled dropdown options with dark background (`#1e293b`) and light text (`#f8fafc`) for high contrast in the option list.
  - Normalized appearance across browsers with `appearance: none` and a small focus ring for accessibility.
- Files changed: `src/App.css`
- Validation status:
  - `npm run build` passes
### Additional Update (Annotation Column Validation Before Processing)
- Added pre-annotation validation to check for required columns when annotating without file processing.
- New utility function `checkRequiredAnnotationColumns()` validates the presence of crucial columns before annotation starts.
- Required columns checked:
  - `X Coords`
  - `Y Coords`
  - `Background Image Name`
  - `Block` or `Processed Block`
  - `Level` or `Processed Level`
- Updated `startProcessing()` hook to validate columns before annotation when not using processed file.
- If required columns are missing, shows error toast and aborts annotation process.
- Files changed: `src/utils/workbookProcessing.ts`, `src/hooks/useAssetAnnotationWorkflow.ts`
- Validation status:
  - `npm run build` passes
### Additional Update (Modal Overlay Viewport Anchoring Fix)
- Fixed modal overlay sizing/positioning issue where overlay height followed page content and caused modal clipping off-screen.
- Updated `ModalPreview` to render via `createPortal(..., document.body)` so the modal is anchored to the viewport instead of transformed/content parents.
- Added explicit viewport sizing on overlay (`width: 100vw`, `height: 100dvh`) for stable centering behavior.
- Kept zoom/pan interactions intact while improving modal visibility and fit.
- Validation status:
  - `npm run build` passes

## 2026-04-23

### Additional Update (Labels Card Layout Compact Redesign)
- Moved `Show Labels` toggle to the top-right of the Labels card for faster access and cleaner hierarchy.
- Rebuilt label controls into a compact row when labels are enabled:
  - `Label Color` now a small square block (reduced size).
  - `Label Type` now a wider control taking remaining space.
  - Added a compact hex code pill for quick reference.
- Reduced overall card height by tightening internal spacing and control sizes.
- Mobile responsive behavior preserved with wrapped layout on small screens.
- Validation status:
  - `npm run typecheck` passes
  - `npm run build` passes

### Additional Update (Radius Slider Bar Compact Redesign)
- Fixed radius slider bar rendering issues in Processing Settings.
- Corrected WebKit track selector usage so custom bar styling applies reliably.
- Redesigned the radius slider to a compact style:
  - Track height reduced to `3px` (about half the previous size).
  - Thumb reduced to `10px` with cleaner focus/glow treatment.
  - Tightened vertical spacing inside the Marker Radius card.
- Validation status:
  - `npm run build` passes

### Additional Update (App.css Processing Panel Syntax Repair)
- Fixed malformed CSS in `App.css` within the Processing Options section that was causing stylesheet parse issues.
- Replaced the corrupted block with a clean, valid rule set while preserving recent UX requirements:
  - Labels card remains `40%` width and other three cards share `60%` on desktop.
  - Compact card height and tighter control spacing remain applied.
  - Label color row and preview styling remain intact.
- Validation status:
  - `npm run build` passes

### Additional Update (Processing Cards Ratio + Compact Height)
- Updated Processing Settings card layout so the Labels card takes `40%` width while the other three cards share the remaining `60%` on desktop.
  - Implemented via a 5-column grid where the Labels card spans 2 columns, and each other card uses 1 column.
- Reduced card and control vertical footprint for a more compact appearance:
  - Lower card min-height and internal padding.
  - Tighter title/content spacing.
  - Slightly reduced helper text, select control, and color preview dimensions.
- Mobile behavior remains responsive with single-column stacking on small screens.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Independent Label Color Selection)
- Added a new label text color setting alongside marker fill color in the Processing Settings panel.
- Labels card now includes a dedicated `Label Color` picker with live swatch + hex preview, matching the fill-color UX pattern.
- Rendering behavior updated so marker fill and label text use separate colors:
  - Marker circles continue using `options.color`.
  - Label text now uses `options.labelColor` in both preview and exported annotated images.
- Updated shared `RenderOptions` model to include `labelColor` with default value `#f8fafc`.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Processing Settings Section UI/UX Redesign)
- Rebuilt `ProcessingOptionsPanel` with a cleaner, class-based layout for stronger visual hierarchy and maintainability.
- Upgraded card system for each setting area (Fill Color, Marker Radius, Labels, Output Quality):
  - Accent-coded icon containers by control category.
  - Short helper copy per card for clearer decision context.
  - Improved spacing and typography rhythm for faster scanning.
- Enhanced controls for usability and clarity:
  - Fill Color now includes a live swatch chip + hex preview.
  - Radius slider now has stronger value emphasis and cleaner track alignment.
  - Label settings now use a clearer toggle row and scoped label-type selector.
  - Output quality selector matches panel styling and focus behavior.
- Refined status communication and action area:
  - Warning/success banners now use consistent status styling and improved readability.
  - Start Annotation CTA now has a dedicated action row and a polished ready-state variant.
- Added responsive behavior for narrow screens:
  - Cards collapse to single-column with balanced spacing.
  - CTA expands to full width for touch accessibility.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Compact Professional Processing Panel)
- Refined `ProcessingOptionsPanel` sizing to feel more professional and less oversized:
  - Reduced outer panel padding and header spacing.
  - Reduced settings card min width and internal padding for denser layout.
  - Scaled down icon containers, icon sizes, labels, and helper text.
  - Reduced color picker/swatch and radius emphasis size.
  - Compacted warning/success status banners.
  - Reduced Start Annotation button width/height and icon size.
- Result:
  - Cleaner visual hierarchy, tighter information density, and better desktop balance.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Premium UI/UX Redesign)
- Redesigned Processing Options Panel and File Processing Panel with premium UI/UX:
  - **ProcessingOptionsPanel:**
    - Modern card-based grid layout with 4 setting cards (Color, Radius, Labels, DPI)
    - Each card has icon header with gradient background
    - Enhanced color picker with visual preview swatch
    - Custom styled range slider with gradient track and animated thumb
    - Improved checkbox and select dropdown styling
    - Status alerts with icons (warning for conflicts, success for ready state)
    - Gradient text headers and animated pulse effect for warnings
    - Enhanced action button with dynamic color (green when ready, purple otherwise)
  - **FileProcessingPanel:**
    - Premium header with large icon and gradient text
    - Centered action buttons with improved spacing
    - Enhanced stats grid with 4 modern stat cards
    - Each stat card has icon, gradient background, and hover animations
    - Color-coded stats: blue (total), red (missing block), amber (missing level), green (valid)
    - Animated pulse warning for conflicts
    - Success status indicator when no issues
  - **CSS Enhancements:**
    - Custom range slider styling with webkit and moz support
    - Enhanced color input styling with border and shadow
    - Custom checkbox with checkmark indicator
    - Select dropdown custom styling
    - Card hover effects with translateY and shadow
    - Pulse warning animation keyframes
    - Stat card hover animations
  - Validation status:
    - `npm run typecheck` passes
    - No TypeScript errors

### Additional Update (Block Annotation When Conflicts Exist)
- Implemented safety block to prevent annotation from processed file when block-level background image conflicts exist:
  - Added validation in `startProcessing()` hook to check `processingSummary.blockLevelBackgroundImageConflicts.length > 0`
  - When conflicts detected and user attempts annotation from processed file, shows alert and blocks execution
  - Updated `ProcessingOptionsPanel` to accept `hasConflicts` prop
  - Added warning alert in `ProcessingOptionsPanel` when conflicts exist and processed file annotation is active
  - Updated Start Annotation button to show "Resolve Conflicts First" when conflicts block annotation
  - Button is disabled when `annotateFromProcessedFile && hasConflicts` is true
  - Added warning status message in `FileProcessingPanel` below action buttons when conflicts exist
  - Message directs user to resolve conflicts in Processing Issues panel before annotation
- User flow:
  1. User processes file -> conflicts detected
  2. "Start Annotation from Processed File" button changes to "Resolve Conflicts First" (disabled)
  3. Warning message appears in both File Processing panel and Processing Options panel
  4. User must open Processing Issues panel and use "Fix Selected" to resolve conflicts
  5. After conflicts resolved, annotation button becomes enabled
- Validation status:
  - `npm run typecheck` passes
  - No TypeScript errors

### Additional Update (Annotation Uses Processed File After File Processing)
- Updated annotation source selection flow:
  - If file processing has been completed, annotation reads from the in-memory processed workbook file.
  - Otherwise, annotation reads from the original Excel file in the selected directory.
- Updated annotation action button text dynamically:
  - `Start Annotation from Processed File` after successful file processing.
  - `Start Annotation` when processing has not been run.
- Updated processing button text to `Reprocess Excel File` after initial processing.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Preserve Grouped Header Formatting in Processed Download)
- Updated processed workbook generation to preserve row 1 grouped-header formatting and row 2 header colors.
- Carried source cell styles through column removals/insertions for header rows before writing the output sheet.
- Preserved transformed worksheet merge ranges so grouped header structure remains intact after output column changes.
- Enabled style-aware workbook reading (`cellStyles: true`) so header/background color styles are available and retained in output.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Always Use 2nd Row as Header)
- Removed header-selection checkboxes from both File Processing and Annotation settings UI.
- Updated logic to always treat row 2 as the header in all processing paths.
- File content is kept unchanged (no row deletion).
- Added explicit errors when row 2 does not contain required headers.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Keep First Row, Use 2nd Row as Header)
- Updated workbook processing to keep all original rows unchanged (no first-row deletion).
- When enabled, the processing checkbox now treats row 2 as header instead of deleting row 1.
- Applied the same behavior to annotation extraction: row 2 can be used as header while preserving row 1 in source data.
- Updated related checkbox labels in processing and annotation panels to reflect the new behavior.
- Updated annotation invalid-row numbering to stay aligned with the original worksheet row numbers.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Invalid Count Matches Excel Filtered Rows)
- Updated coordinate processing summary to track a unique-row metric for blank/0 invalid coordinates.
- Added `coordinateIssues.invalidRowCount` and used it in the Processing Issues modal.
- `Invalid Count (X or Y is blank/0)` now counts each row once even if that row has multiple blank/0 issue tags.
- Result: UI Invalid Count aligns with filtered row counts in processed Excel (`Issues` column).
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Coordinate Cell Highlighting Removed)
- Removed processed-workbook red highlighting for `X Coords` and `Y Coords` cells.
- Kept coordinate issue detection, summary counts, and `Issues` column output unchanged.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Processing Issues UI: Single Invalid Coordinate Count)
- Updated `X/Y Coordinate Column Issues` section in the Processing Issues modal to show a single `Invalid Count` metric.
- `Invalid Count` now uses UI-only calculation:
  - `blankCount + singleValueCount + zeroValueCount`
  - Interpreted as rows where X or Y is blank/0.
- Removed previous multi-metric cards from this modal section (blank/single/multi/zero breakdown).
- Did not change Issues column generation logic.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Issues Column Added After Y Coords)
- Added a new `Issues` column in processed workbook output, inserted immediately after `Y Coords`.
- `Issues` now stores semicolon-separated reason strings for coordinate rows colored red.
- Updated reason strings to the requested filter categories:
  - `both coordinates blank`
  - `one coordinate blank`
  - `both coordinates 0`
  - `one coordinates 0`
  - `X multiple values`
  - `Y multiple values`
- Updated classification logic to use only the above six categories for coordinate issue tagging.
- Updated red cell highlighting to be per-cell:
  - both coordinates blank/0 -> both `X Coords` and `Y Coords` are highlighted.
  - one coordinate blank/0 -> only the affected coordinate cell is highlighted.
- Existing coordinate summary metrics and red highlighting behavior remain active.
- Validation status:
  - `npm run typecheck` passes

## 2026-04-22

### Additional Update (Coordinate Source Switched to X Coords and Y Coords)
- Updated workbook header detection to require `X Coords`, `Y Coords`, and `Background Image Name`.
- Replaced all coordinate parsing paths that previously read from `Coordinates` with separate reads from `X Coords` and `Y Coords`.
- Updated annotation extraction to build `(x, y)` only from `X Coords` and `Y Coords` and report invalid examples in `X: <value>, Y: <value>` format.
- Updated workbook issue highlighting to mark both `X Coords` and `Y Coords` cells for rows with coordinate issues.
- Updated processing UI wording and runtime alerts to reference X/Y coordinate columns.
- Validation status:
  - `npm run typecheck` passes

## 2026-04-21

### Additional Update (Red Highlight for All Coordinate Issue Types)
- Updated processed workbook generation to color `Coordinates` cells red for all coordinate issue categories:
  - blank coordinates
  - only one numeric value (only X or only Y)
  - more than two numeric values
  - parsed/derived zero value (`x=0` or `y=0`, including single `0`)
- Replaced the previous single-condition row tracking with unified coordinate-issue row tracking.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Red Highlight for Single-Value Coordinates)
- Updated processed workbook generation to color `Coordinates` cells red when only one numeric coordinate value is present (only X or only Y).
- Styling uses red fill with white bold text to make incomplete coordinate entries obvious in the exported workbook.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Removed Red Conflict Cell Highlighting in Output Workbook)
- Updated processed workbook generation to stop coloring `Background Image Name` conflict cells red.
- Conflict detection and issue summaries remain active; only Excel cell styling for conflicts was removed.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Log All Invalid Coordinates with Row Numbers)
- Added full invalid-coordinate capture during annotation extraction in src/utils/workbookProcessing.ts.
- Each invalid entry now includes:
  - Excel row number (1-based, aligned to the original worksheet row numbering)
  - Original coordinate string value
- Added console diagnostics in src/hooks/useAssetAnnotationWorkflow.ts:
  - Emits a collapsed console group with invalid-row count.
  - Prints all invalid rows using console.table for quick filtering/sorting.
- Existing user alert remains unchanged and still shows a short example list.
- Validation status:
  - Not run (not requested)

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

### Additional Update (Large Image Safe Rendering for Preview/Export)
- Added shared safe-render planning utility for very large images:
  - limits canvas dimensions and area to browser-safe bounds,
  - scales render output and annotation coordinates proportionally.
- Applied safe-render strategy to:
  - preview rendering (`PreviewCanvas`),
  - annotated image export rendering.
- This prevents failures like PNG blob encode errors on oversized images (e.g. `23438x15733`).
- Preview now shows a `Scaled Preview` badge when downscaling is applied.
- Added graceful preview fallback message when render fails.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Faster Export + PNG Encode Failure Mitigation)
- Improved annotated ZIP export speed by moving from single-file sequential rendering to controlled parallel workers.
- Worker count is automatically bounded (max 3) to balance speed and memory usage.
- ZIP generation now uses `STORE` compression for much faster packaging on large exports.
- Hardened PNG encode pipeline for large images:
  - better error diagnostics include canvas dimensions,
  - DPI conversion path now has a resilient fallback when blob-to-dataURL read fails under memory pressure.
- Existing decode/render failure reporting with block/level remains active.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Export Decode Error Details with Block/Level)
- Enhanced annotated ZIP export failure reporting to include `Block` and `Level` for skipped images.
- On decode/render failure (or missing image handle), completion alert now lists failed items with:
  - Block
  - Level
  - Image path
  - Reason
- For large failure sets, alert shows a capped preview list and indicates remaining count.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Efficient ZIP Export + Progress Status)
- Improved annotated ZIP export to reduce browser freeze and RAM spikes.
- Replaced parallel all-at-once image rendering with sequential export processing to keep memory usage stable.
- Added per-image failure isolation:
  - decode/render failures are skipped,
  - export can continue for remaining images,
  - user gets a skipped-count message after completion.
- Improved rendering pipeline efficiency:
  - switched from heavy `canvas.toDataURL` default path to `canvas.toBlob` for PNG generation,
  - still attempts DPI metadata application when configured.
- Added live export progress UI:
  - button shows percent done,
  - progress label (`Rendering x/y`, `Compressing ZIP...`),
  - progress bar visible while export is running.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Interactive Conflict Fix for Background Image Names)
- Upgraded `Block-Level with Multiple Background Image Name Values` issues into a selectable fix workflow.
- Each conflict now shows image capsules with occurrence counts.
- Default selection is automatically set to the highest-count image for each `Block + Level` conflict.
- Users can choose one capsule per conflict and click `Fix Selected`.
- On fix:
  - all rows in that conflict `Block + Level` with image values are replaced with the selected image name,
  - processed workbook is rebuilt,
  - the download file contains the applied fix.
- Updated conflict summary model to include `imageStats` (`imageName`, `count`) for UI rendering and default selection.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Zero Count Includes Single Coordinate Value)
- Fixed coordinate zero-value detection to include rows where only one numeric coordinate is present and that value is `0`.
- Previous behavior only counted zero when a valid `x,y` pair existed.
- Updated logic in `src/utils/workbookProcessing.ts`:
  - Counts zero for single-value coordinates (`0`).
  - Keeps existing zero detection for valid coordinate pairs where `x = 0` or `y = 0`.
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Coordinates: X or Y Equals 0 Count)
- Added a new coordinate issue metric for rows where parsed coordinate value has either `x = 0` or `y = 0`.
- Updated processing summary model and state with:
  - `zeroValueCount`
- Updated total coordinate issue count and status logic to include this new metric.
- Added a dedicated metric card in Processing Issues UI:
  - `X or Y Equals 0`
- Validation status:
  - `npm run typecheck` passes

### Additional Update (Coordinates >2 Values Count Re-Applied)
- Re-applied and verified support for counting coordinate rows with more than two numeric values.
- Updated processing logic to detect numeric token count in `Coordinates` and increment when count is greater than 2.
- Updated summary model/state and Processing Issues UI metric card:
  - `More Than 2 Values`
- Updated total issue and `hasIssues` calculations to include this metric.
- Validation status:
  - `npm run typecheck` passes

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
