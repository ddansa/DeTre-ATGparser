// Export functions for JSON and CSV

function downloadJSON(extractedData) {
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-data-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadCSV(extractedData) {
    const csv = convertToCSV(extractedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-data-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    const rows = [];
    
    // Build comprehensive header
    const headerRow = [
        'Game Type', 'Race ID', 'Race Track', 'Race Distance', 'Race Type', 
        'Horse Number', 'Horse Name', 'Age/Sex', 'Driver',
        'Bet Distribution', 'Post Position', 'Home Track', 'Earnings Per Start',
        'Total Earnings', 'P-Odds', 'Place %', 'Record', 'Life Stats',
        'Current Year Stats', 'V-Odds'
    ];
    rows.push(headerRow);

    // Data rows
    data.races.forEach(race => {
        race.horses.forEach(horse => {
            rows.push([
                data.gameType,
                race.raceId,
                race.metadata.track || '',
                race.metadata.distance || '',
                race.metadata.raceType || '',
                horse.startNumber || '',
                horse.horseName || '',
                horse.ageAndSex || '',
                horse.driver || '',
                horse.betDistribution || '',
                horse.postPositionAndDistance || '',
                horse.homeTrack || '',
                horse.earningsPerStart || '',
                horse.earnings || '',
                horse.pOdds || '',
                horse.placePercent || '',
                horse.record || '',
                horse.lifeStats || '',
                horse.currentYearStats || '',
                horse.vOdds || ''
            ]);
        });
    });

    return rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
}

function copyToClipboard(extractedData) {
    const text = JSON.stringify(extractedData, null, 2);
    return navigator.clipboard.writeText(text);
}

function convertToExcelFormat(race, horseNumber) {
    // Custom Excel-friendly format for single horse in a race
    // Format: Two columns (Label | Value) for easy pasting into Excel
    // Previous starts are numbered from most recent: Date-5, Date-4, etc.
    
    const horse = race.horses.find(h => 
        h.startNumber === String(horseNumber)
    );
    
    if (!horse) {
        throw new Error(`Horse ${horseNumber} not found in race ${race.raceId}`);
    }
    
    const rows = [];
    
    // Output all horse fields in the order they appear, without filtering
    Object.keys(horse).forEach(key => {
        // Skip previousStarts (handled separately at the end)
        if (key === 'previousStarts') return;
        
        // Convert camelCase to Title Case for label
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const value = horse[key];
        
        // Include all fields, even empty ones
        rows.push([label, value !== undefined && value !== null ? value : '']);
    });
    
    // Race metadata
    rows.push(['', '']); // Separator
    rows.push(['--- RACE INFO ---', '']);
    rows.push(['Race Track', race.metadata.track || '']);
    rows.push(['Race Distance', race.metadata.distance || '']);
    rows.push(['Race Type', race.metadata.raceType || '']);
    rows.push(['Start Type', race.metadata.startType || '']);
    if (race.metadata.description) {
        rows.push(['Race Description', race.metadata.description]);
    }
    
    // Previous starts section
    if (horse.previousStarts && horse.previousStarts.length > 0) {
        rows.push(['', '']); // Empty row separator
        rows.push(['--- PREVIOUS STARTS ---', '']);
        
        // Number from most recent (5, 4, 3, 2, 1)
        const maxStarts = 5;
        const starts = horse.previousStarts.slice(0, maxStarts);
        
        starts.forEach((start, index) => {
            const startNum = maxStarts - index; // 5, 4, 3, 2, 1
            
            rows.push([`Date-${startNum}`, start.date || '']);
            rows.push([`Track-${startNum}`, start.track || '']);
            rows.push([`Driver-${startNum}`, start.driver || '']);
            rows.push([`Placement-${startNum}`, start.placement || '']);
            rows.push([`Distance-${startNum}`, start.distanceTrack || '']);
            rows.push([`KM-Time-${startNum}`, start.kmTime || '']);
            rows.push([`Shoes-${startNum}`, start.shoeInfo || '']);
            rows.push([`Odds-${startNum}`, start.odds || '']);
            rows.push([`Prize-${startNum}`, start.prize || '']);
            rows.push([`Wagon-${startNum}`, start.wagonType || '']);
            rows.push([`Comment-${startNum}`, start.comment || '']);
            
            if (index < starts.length - 1) {
                rows.push(['', '']); // Empty row between starts
            }
        });
    }
    
    // Convert to TSV (tab-separated) for Excel
    return rows.map(row => row.join('\t')).join('\n');
}

function downloadExcelFormat(extractedData, raceId, horseNumber) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) {
        throw new Error(`Race ${raceId} not found`);
    }
    
    const tsv = convertToExcelFormat(race, horseNumber);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horse-${horseNumber}-race-${raceId}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
}

function copyExcelFormatToClipboard(extractedData, raceId, horseNumber) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) {
        throw new Error(`Race ${raceId} not found`);
    }
    
    const tsv = convertToExcelFormat(race, horseNumber);
    return navigator.clipboard.writeText(tsv);
}

function convertToExcelFormatFullRace(race) {
    // Export all horses in a race, separated by blank rows
    const allHorsesData = [];
    
    race.horses.forEach((horse, index) => {
        const horseNum = horse.startNumber;
        const horseData = convertToExcelFormat(race, horseNum);
        allHorsesData.push(horseData);
        
        // Add separator between horses (except after last one)
        if (index < race.horses.length - 1) {
            allHorsesData.push('\n----------------------------------------\n');
        }
    });
    
    return allHorsesData.join('\n');
}

function convertToExcelFormatAll(extractedData) {
    // Export all races and all horses
    const allRacesData = [];
    
    extractedData.races.forEach((race, index) => {
        allRacesData.push(`-------- RACE ${race.raceId} - ${race.metadata.track || 'Unknown'} --------\n`);
        allRacesData.push(convertToExcelFormatFullRace(race));
        
        // Add separator between races (except after last one)
        if (index < extractedData.races.length - 1) {
            allRacesData.push('\n\n****************************************\n****************************************\n\n');
        }
    });
    
    return allRacesData.join('\n');
}

function downloadExcelFormatFullRace(extractedData, raceId) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) {
        throw new Error(`Race ${raceId} not found`);
    }
    
    const tsv = convertToExcelFormatFullRace(race);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-${raceId}-all-horses.tsv`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadExcelFormatAll(extractedData) {
    const tsv = convertToExcelFormatAll(extractedData);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-races-${extractedData.gameType}-${new Date().toISOString().split('T')[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
}

function copyExcelFormatFullRaceToClipboard(extractedData, raceId) {
    const race = extractedData.races.find(r => r.raceId === raceId);
    if (!race) {
        throw new Error(`Race ${raceId} not found`);
    }
    
    const tsv = convertToExcelFormatFullRace(race);
    return navigator.clipboard.writeText(tsv);
}

function copyExcelFormatAllToClipboard(extractedData) {
    const tsv = convertToExcelFormatAll(extractedData);
    return navigator.clipboard.writeText(tsv);
}
