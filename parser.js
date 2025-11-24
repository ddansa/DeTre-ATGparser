// Main data extraction functions

function extractRaceData(doc, debugMode = false) {
    const races = [];
    let totalHorses = 0;

    // Find game container (e.g., V85-game, V4-game, etc.) with fallbacks
    const gameContainer = findElement(doc, SELECTORS.gameContainer);
    if (!gameContainer) {
        throw new Error('No game container found. Tried selectors: ' + 
            [SELECTORS.gameContainer.primary, ...SELECTORS.gameContainer.fallbacks].join(', '));
    }

    const gameType = (getAttribute(gameContainer, 'data-test-id') || 'UNKNOWN').replace('-game', '');

    // Find all race sections by data-race-id with fallbacks
    const raceSections = findElements(doc, SELECTORS.raceSections);
    
    if (raceSections.length === 0) {
        throw new Error('No races found. Tried selectors: ' + 
            [SELECTORS.raceSections.primary, ...SELECTORS.raceSections.fallbacks].join(', '));
    }

    raceSections.forEach((raceSection) => {
        const raceId = getAttribute(raceSection, 'data-race-id') || 
                       getAttribute(raceSection, 'id') || 
                       'unknown-race';
        
        // Extract race metadata from leg-header with fallbacks
        const legHeader = findElement(raceSection, SELECTORS.legHeader);
        const raceMetadata = extractRaceMetadata(legHeader);

        // Find the startlist table with fallbacks
        const startlistTable = findElement(raceSection, SELECTORS.startlistTable);
        if (!startlistTable) {
            console.warn(`No startlist table found for race ${raceId}`);
            return;
        }

        // Extract table headers
        const headers = extractTableHeaders(startlistTable);

        // Extract horses
        const horses = extractHorses(startlistTable, headers);
        totalHorses += horses.length;

        const raceData = {
            raceId: raceId,
            gameType: gameType,
            metadata: raceMetadata,
            horses: horses
        };

        // Only include headers in debug mode
        if (debugMode) {
            raceData.headers = headers;
        }

        races.push(raceData);
    });

    return {
        gameType: gameType,
        races: races,
        totalHorses: totalHorses,
        extractedAt: new Date().toISOString()
    };
}

function extractRaceMetadata(legHeader) {
    if (!legHeader) return {};

    const metadata = {};

    // Extract race title/number
    const title = legHeader.querySelector(SELECTORS.raceMetadata.title);
    if (title) metadata.title = title.textContent.trim();

    // Extract all text spans that contain race info
    const infoSpans = legHeader.querySelectorAll(SELECTORS.raceMetadata.bodySpans);
    const infoTexts = [];
    infoSpans.forEach(span => {
        const text = span.textContent.trim();
        if (text && text !== '•') {
            infoTexts.push(text);
        }
    });

    // Try to identify common fields
    infoTexts.forEach(text => {
        if (text.match(/^\d+\s*m$/i)) {
            metadata.distance = text;
        } else if (text.match(/trav|galopp/i)) {
            metadata.raceType = text;
        } else if (text.match(/autostart|voltstart/i)) {
            metadata.startType = text;
        } else if (!metadata.track && infoTexts.indexOf(text) === 0) {
            metadata.track = text;
        } else if (!metadata.description) {
            metadata.description = text;
        }
    });

    // Extract time
    const timeElement = legHeader.querySelector(SELECTORS.raceMetadata.timeToStart);
    if (timeElement) metadata.time = timeElement.textContent.trim();

    return metadata;
}

function extractTableHeaders(table) {
    const headers = [];
    const headerCells = findElements(table, SELECTORS.tableHeaders);
    
    headerCells.forEach((th, index) => {
        const labelElement = th.querySelector('[data-test-id*="tableCellHead"]');
        const exportType = getAttribute(th, SELECTORS.cells.exportType);
        
        headers.push({
            index: index,
            label: labelElement ? labelElement.textContent.trim() : th.textContent.trim(),
            exportType: exportType || `column_${index}`,
            testId: labelElement ? getAttribute(labelElement, 'data-test-id') : null
        });
    });

    return headers;
}

