/**
 * Excel Export Module
 * Uses SheetJS (xlsx) Community Edition - Apache 2.0 License
 * https://sheetjs.com/
 */

const EXCEL_CONFIG = {
    TEXT_FORMAT: '@',
    MIN_COL_WIDTH: 8,
    MAX_COL_WIDTH: 30,
    COL_PADDING: 1,
    VERTICAL_LABEL_WIDTH: 25,
    VERTICAL_VALUE_WIDTH: 50,
    MAX_PREVIOUS_STARTS: 5
};

// ============================================================================
// Data Conversion - Vertical Format (Key-Value pairs)
// ============================================================================

function convertHorseToWorksheetData(race, horseNumber, includeRaceInfo = true) {
    const horse = race.horses.find(h => h.startNumber === String(horseNumber));
    if (!horse) throw new Error(`Horse ${horseNumber} not found in race ${race.raceId}`);
    
    const rows = [];
    
    Object.keys(horse).forEach(key => {
        if (key !== 'previousStarts') {
            rows.push([key, horse[key] ?? '']);
        }
    });
    
    if (includeRaceInfo) {
        rows.push(['', ''], ['--- RACE INFO ---', '']);
        if (race.metadata.title) rows.push(['raceTitle', race.metadata.title]);
        rows.push(
            ['raceTrack', race.metadata.track || ''],
            ['raceDistance', race.metadata.distance || ''],
            ['raceType', race.metadata.raceType || ''],
            ['startType', race.metadata.startType || '']
        );
        if (race.metadata.description) rows.push(['raceDescription', race.metadata.description]);
    }
    
    if (horse.previousStarts?.length > 0) {
        rows.push(['', ''], ['--- PREVIOUS STARTS ---', '']);
        
        const starts = horse.previousStarts.slice(0, EXCEL_CONFIG.MAX_PREVIOUS_STARTS);
        starts.forEach((start, index) => {
            const num = starts.length - index;
            rows.push(
                [`Date-${num}`, start.date || ''],
                [`Track-${num}`, start.track || ''],
                [`Driver-${num}`, start.driver || ''],
                [`Placement-${num}`, start.placement || ''],
                [`Distance-${num}`, start.distanceTrack || ''],
                [`KM-Time-${num}`, start.kmTime || ''],
                [`Shoes-${num}`, start.shoeInfo || ''],
                [`Odds-${num}`, start.odds || ''],
                [`Prize-${num}`, start.prize || ''],
                [`Wagon-${num}`, start.wagonType || ''],
                [`Remarks-${num}`, start.remarks || ''],
                [`Comment-${num}`, start.comment || '']
            );
            if (index < starts.length - 1) rows.push(['', '']);
        });
    }
    
    return rows;
}

function convertFullRaceToWorksheetData(race) {
    const rows = [
        ['--- RACE INFO ---', ''],
        ['raceId', race.raceId]
    ];
    
    if (race.metadata.title) rows.push(['raceTitle', race.metadata.title]);
    rows.push(
        ['raceTrack', race.metadata.track || ''],
        ['raceDistance', race.metadata.distance || ''],
        ['raceType', race.metadata.raceType || ''],
        ['startType', race.metadata.startType || '']
    );
    if (race.metadata.description) rows.push(['raceDescription', race.metadata.description]);
    
    rows.push(['', ''], ['----------------------------------------', ''], ['', '']);
    
    race.horses.forEach((horse, index) => {
        rows.push(...convertHorseToWorksheetData(race, horse.startNumber, false));
        if (index < race.horses.length - 1) {
            rows.push(['', ''], ['----------------------------------------', ''], ['', '']);
        }
    });
    
    return rows;
}

function convertAllRacesToWorksheetData(extractedData) {
    const rows = [];
    
    extractedData.races.forEach((race, index) => {
        const title = race.metadata.title || race.raceId;
        rows.push([`-------- ${title} - ${race.metadata.track || 'Unknown'} --------`, '']);
        rows.push(...convertFullRaceToWorksheetData(race));
        if (index < extractedData.races.length - 1) rows.push(['', ''], ['', '']);
    });
    
    return rows;
}

// ============================================================================
// Data Conversion - Horizontal Format (Table with headers)
// ============================================================================

function convertToHorizontalTableData(extractedData) {
    const headerRow = ['Game Type', 'Race ID', 'Race Title', 'Race Track', 'Race Distance', 'Race Type', 'Start Type'];
    
    const horseFields = new Set();
    extractedData.races.forEach(race => {
        race.horses.forEach(horse => {
            Object.keys(horse).forEach(key => {
                if (key !== 'previousStarts') horseFields.add(key);
            });
        });
    });
    
    headerRow.push(...Array.from(horseFields));
    const rows = [headerRow];
    
    extractedData.races.forEach(race => {
        race.horses.forEach(horse => {
            const row = [
                extractedData.gameType,
                race.raceId,
                race.metadata.title || '',
                race.metadata.track || '',
                race.metadata.distance || '',
                race.metadata.raceType || '',
                race.metadata.startType || ''
            ];
            
            horseFields.forEach(field => {
                row.push(horse[field] ?? '');
            });
            
            rows.push(row);
        });
    });
    
    return rows;
}

