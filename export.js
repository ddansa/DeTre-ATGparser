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
                horse.startNumber || horse.horseNumber || '',
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