function extractHorses(table, headers) {
    const horses = [];
    const tbody = table.querySelector('tbody');
    if (!tbody) return horses;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    let i = 0;

    while (i < rows.length) {
        const row = rows[i];
        const testId = getAttribute(row, 'data-test-id');

        // Check if this is a main horse row (with pattern matching)
        const isHorseRow = testId && (
            testId.startsWith('horse-row-') || 
            testId.match(/horse.*row/i) ||
            row.classList.contains('horse-row')
        );
        
        if (isHorseRow) {
            const horseNumber = testId ? testId.replace(/^horse-row-/, '') : `horse_${i}`;
            
            // Extract main row data
            const horseData = extractRowData(row, headers);
            horseData.horseNumber = horseNumber;

            // Check if next row is additional-table-row (overflow data)
            if (i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextTestId = getAttribute(nextRow, 'data-test-id');
                
                // Check for additional row with multiple patterns
                const isAdditionalRow = nextTestId === 'additional-table-row' ||
                                       nextTestId?.includes('additional') ||
                                       nextRow.classList.contains('additional-row');
                
                if (isAdditionalRow) {
                    // Merge additional row data into main horse data (it's just overflow)
                    const additionalData = extractAdditionalRowData(nextRow);
                    Object.assign(horseData, additionalData);
                    i++; // Skip the additional row in next iteration
                }
            }

            // Check for extended row with previous starts (third row)
            if (i + 1 < rows.length) {
                const extendedRow = rows[i + 1];
                const extendedClass = extendedRow.className || '';
                
                // Check if this is an extended row with previous starts table
                if (extendedClass.includes('extendedStartRow')) {
                    const previousStarts = extractPreviousStarts(extendedRow);
                    if (previousStarts.length > 0) {
                        horseData.previousStarts = previousStarts;
                    }
                    i++; // Skip the extended row in next iteration
                }
            }

            horses.push(horseData);
        }

        i++;
    }

    return horses;
}

function extractRowData(row, headers) {
    const data = {};
    const cells = row.querySelectorAll('td');

    cells.forEach((cell, index) => {
        const header = headers[index] || { exportType: `column_${index}` };
        const exportId = cell.querySelector('[startlist-export-id]');
        
        // Extract text content, cleaning up whitespace and non-breaking spaces
        let text = cell.textContent.trim().replace(/\s+/g, ' ');
        
        // Try to get more specific data from test-id elements
        const testIdElement = cell.querySelector('[data-test-id^="startlist-cell-"]');
        if (testIdElement) {
            text = testIdElement.textContent.trim().replace(/\s+/g, ' ');
        }

        // Special handling for horse/driver cell - flatten into main data
        if (header.exportType === 'horse') {
            const horseInfo = extractHorseCell(cell);
            // Merge horse info directly into data (flatten structure)
            Object.assign(data, horseInfo);
        } 
        // Special handling for stats fields (lifeStats, currentYearStats)
        else if (header.exportType === 'lifeStats' || header.exportType === 'currentYearStats') {
            data[header.exportType] = extractStatsData(cell);
        } 
        else {
            data[header.exportType] = text;
        }
    });

    return data;
}

function extractHorseCell(cell) {
    const horseData = {};

    // Horse number (from button attribute)
    const numberButton = cell.querySelector(SELECTORS.cells.horseCell.startNumber);
    if (numberButton) {
        horseData.startNumber = getAttribute(numberButton, 'data-start-number');
    }

    // Horse name (clean up - remove the number prefix if present)
    const nameElement = cell.querySelector(SELECTORS.cells.horseCell.horseName);
    if (nameElement) {
        let name = nameElement.textContent.trim();
        // Remove leading number and whitespace (e.g., "1 Nephtys Boko" -> "Nephtys Boko")
        name = name.replace(/^\d+\s+/, '');
        horseData.horseName = name;
    }

    // Age and sex
    const ageElement = cell.querySelector(SELECTORS.cells.horseCell.ageAndSex);
    if (ageElement) {
        horseData.ageAndSex = ageElement.textContent.trim();
    }

    // Driver
    const driverElement = cell.querySelector(SELECTORS.cells.horseCell.driver);
    if (driverElement) {
        horseData.driver = driverElement.textContent.trim();
    }

    return horseData;
}

function extractStatsData(cell) {
    // Stats are structured as: <span class="stats">TOTAL</span>WINS-PLACE-SHOW
    // Example: <span class="horse-r0xqjm-tableCells-styles--stats">31</span>10-7-2
    
    const statsElement = cell.querySelector(SELECTORS.cells.statsCell.primary);
    if (!statsElement) {
        return cell.textContent.trim().replace(/\s+/g, ' ');
    }

    // Find the total count in the special span
    const totalSpan = statsElement.querySelector(SELECTORS.cells.statsCell.statsSpan);
    const total = totalSpan ? totalSpan.textContent.trim() : '';

    // Get the placement stats (everything after the total span)
    let placementText = statsElement.textContent.trim();
    if (total) {
        // Remove the total from the beginning to get just the placement stats
        placementText = placementText.replace(total, '').trim();
    }

    // Return formatted as "TOTAL WINS-PLACE-SHOW"
    if (total && placementText) {
        return `${total} ${placementText}`;
    }
    
    return placementText || total || '';
}