// ============================================================================
// Workbook Creation
// ============================================================================

function applyTextFormatting(ws, range) {
    for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (ws[cellAddress]) ws[cellAddress].z = EXCEL_CONFIG.TEXT_FORMAT;
    }
}

function applyTextFormattingToAll(ws, range) {
    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (ws[cellAddress]) ws[cellAddress].z = EXCEL_CONFIG.TEXT_FORMAT;
        }
    }
}

function calculateColumnWidths(ws, range) {
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = EXCEL_CONFIG.MIN_COL_WIDTH;
        for (let row = range.s.r; row <= range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = ws[cellAddress];
            if (cell?.v) {
                maxWidth = Math.max(maxWidth, String(cell.v).length);
            }
        }
        colWidths.push({ wch: Math.min(maxWidth + EXCEL_CONFIG.COL_PADDING, EXCEL_CONFIG.MAX_COL_WIDTH) });
    }
    return colWidths;
}

function createVerticalWorkbook(data, sheetName) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    applyTextFormatting(ws, range);
    ws['!cols'] = [
        { wch: EXCEL_CONFIG.VERTICAL_LABEL_WIDTH },
        { wch: EXCEL_CONFIG.VERTICAL_VALUE_WIDTH }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
}

function createHorizontalWorkbook(data, sheetName) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    applyTextFormattingToAll(ws, range);
    ws['!cols'] = calculateColumnWidths(ws, range);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
}

// ============================================================================
// Download Functions
// ============================================================================

function downloadExcelSingleHorse(extractedData, raceId, horseNumber) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) throw new Error(`Race ${raceId} not found`);
    
    const data = convertHorseToWorksheetData(race, horseNumber);
    const wb = createVerticalWorkbook(data, 'Horse Data');
    XLSX.writeFile(wb, `horse-${horseNumber}-race-${raceId}.xlsx`);
}

function downloadExcelFullRace(extractedData, raceId) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) throw new Error(`Race ${raceId} not found`);
    
    const data = convertFullRaceToWorksheetData(race);
    const wb = createVerticalWorkbook(data, 'Race Data');
    XLSX.writeFile(wb, `race-${raceId}-all-horses.xlsx`);
}

function downloadExcelAllRaces(extractedData) {
    const data = convertAllRacesToWorksheetData(extractedData);
    const wb = createVerticalWorkbook(data, 'All Races');
    const filename = `all-races-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function downloadCSVFile(extractedData) {
    const data = convertToHorizontalTableData(extractedData);
    const wb = createHorizontalWorkbook(data, 'Race Data');
    const filename = `race-data-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ============================================================================
// Clipboard Functions
// ============================================================================

function needsTextFormatting(value) {
    if (!value) return false;
    const str = String(value);
    
    if (str.includes(':')) return true;
    if (str.startsWith('=')) return true;
    if (/^\+\d+$/.test(str)) return true;
    if (/^0\d+$/.test(str) && str.length > 1) return true;
    if (/^\d+[eE][+-]?\d+$/.test(str)) return true;
    
    return false;
}

function convertDataToHTMLTable(data) {
    const escape = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    let html = '<table>';
    data.forEach(row => {
        html += '<tr>';
        row.forEach((cell, index) => {
            const style = (index === 1 && needsTextFormatting(cell)) ? ' style="mso-number-format:\'\\@\';"' : '';
            html += `<td${style}>${escape(cell)}</td>`;
        });
        html += '</tr>';
    });
    html += '</table>';
    
    return html;
}

function convertDataToTSV(data) {
    return data.map(row => row.join('\t')).join('\n');
}

function copyToClipboardMultiFormat(html, text) {
    const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
    });
    return navigator.clipboard.write([clipboardItem]);
}

function copyExcelSingleHorseToClipboard(extractedData, raceId, horseNumber) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) throw new Error(`Race ${raceId} not found`);
    
    const data = convertHorseToWorksheetData(race, horseNumber);
    return copyToClipboardMultiFormat(convertDataToHTMLTable(data), convertDataToTSV(data));
}

function copyExcelFullRaceToClipboard(extractedData, raceId) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) throw new Error(`Race ${raceId} not found`);
    
    const data = convertFullRaceToWorksheetData(race);
    return copyToClipboardMultiFormat(convertDataToHTMLTable(data), convertDataToTSV(data));
}

function copyExcelAllRacesToClipboard(extractedData) {
    const data = convertAllRacesToWorksheetData(extractedData);
    return copyToClipboardMultiFormat(convertDataToHTMLTable(data), convertDataToTSV(data));
}
