// UI interaction and display functions

let extractedData = null;
let raceChangeHandler = null;

function initializeUI() {
    const uploadSection = document.getElementById('uploadSection');
    const fileInput = document.getElementById('fileInput');

    // Click to upload
    uploadSection.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });

    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

function showStatus(message, type) {
    showToast(message, type);
}

function hideStatus() {
    // Legacy function - no longer needed with toasts
    // Keep for backwards compatibility but make it safe
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.style.display = 'none';
}

function showLoader() {
    document.getElementById('loader').style.display = 'block';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

async function handleFile(file) {
    // Accept any text-based file (HTML, TXT, etc.)
    // No file type restriction - we'll try to parse whatever is provided

    hideStatus();
    showLoader();
    document.getElementById('uploadSection').style.display = 'none';

    try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // Check if debug mode is enabled
        const debugMode = document.getElementById('debugMode').checked;
        
        extractedData = extractRaceData(doc, debugMode);
        
        if (extractedData.races.length === 0) {
            throw new Error('No race data found. Please ensure this is a valid race page HTML file.');
        }

        displayResults(extractedData);
        showStatus(`Successfully extracted ${extractedData.races.length} race(s) with ${extractedData.totalHorses} horse(s)`, 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        document.getElementById('uploadSection').style.display = 'block';
        console.error('Parsing error:', error);
    } finally {
        hideLoader();
    }
}

function displayResults(data) {
    // Build informative header with key metadata
    const firstRace = data.races[0];
    const track = firstRace?.metadata?.track || 'Unknown Track';
    const raceType = firstRace?.metadata?.raceType || '';
    
    // Extract date from raceId if available (format: YYYY-MM-DD_...)
    let dateStr = '';
    if (firstRace?.raceId) {
        const dateMatch = firstRace.raceId.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            dateStr = dateMatch[1];
        }
    }
    
    // Build compact header
    let statsHtml = `<strong>${data.gameType}</strong>`;
    if (dateStr) statsHtml += ` • ${dateStr}`;
    statsHtml += ` • ${track}`;
    if (raceType) statsHtml += ` • ${raceType}`;
    statsHtml += ` • ${data.races.length} race(s), ${data.totalHorses} horse(s)`;
    
    document.getElementById('stats').innerHTML = statsHtml;

    // Show preview (first 3 horses from first race)
    const previewData = {
        gameType: data.gameType,
        sampleRace: data.races[0] ? {
            ...data.races[0],
            horses: data.races[0].horses.slice(0, 3)
        } : null
    };
    document.getElementById('preview').textContent = JSON.stringify(previewData, null, 2);

    // Populate race and horse selectors for Excel export
    populateExcelSelectors(data);

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
}

function populateExcelSelectors(data) {
    const raceSelect = document.getElementById('excelRaceSelect');
    const raceSelectFull = document.getElementById('excelRaceSelectFull');
    const horseSelect = document.getElementById('excelHorseSelect');
    
    raceSelect.innerHTML = '<option value="">Select Race...</option>';
    raceSelectFull.innerHTML = '<option value="">Select Race...</option>';
    horseSelect.innerHTML = '<option value="">Select Horse...</option>';
    
    data.races.forEach(race => {
        const title = (race.metadata.title || race.raceId).replace(/,\s*$/, '');
        const track = race.metadata.track || 'Unknown Track';
        const displayText = `${title} - ${track}`;
        
        const option1 = document.createElement('option');
        option1.value = race.raceId;
        option1.textContent = displayText;
        raceSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = race.raceId;
        option2.textContent = displayText;
        raceSelectFull.appendChild(option2);
    });
    
    if (raceChangeHandler) {
        raceSelect.removeEventListener('change', raceChangeHandler);
    }
    
    raceChangeHandler = () => {
        const selectedRaceId = raceSelect.value;
        horseSelect.innerHTML = '<option value="">Select Horse...</option>';
        updateHorseButtonStates();
        
        if (selectedRaceId) {
            const race = data.races.find(r => r.raceId === selectedRaceId);
            if (race) {
                race.horses.forEach(horse => {
                    const option = document.createElement('option');
                    const horseNum = horse.startNumber || horse.horseNumber;
                    option.value = horseNum;
                    option.textContent = `#${horseNum} - ${horse.horseName || 'Unknown'}`;
                    horseSelect.appendChild(option);
                });
            }
        }
    };
    
    raceSelect.addEventListener('change', raceChangeHandler);
    horseSelect.addEventListener('change', updateHorseButtonStates);
    raceSelectFull.addEventListener('change', updateFullRaceButtonStates);
}