function extractAdditionalRowData(row) {
    const data = {};
    
    // Find all detail columns with fallback
    let columns = row.querySelectorAll(SELECTORS.additionalDetails.columns);
    if (columns.length === 0) {
        columns = row.querySelectorAll(SELECTORS.additionalDetails.columnsFallback);
    }
    
    columns.forEach(column => {
        // Get the header (label)
        const header = column.querySelector(SELECTORS.additionalDetails.header);
        const headerText = header ? header.textContent.trim().replace(':', '') : null;
        
        // Get the value container
        const valueContainer = column.querySelector(SELECTORS.additionalDetails.text);
        
        // Get export type if available
        const exportType = header ? getAttribute(header, SELECTORS.cells.exportType) : null;
        
        // Special handling for stats fields (currentYearStats, previousYearStats)
        let value;
        if (exportType === 'currentYearStats' || exportType === 'previousYearStats') {
            value = valueContainer ? extractStatsData(valueContainer) : '';
        } 
        // Special handling for shoe info (SVG icons)
        else if (exportType === 'shoeInfo') {
            value = valueContainer ? extractShoeInfo(valueContainer) : '';
        } 
        else {
            value = valueContainer ? valueContainer.textContent.trim().replace(/\s+/g, ' ') : '';
        }
        
        if (exportType) {
            data[exportType] = value;
        } else if (headerText) {
            // Fallback to using header text as key
            const key = headerText.toLowerCase().replace(/[^a-z0-9]/g, '_');
            data[key] = value;
        }
    });

    return data;
}

function extractShoeInfo(container) {
    // Shoe info is represented by SVG icons
    // ShoeOnFilledIcon = C (shoe on)
    // ShoeOffFilledIcon = Ȼ (shoe off/barfoot)
    
    const svgs = container.querySelectorAll('svg[data-test-id*="Shoe"]');
    if (svgs.length === 0) return '';
    
    const shoeSymbols = [];
    svgs.forEach(svg => {
        const testId = getAttribute(svg, 'data-test-id');
        if (testId === 'ShoeOnFilledIcon') {
            shoeSymbols.push('C');  // Shoe on
        } else if (testId === 'ShoeOffFilledIcon') {
            shoeSymbols.push('Ȼ');  // Shoe off (barfoot)
        }
    });
    
    return shoeSymbols.join('');
}

