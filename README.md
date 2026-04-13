# Asset Annotation Web Application

A locally hosted, high-performance web application designed to automatically cross-reference Excel/CSV coordinate data against local reference images, instantly generating precisely annotated graphics directly from your browser. 

Built using native modern File System Access APIs, this platform keeps all of your proprietary image processing locally on your machine, eliminating slow cloud uploads and giving you complete privacy over engineering files.

### 🌟 Key Features

- **Pure Local Execution**: Effortlessly process large directories filled with heavy `.png` assets entirely off-cloud.
- **Intelligent Pattern Matching**: Automatically pulls "Sensor ID", "Coordinates", and "Background Image Name" columns and groups logic intuitively.
- **Dynamic Configuration UI**: Live control board to change outline properties, colors, toggle ID text labeling, and select structural markers using responsive HTML5 capabilities.
- **Production-Ready DPI Output**: Configurable output parameters (e.g. `300 DPI` / `600 DPI`) bypassing generic `72 DPI` web-hooks, preserving crucial density formats utilizing embedded chunk writing.
- **1-Click Packaging**: Automatically zips all annotated exports utilizing `jszip` without leaving the client viewer.

### ⚙️ Technologies

- **React (Vite)**: For blistering fast HMR and a gorgeous virtual DOM experience.
- **XLSX**: Robust data processing for complex spreadsheet layouts.
- **DPI-Tools**: Injecting precise `pHYs` metadata chunks into raw canvas blobs to maintain engineering print standard density schemas.
- **Lucide React**: For sleek, beautiful SVG vector iconography.
- **Glassmorphism CSS Design**: Using curated `Inter` typography, smooth animation states, background blurs, and deep dark-mode tailored layouts.

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

1. Upon successfully loading the page, click the **Browse Folder** dropzone target.
2. Select your overarching directory holding your CSV/Excel `.xlsx` and the visual assets (e.g., `G:\Development\App\Asset-Annotation-From-Excel\SDP Backgrounds`).
3. Whenever Chrome/Edge prompts: "Let site view files?", click **Allow** so the app can verify image connections.
4. On the configuration window, confirm your desired Radius and Colors.
5. Hit **Start Annotation**. The software rapidly extracts your mappings, calculates exact Cartesian sizes, and paints the canvas layers seamlessly generating your previews below.
6. Check your Match Preview boards!
7. Finally, hit **Export Annotated ZIP** to neatly package your final processed visual drafts onto your filesystem. If you want to run another target, just hit **New Location** to cleanly start over!