function updateHorseButtonStates() {
    const raceId = document.getElementById('excelRaceSelect').value;
    const horseNumber = document.getElementById('excelHorseSelect').value;
    const isValid = raceId && horseNumber;
    
    document.getElementById('btnCopyHorse').disabled = !isValid;
    document.getElementById('btnDownloadHorse').disabled = !isValid;
}

function updateFullRaceButtonStates() {
    const raceId = document.getElementById('excelRaceSelectFull').value;
    const isValid = !!raceId;
    
    document.getElementById('btnCopyFullRace').disabled = !isValid;
    document.getElementById('btnDownloadFullRace').disabled = !isValid;
}

function validateSelection(raceId, horseNumber = null) {
    if (horseNumber !== null && (!raceId || !horseNumber)) {
        showStatus('Please select both race and horse', 'error');
        return false;
    }
    if (horseNumber === null && !raceId) {
        showStatus('Please select a race', 'error');
        return false;
    }
    return true;
}

function handleAsyncCopy(copyPromise, successMessage) {
    copyPromise
        .then(() => showStatus(successMessage, 'success'))
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'error');
            console.error('Copy error:', error);
        });
}

function handleDownload(downloadFn, successMessage) {
    try {
        downloadFn();
        showStatus(successMessage, 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        console.error('Download error:', error);
    }
}

function reset() {
    extractedData = null;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('fileInput').value = '';
    hideStatus();
    
    // Reset all selectors and disable buttons
    const raceSelect = document.getElementById('excelRaceSelect');
    const raceSelectFull = document.getElementById('excelRaceSelectFull');
    const horseSelect = document.getElementById('excelHorseSelect');
    
    if (raceSelect) raceSelect.innerHTML = '<option value="">Select Race...</option>';
    if (raceSelectFull) raceSelectFull.innerHTML = '<option value="">Select Race...</option>';
    if (horseSelect) horseSelect.innerHTML = '<option value="">Select Horse...</option>';
    
    // Disable all export buttons
    const btnDownloadHorse = document.getElementById('btnDownloadHorse');
    const btnCopyHorse = document.getElementById('btnCopyHorse');
    const btnDownloadFullRace = document.getElementById('btnDownloadFullRace');
    const btnCopyFullRace = document.getElementById('btnCopyFullRace');
    
    if (btnDownloadHorse) btnDownloadHorse.disabled = true;
    if (btnCopyHorse) btnCopyHorse.disabled = true;
    if (btnDownloadFullRace) btnDownloadFullRace.disabled = true;
    if (btnCopyFullRace) btnCopyFullRace.disabled = true;
}

// Button handlers - these are called from HTML onclick attributes
function handleDownloadJSON() {
    downloadJSON(extractedData);
}

function handleDownloadCSV() {
    downloadCSVFile(extractedData);
}

function handleCopyToClipboard() {
    handleAsyncCopy(copyToClipboard(extractedData), 'JSON copied to clipboard!');
}

function handleCopyExcelFormat() {
    const raceId = document.getElementById('excelRaceSelect').value;
    const horseNumber = document.getElementById('excelHorseSelect').value;
    
    if (!validateSelection(raceId, horseNumber)) return;
    
    handleAsyncCopy(
        copyExcelSingleHorseToClipboard(extractedData, raceId, horseNumber),
        'Horse data copied to clipboard!'
    );
}

function handleDownloadExcelFormat() {
    const raceId = document.getElementById('excelRaceSelect').value;
    const horseNumber = document.getElementById('excelHorseSelect').value;
    
    if (!validateSelection(raceId, horseNumber)) return;
    
    handleDownload(
        () => downloadExcelSingleHorse(extractedData, raceId, horseNumber),
        'Horse data downloaded as .xlsx!'
    );
}

function handleCopyExcelFormatAll() {
    handleAsyncCopy(
        copyExcelAllRacesToClipboard(extractedData),
        'All races copied to clipboard!'
    );
}

function handleDownloadExcelFormatAll() {
    handleDownload(
        () => downloadExcelAllRaces(extractedData),
        'All races downloaded as .xlsx!'
    );
}

function handleCopyExcelFormatFullRace() {
    const raceId = document.getElementById('excelRaceSelectFull').value;
    
    if (!validateSelection(raceId)) return;
    
    handleAsyncCopy(
        copyExcelFullRaceToClipboard(extractedData, raceId),
        'Full race copied to clipboard!'
    );
}

function handleDownloadExcelFormatFullRace() {
    const raceId = document.getElementById('excelRaceSelectFull').value;
    
    if (!validateSelection(raceId)) return;
    
    handleDownload(
        () => downloadExcelFullRace(extractedData, raceId),
        'Full race downloaded as .xlsx!'
    );
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeUI);
