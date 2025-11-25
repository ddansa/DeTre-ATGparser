// UI interaction and display functions

let extractedData = null;

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

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

function hideStatus() {
    document.getElementById('status').style.display = 'none';
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
    // Show stats
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-value">${data.gameType}</div>
            <div class="stat-label">Game Type</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.races.length}</div>
            <div class="stat-label">Races</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.totalHorses}</div>
            <div class="stat-label">Total Horses</div>
        </div>
    `;
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
    
    // Clear existing options
    raceSelect.innerHTML = '<option value="">Select Race...</option>';
    raceSelectFull.innerHTML = '<option value="">Select Race...</option>';
    horseSelect.innerHTML = '<option value="">Select Horse...</option>';
    
    // Populate both race selectors
    data.races.forEach(race => {
        // For single horse selector
        const option1 = document.createElement('option');
        option1.value = race.raceId;
        option1.textContent = `Race ${race.raceId} - ${race.metadata.track || 'Unknown Track'}`;
        raceSelect.appendChild(option1);
        
        // For full race selector
        const option2 = document.createElement('option');
        option2.value = race.raceId;
        option2.textContent = `Race ${race.raceId} - ${race.metadata.track || 'Unknown Track'}`;
        raceSelectFull.appendChild(option2);
    });
    
    // Update horses when race is selected (for single horse export)
    raceSelect.addEventListener('change', function() {
        const selectedRaceId = this.value;
        horseSelect.innerHTML = '<option value="">Select Horse...</option>';
        
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
    });
}

function reset() {
    extractedData = null;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('fileInput').value = '';
    hideStatus();
}

// Button handlers - these are called from HTML onclick attributes
function handleDownloadJSON() {
    downloadJSON(extractedData);
}

function handleDownloadCSV() {
    downloadCSV(extractedData);
}

function handleCopyToClipboard() {
    copyToClipboard(extractedData).then(() => {
        showStatus('JSON copied to clipboard!', 'success');
        setTimeout(hideStatus, 3000);
    }).catch(err => {
        showStatus('Failed to copy to clipboard', 'error');
    });
}

function handleCopyExcelFormat() {
    const raceId = document.getElementById('excelRaceSelect').value;
    const horseNumber = document.getElementById('excelHorseSelect').value;
    
    if (!raceId || !horseNumber) {
        showStatus('Please select both race and horse', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }
    
    try {
        copyExcelFormatToClipboard(extractedData, raceId, horseNumber).then(() => {
            showStatus('Excel format copied to clipboard! Ready to paste into Excel.', 'success');
            setTimeout(hideStatus, 3000);
        }).catch(err => {
            showStatus('Failed to copy to clipboard: ' + err.message, 'error');
            setTimeout(hideStatus, 3000);
        });
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

function handleDownloadExcelFormat() {
    const raceId = document.getElementById('excelRaceSelect').value;
    const horseNumber = document.getElementById('excelHorseSelect').value;
    
    if (!raceId || !horseNumber) {
        showStatus('Please select both race and horse', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }
    
    try {
        downloadExcelFormat(extractedData, raceId, horseNumber);
        showStatus('Excel format downloaded!', 'success');
        setTimeout(hideStatus, 3000);
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

function handleCopyExcelFormatAll() {
    try {
        copyExcelFormatAllToClipboard(extractedData).then(() => {
            showStatus('All races copied to clipboard! Ready to paste into Excel.', 'success');
            setTimeout(hideStatus, 3000);
        }).catch(err => {
            showStatus('Failed to copy to clipboard: ' + err.message, 'error');
            setTimeout(hideStatus, 3000);
        });
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

function handleDownloadExcelFormatAll() {
    try {
        downloadExcelFormatAll(extractedData);
        showStatus('All races downloaded!', 'success');
        setTimeout(hideStatus, 3000);
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

function handleCopyExcelFormatFullRace() {
    const raceId = document.getElementById('excelRaceSelectFull').value;
    
    if (!raceId) {
        showStatus('Please select a race', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }
    
    try {
        copyExcelFormatFullRaceToClipboard(extractedData, raceId).then(() => {
            showStatus('Full race copied to clipboard! Ready to paste into Excel.', 'success');
            setTimeout(hideStatus, 3000);
        }).catch(err => {
            showStatus('Failed to copy to clipboard: ' + err.message, 'error');
            setTimeout(hideStatus, 3000);
        });
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

function handleDownloadExcelFormatFullRace() {
    const raceId = document.getElementById('excelRaceSelectFull').value;
    
    if (!raceId) {
        showStatus('Please select a race', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }
    
    try {
        downloadExcelFormatFullRace(extractedData, raceId);
        showStatus('Full race downloaded!', 'success');
        setTimeout(hideStatus, 3000);
    } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeUI);
