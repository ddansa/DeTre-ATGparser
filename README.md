# 🏇 ATG Horse Racing Data Extractor

A browser-based tool for extracting and analyzing horse racing data from ATG (Swedish Horse Racing) saved pages.

**This tool does not connect to any server or upload any data externally - everything is done in your browser locally.**

> **Note:** This project was developed with AI assistance.

## 🚀 Quick Start

### Using the Bookmarklet (Recommended)

1. Open [BOOKMARKLET.md](BOOKMARKLET.md) and follow the installation instructions
2. Navigate to any ATG race page
3. Click the bookmarklet to download the rendered HTML
4. Upload the downloaded file to the extractor tool
5. Choose your export format (JSON, CSV, or Excel TSV)

## 📊 Extracted Data

### Race Information
- Game type (V75, V86, V64, etc.)
- Race metadata (title, distance, track, time)
- Complete startlist

### Horse Details
> **Note:** Exported data depends on what columns you have enabled in ATG's website settings

- Basic info (name, age, sex, driver, trainer)
- Performance statistics (life stats, current year, previous year)
- Betting data (odds, distribution, trends)
- Earnings and records
- Shoe configuration
- Expert comments


### Previous Starts (Last 5 Races)
- Date and track
- Driver and wagon type
- Placement and distance
- Kilometer time
- Shoe configuration
- Odds and prize money
- Race commentary

### Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📝 Usage

### Getting the HTML File

**Option 1: Bookmarklet (Recommended)**
- Use the bookmarklet from [BOOKMARKLET.md](BOOKMARKLET.md) to download the rendered HTML with one click

**Option 2: Manual Copy**
1. Open an ATG race page
2. Press `F12` to open Developer Tools
3. In the Elements/Inspector tab, right-click the `<body>` element
4. Select "Copy" → "Copy outerHTML"
5. Paste into a text editor and save as `.html` file

### Using the Tool

1. Visit **https://ddansa.github.io/DeTre-ATGparser/** or open `index.html` locally
2. Drag and drop your saved HTML file
3. Wait for parsing to complete
4. Choose your export option:
   - **JSON** - Full structured data, copy to clipboard or download
   - **CSV** - Flat format for spreadsheet analysis
   - **Excel (Single Horse)** - Vertical key-value layout for one horse
   - **Excel (Full Race)** - All horses in a race with race info at top
   - **Excel (All Races)** - Complete export of all races and horses

## 🔧 Configuration

The parser uses configurable selectors defined in `selectors.js`. If ATG updates their HTML structure, you can update the selectors without modifying the core parsing logic. See [SELECTORS_GUIDE.md](SELECTORS_GUIDE.md) for details.

## 🐛 Debug Mode

Enable debug mode to include table headers in the JSON output for troubleshooting parsing issues.

## 📄 License

This project is provided as-is for personal use.

## ⚠️ Disclaimer

This tool is for personal data analysis only. It parses publicly available race information from saved HTML pages and does not interact with ATG's servers or bypass any authentication. Always respect ATG's terms of service and use responsibly.
