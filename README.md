# Asset Annotation Web Application

A locally hosted, high-performance web application designed to automatically cross-reference Excel/CSV coordinate data against local reference images, instantly generating precisely annotated graphics directly from your browser. 

Built using native modern File System Access APIs, this platform keeps all of your proprietary image processing locally on your machine, eliminating slow cloud uploads and giving you complete privacy over engineering files.

### 🌟 Key Features

- **Pure Local Execution**: Effortlessly process large directories filled with heavy `.png` assets entirely off-cloud.
- **Intelligent Pattern Matching**: Automatically pulls essential columns like "Sensor ID", "X Coords", "Y Coords", and "Background Image Name" and groups logic intuitively.
- **Dynamic Configuration UI**: Live control board to change outline properties, colors, toggle ID/Label text labeling, and select structural markers using responsive HTML5 capabilities.
- **Production-Ready DPI Output**: Configurable output parameters (e.g. `300 DPI` / `600 DPI`) bypassing generic `72 DPI` web-hooks, preserving crucial density formats utilizing embedded chunk writing.
- **1-Click Packaging**: Automatically zips all annotated exports utilizing `jszip` without leaving the client viewer.

### ⚙️ Technologies

- **React (Vite)**: For blistering fast HMR and a gorgeous virtual DOM experience.
- **XLSX**: Robust data processing for complex spreadsheet layouts.
- **DPI-Tools**: Injecting precise `pHYs` metadata chunks into raw canvas blobs to maintain engineering print standard density schemas.
- **Lucide React**: For sleek, beautiful SVG vector iconography.
- **Glassmorphism CSS Design**: Using curated `Inter` typography, smooth animation states, background blurs, and deep dark-mode tailored layouts.

---

## 📊 Excel/CSV File Configuration

For the application to correctly map your coordinates to the background images, your Excel (`.xlsx`) or `.csv` file must contain specific column headers. The app typically expects the headers to be on **Row 2** (or gracefully falls back to Row 1 if there's no title row).

### Required Columns
* **`X Coords`**: The X-axis location on the background image where the marker should be placed.
* **`Y Coords`**: The Y-axis location on the background image where the marker should be placed.
* **`Background Image Name`**: The exact filename of the local image (e.g., `Floor1_Plan.png` or just `Floor1_Plan`) to draw this coordinate on.
* **`Processed Block`**: The specific building/block name (helps organize output).
* **`Processed Level`**: The specific floor/level name (helps organize output).
* **`Location Descriptor`**: A combined string with underscore-delimited segments. The app parses it as:
   - **Processed Block** = the **second segment**.
   - **Processed Level** = the **last segment** if it contains a level token like `L03` or `B2`; otherwise it uses the **second-to-last segment**.

   Examples:
   - `Tengah C1_235A_L03 UP_Staircase 1` → `Processed Block = 235A`, `Processed Level = L03` (from the second-to-last segment).
   - `Tengah C1_235A_L03 UP_L13 CORRIDOR` → `Processed Block = 235A`, `Processed Level = L13` (from the last segment).

   The app requires the `Location Descriptor` column so the **Data Processing** phase can generate the processed block and level columns.

### Generated Columns (After Processing)
* **`Issues`**: Added after processing. Lists row-level coordinate problems (e.g., blank X/Y, one coordinate missing, multiple values, or zero values). Empty means no detected coordinate issues for that row.

### Optional Columns
* **`Sensor Id`**: A unique identifier. Used as the label text drawn on the image next to the marker if labels are enabled.
* **`Display Name`**: An alternative string that can be used for label text alongside/instead of the Sensor ID.

---

## 🚀 Getting Started

If you are running the project natively, follow the steps below:

1. **Install Node/NPM Dependencies**
   Open your terminal in the directory and make sure all structural components are retrieved:
   ```bash
   npm install
   ```

2. **Launch the Engine**
   Start the local Vite development server:
   ```bash
   npm run dev
   ```

3. **Open Using A Compatible Browser**
   Because this application directly accesses your local files, ensure you run the interface on a browser supporting the *File System Access API* (Specifically **Google Chrome** or **Microsoft Edge**).
   
   Navigate to the provided localhost URL (typically `http://localhost:5173`).

---

## 📖 Usage Instructions

The annotation flow ensures your data is clean before starting the rendering process. Follow these steps:

1. **Select Workspace**: Click the **Browse Folder** dropzone target. Select your overarching directory holding your CSV/Excel `.xlsx` file and the visual background image assets.
2. **Grant Permissions**: Whenever Chrome/Edge prompts: "Let site view files?", click **Allow** so the app can verify file connections safely on your local machine.
3. **Data Processing & Validation**: 
   - Before annotating, the system will parse your raw Excel file. Use the data processing step to automatically generate `Processed Block` and `Processed Level` from the `Location Descriptor` column.
   - You will be presented with a **Validation Screen** showing processing statistics, invalid coordinate issues, or Background Image conflicts (e.g., multiple different image names assigned to the same Block/Level combination).
   - Resolve any conflicts directly in the UI.
4. **Configure Appearance**: After resolving data conflicts or directly if no conflicts exist, adjust your desired Outline Radius, Colors, Outline Toggles, and Label settings on the configuration window.
5. **Start Annotation**: Hit **Start Annotation**. The software rapidly extracts your mappings, calculates exact Cartesian sizes based on the DPI configuration, and paints the canvas layers seamlessly to generate your visual previews.
6. **Review Previews**: Check your Match Preview boards generated below!
7. **Export**: Finally, hit **Export Annotated ZIP** to neatly package your final annotated `.png` drafts structurally into folders based on Block/Level directly onto your filesystem. Click **New Location** to start over with a fresh folder.