function extractPreviousStarts(extendedRow) {
    // Find the previous starts table inside the extended row
    const previousStartsTable = extendedRow.querySelector('table[class*="CompactPreviousStartsTable"]');
    if (!previousStartsTable) return [];
    
    const previousStarts = [];
    const tbody = previousStartsTable.querySelector('tbody');
    if (!tbody) return [];
    
    // Detect if this is expanded or compact view by checking headers
    const thead = previousStartsTable.querySelector('thead');
    const isExpandedView = thead && thead.querySelector('[data-test-id="table-header-track"]') !== null;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    let i = 0;
    
    while (i < rows.length) {
        const row = rows[i];
        const rowClass = row.className || '';
        
        // Main data row (contains the race result)
        // Must have tableRowBody but NOT MoreInfoArea or RaceComments
        const isMainRow = rowClass.includes('tableRowBody') && 
                         !rowClass.includes('MoreInfoArea') && 
                         !rowClass.includes('RaceComments');
        
        if (isMainRow) {
            const start = {};
            const cells = row.querySelectorAll('td');
            
            if (isExpandedView) {
                // Expanded view: DATUM, BANA, KUSK/RYTTARE, PLAC., DISTANS:SPÅR, KM-TID, SKOR, ODDS, PRIS, VAGN, ANM, VIDEO, LOPPKOMMENTAR
                if (cells.length >= 10) {
                    // Date
                    const dateLink = cells[0].querySelector('a');
                    let dateText = dateLink ? dateLink.textContent.trim() : cells[0].textContent.trim();
                    start.date = normalizeDateFormat(dateText);
                    start.raceLink = dateLink ? dateLink.getAttribute('href') : null;
                    
                    // Track (BANA)
                    start.track = cells[1].textContent.trim();
                    
                    // Driver (KUSK/RYTTARE)
                    start.driver = cells[2].textContent.trim();
                    
                    // Placement (PLAC.)
                    start.placement = cells[3].textContent.trim();
                    
                    // Distance : Track (DISTANS:SPÅR)
                    start.distanceTrack = cells[4].textContent.trim();
                    
                    // KM-Time
                    start.kmTime = cells[5].textContent.trim();
                    
                    // Shoe info (SKOR - SVGs)
                    start.shoeInfo = extractShoeInfo(cells[6]);
                    
                    // Odds
                    start.odds = cells[7].textContent.trim();
                    
                    // Prize (PRIS)
                    start.prize = cells[8].textContent.trim();
                    
                    // Wagon type (VAGN)
                    const wagonText = cells[9].textContent.trim();
                    start.wagonType = wagonText.replace(/^Vagn:/, '').trim();
                    
                    // ANM (remarks) - cell 10 (optional)
                    // VIDEO - cell 11 (skip)
                    
                    // Comment (LOPPKOMMENTAR) - cell 12
                    if (cells.length >= 13) {
                        const commentText = cells[12].textContent.trim();
                        if (commentText) {
                            start.comment = commentText;
                        }
                    }
                }
            } else {
                // Compact view: DATUM, PLAC., DIST:SPÅR, KM-TID, SKOR, ODDS, PRIS
                if (cells.length >= 7) {
                    // Date
                    const dateLink = cells[0].querySelector('a');
                    let dateText = dateLink ? dateLink.textContent.trim() : cells[0].textContent.trim();
                    start.date = normalizeDateFormat(dateText);
                    start.raceLink = dateLink ? dateLink.getAttribute('href') : null;
                    
                    // Placement
                    start.placement = cells[1].textContent.trim();
                    
                    // Distance : Track
                    start.distanceTrack = cells[2].textContent.trim();
                    
                    // KM-Time
                    start.kmTime = cells[3].textContent.trim();
                    
                    // Shoe info (SVGs)
                    start.shoeInfo = extractShoeInfo(cells[4]);
                    
                    // Odds
                    start.odds = cells[5].textContent.trim();
                    
                    // Prize
                    start.prize = cells[6].textContent.trim();
                }
            }
            
            // In compact view, check for additional info row (MoreInfoArea)
            // In expanded view, track/driver/wagon are already in main row
            if (!isExpandedView && i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextClass = nextRow.className || '';
                
                if (nextClass.includes('MoreInfoArea')) {
                    const moreInfo = extractPreviousStartMoreInfo(nextRow);
                    Object.assign(start, moreInfo);
                    i++; // Skip this row
                }
            }
            
            // Check for race comments row (both views can have this)
            // In expanded view, comment might be in same row (already extracted) or separate row
            if (!start.comment && i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextClass = nextRow.className || '';
                
                if (nextClass.includes('RaceComments')) {
                    const commentCell = nextRow.querySelector('td');
                    if (commentCell) {
                        const commentDiv = commentCell.querySelector('[class*="RaceCommentCell"]');
                        start.comment = commentDiv ? commentDiv.textContent.trim() : commentCell.textContent.trim();
                    }
                    i++; // Skip this row
                }
            }
            
            previousStarts.push(start);
        }
        
        i++;
    }
    
    return previousStarts;
}

function extractPreviousStartMoreInfo(row) {
    const info = {};
    const cell = row.querySelector('td');
    if (!cell) return info;
    
    const detailsArea = cell.querySelector('[class*="moreDetailsArea"]');
    if (!detailsArea) return info;
    
    // Extract track, driver, and wagon type
    const items = detailsArea.querySelectorAll('[class*="moreDetailsItem"]');
    items.forEach((item, index) => {
        const text = item.textContent.trim();
        if (index === 0) {
            info.track = text; // e.g., "Bollnäs-2"
        } else if (index === 1) {
            info.driver = text; // e.g., "Kevin Svedlund"
        } else if (text.startsWith('Vagn:')) {
            info.wagonType = text.replace('Vagn:', '').trim(); // e.g., "Am" or "Va"
        }
    });
    
    return info;
}

function normalizeDateFormat(dateStr) {
    // Normalize date formats to YYYY-MM-DD
    // Input can be:
    // - "251117" (YYMMDD format)
    // - "2025-11-17" (already normalized)
    // - "250814" (YYMMDD format)
    
    if (!dateStr) return '';
    
    // If already in YYYY-MM-DD format, return as-is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }
    
    // If in YYMMDD format (6 digits)
    if (dateStr.match(/^\d{6}$/)) {
        const year = '20' + dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const day = dateStr.substring(4, 6);
        return `${year}-${month}-${day}`;
    }
    
    // Return as-is if format is unknown
    return dateStr;
}
