# 🏇 ATG Horse Racing Data Extractor

A browser-based tool for extracting and analyzing horse racing data from ATG (Swedish Horse Racing) saved pages.

## 🎯 Features

- **Zero Dependencies** - Runs entirely in the browser, no installation required
- **Comprehensive Data Extraction** - Parses race metadata, horse details, statistics, and previous race history
- **Multiple Output Formats** - Export as JSON or CSV
- **Previous Starts Analysis** - Extracts detailed race history including track, driver, placement, times, and comments
- **Flexible Input** - Accepts HTML, TXT, or any text-based file format
- **Debug Mode** - Optional detailed output for troubleshooting
- **Robust Parsing** - Configurable selectors with fallback mechanisms

## 🚀 Quick Start

### Method 1: Use the Bookmarklet (Recommended)

1. Open [BOOKMARKLET.md](BOOKMARKLET.md) and follow the installation instructions
2. Navigate to any ATG race page
3. Click the bookmarklet to download the rendered HTML
4. Upload the file to the extractor tool

### Method 2: Manual Extraction

1. Open an ATG race page in your browser
2. Open Developer Tools (F12)
3. In the Console, paste:
   ```javascript
   copy(document.body.outerHTML)
   ```
4. Save the copied HTML to a file
5. Upload to the extractor tool

## 📊 Extracted Data

### Race Information
- Game type (V75, V86, V64, etc.)
- Race metadata (title, distance, track, time)
- Complete startlist

### Horse Details
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

## 🛠️ Technical Details

### Project Structure

```
├── index.html          # Main HTML page
├── styles.css          # Styling
├── parser.js           # Core parsing logic
├── export.js           # JSON/CSV export functionality
├── ui.js               # User interface handling
├── selectors.js        # Configurable CSS selectors
├── BOOKMARKLET.md      # Bookmarklet installation guide
├── SELECTORS_GUIDE.md  # Guide for updating selectors
└── README.md           # This file
```

### Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📝 Usage

1. Open `index.html` in your browser (or visit the GitHub Pages URL)
2. Drag and drop a saved ATG race page HTML file
3. Wait for parsing to complete
4. Download as JSON or CSV, or copy to clipboard

## 🔧 Configuration

The parser uses configurable selectors defined in `selectors.js`. If ATG updates their HTML structure, you can update the selectors without modifying the core parsing logic. See [SELECTORS_GUIDE.md](SELECTORS_GUIDE.md) for details.

## 🐛 Debug Mode

Enable debug mode to include table headers in the JSON output for troubleshooting parsing issues.

## 📄 License

This project is provided as-is for personal use.

## 🤝 Contributing

This tool is designed to parse publicly available race information from saved HTML pages. It does not interact with ATG's servers or bypass any authentication.

## ⚠️ Disclaimer

This tool is for personal data analysis only. Always respect ATG's terms of service and use responsibly.
