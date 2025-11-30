/**
 * JSON Export Functions
 * Excel and CSV exports handled by excelExport.js
 */

function downloadJSON(extractedData) {
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-data-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function copyToClipboard(extractedData) {
    const text = JSON.stringify(extractedData, null, 2);
    return navigator.clipboard.writeText(text);
}
