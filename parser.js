// Main data extraction functions
// Uses constants from constants.js to avoid magic strings and numbers

function extractRaceData(doc, debugMode = false) {
    const races = [];
    let totalHorses = 0;

    // Find game container (e.g., V85-game, V4-game, etc.) with fallbacks
    const gameContainer = findElement(doc, SELECTORS.gameContainer);
    if (!gameContainer) {
        throw new Error(ERROR_MESSAGES.NO_GAME_CONTAINER + 
            [SELECTORS.gameContainer.primary, ...SELECTORS.gameContainer.fallbacks].join(', '));
    }

    const gameType = (getAttribute(gameContainer, ATTRIBUTES.DATA_TEST_ID) || GAME_PATTERNS.UNKNOWN).replace(GAME_PATTERNS.SUFFIX, '');

    // Find all race sections by data-race-id with fallbacks
    const raceSections = findElements(doc, SELECTORS.raceSections);
    
    if (raceSections.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_RACES + 
            [SELECTORS.raceSections.primary, ...SELECTORS.raceSections.fallbacks].join(', '));
    }

    raceSections.forEach((raceSection) => {
        const raceId = getAttribute(raceSection, ATTRIBUTES.DATA_RACE_ID) || 
                       getAttribute(raceSection, ATTRIBUTES.ID) || 
                       FALLBACKS.UNKNOWN_RACE;
        
        // Extract race metadata from leg-header with fallbacks
        const legHeader = findElement(raceSection, SELECTORS.legHeader);
        const raceMetadata = extractRaceMetadata(legHeader);

        // Find the startlist table with fallbacks
        const startlistTable = findElement(raceSection, SELECTORS.startlistTable);
        if (!startlistTable) {
            console.warn(ERROR_MESSAGES.NO_STARTLIST_TABLE + raceId);
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
        if (text && text !== METADATA_PATTERNS.BULLET) {
            infoTexts.push(text);
        }
    });

    // Try to identify common fields
    const unmatchedTexts = [];
    infoTexts.forEach((text, index) => {
        if (text.match(METADATA_PATTERNS.DISTANCE)) {
            metadata.distance = text;
        } else if (text.match(METADATA_PATTERNS.RACE_TYPE)) {
            // Only match if it's exactly "Trav", "Galopp", or "Monté", not part of a longer string
            metadata.raceType = text;
        } else if (text.match(METADATA_PATTERNS.START_TYPE)) {
            metadata.startType = text;
        } else if (!metadata.track && index === 0) {
            // First item is usually the track
            metadata.track = text;
        } else if (text.match(METADATA_PATTERNS.TRACK_CONDITION)) {
            // Track condition (e.g., "Lätt bana", "Tung bana")
            metadata.trackCondition = text;
        } else {
            // Collect unmatched texts for description
            unmatchedTexts.push(text);
        }
    });
    
    // Join remaining texts as description (e.g., race series info)
    if (unmatchedTexts.length > 0) {
        metadata.description = unmatchedTexts.join(' - ');
    }

    // Extract time
    const timeElement = legHeader.querySelector(SELECTORS.raceMetadata.timeToStart);
    if (timeElement) metadata.time = timeElement.textContent.trim();

    return metadata;
}

function extractTableHeaders(table) {
    const headers = [];
    const headerCells = findElements(table, SELECTORS.tableHeaders);
    
    headerCells.forEach((th, index) => {
        const labelElement = th.querySelector(`[${ATTRIBUTES.DATA_TEST_ID}*="${CELL_PATTERNS.TABLE_CELL_HEAD}"]`);
        const exportType = getAttribute(th, SELECTORS.cells.exportType);
        
        headers.push({
            index: index,
            label: labelElement ? labelElement.textContent.trim() : th.textContent.trim(),
            exportType: exportType || `${FALLBACKS.COLUMN_PREFIX}${index}`,
            testId: labelElement ? getAttribute(labelElement, ATTRIBUTES.DATA_TEST_ID) : null
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
        const testId = getAttribute(row, ATTRIBUTES.DATA_TEST_ID);

        // Check if this is a main horse row (with pattern matching)
        const isHorseRow = testId && (
            testId.startsWith(ROW_PATTERNS.HORSE_ROW_PREFIX) || 
            testId.match(ROW_PATTERNS.HORSE_ROW_MATCH) ||
            row.classList.contains('horse-row')
        );
        
        if (isHorseRow) {
            // Extract main row data
            const horseData = extractRowData(row, headers);
            
            // Ensure startNumber is set (fallback to row ID if button not found)
            if (!horseData.startNumber) {
                horseData.startNumber = testId ? testId.replace(new RegExp(`^${ROW_PATTERNS.HORSE_ROW_PREFIX}`), '') : `${FALLBACKS.HORSE_PREFIX}${i}`;
            }

            // Check if next row is additional-table-row (overflow data)
            if (i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextTestId = getAttribute(nextRow, ATTRIBUTES.DATA_TEST_ID);
                
                // Check for additional row with multiple patterns
                const isAdditionalRow = nextTestId === ROW_PATTERNS.ADDITIONAL_ROW ||
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
                if (extendedClass.includes(ROW_PATTERNS.EXTENDED_ROW_CLASS)) {
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
        const header = headers[index] || { exportType: `${FALLBACKS.COLUMN_PREFIX}${index}` };
        
        // Extract text content, cleaning up whitespace and non-breaking spaces
        let text = cell.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
        
        // Try to get more specific data from test-id elements
        const testIdElement = cell.querySelector(`[${ATTRIBUTES.DATA_TEST_ID}^="${CELL_PATTERNS.TEST_ID_PREFIX}"]`);
        if (testIdElement) {
            text = testIdElement.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
        }

        // Special handling for horse/driver cell - flatten into main data
        if (header.exportType === EXPORT_TYPES.HORSE) {
            const horseInfo = extractHorseCell(cell);
            // Merge horse info directly into data (flatten structure)
            Object.assign(data, horseInfo);
        } 
        // Special handling for stats fields (lifeStats, currentYearStats)
        else if (header.exportType === EXPORT_TYPES.LIFE_STATS || header.exportType === EXPORT_TYPES.CURRENT_YEAR_STATS) {
            data[header.exportType] = extractStatsData(cell);
        }
        // Special handling for shoe info (SVG icons)
        else if (header.exportType === EXPORT_TYPES.SHOE_INFO) {
            data[header.exportType] = extractShoeInfo(cell);
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
        horseData.startNumber = getAttribute(numberButton, ATTRIBUTES.DATA_START_NUMBER);
    }

    // Horse name (clean up - remove the number prefix if present)
    const nameElement = cell.querySelector(SELECTORS.cells.horseCell.horseName);
    if (nameElement) {
        let name = nameElement.textContent.trim();
        // Remove leading number and whitespace (e.g., "1 Nephtys Boko" -> "Nephtys Boko")
        name = name.replace(TEXT_PATTERNS.LEADING_NUMBER, '');
        horseData.horseName = name;
    }

    // Age and sex
    const ageElement = cell.querySelector(SELECTORS.cells.horseCell.ageAndSex);
    if (ageElement) {
        horseData.ageAndSex = ageElement.textContent.trim();
    }

    // Driver and trainer
    const driverElement = cell.querySelector(SELECTORS.cells.horseCell.driver);
    if (driverElement) {
        // Check for trainer abbreviation in parentheses (e.g., "Dwight Pieters (Flo Co)")
        const trainerShortElement = driverElement.querySelector('[class*="trainerShortName"]');
        
        if (trainerShortElement) {
            // Extract trainer abbreviation and remove from driver name
            const trainerShort = trainerShortElement.textContent.trim();
            horseData.trainer = trainerShort.replace(/[()]/g, '').trim(); // Remove parentheses, store as trainer
            
            // Get driver name without trainer abbreviation
            const driverNameElement = driverElement.querySelector('[class*="driverName"]');
            horseData.driver = driverNameElement ? driverNameElement.textContent.trim() : driverElement.textContent.replace(trainerShort, '').trim();
        } else {
            horseData.driver = driverElement.textContent.trim();
        }
    }

    // Trainer full name (if present in main row - when "full trainer name" is ticked instead of abbreviation)
    const trainerElement = cell.querySelector(SELECTORS.cells.horseCell.trainer);
    if (trainerElement) {
        horseData.trainer = trainerElement.textContent.trim();
    }

    return horseData;
}

function extractStatsData(cell) {
    // Stats are structured as: <span class="stats">TOTAL</span>WINS-PLACE-SHOW
    // Example: <span class="horse-r0xqjm-tableCells-styles--stats">31</span>10-7-2
    
    const statsElement = cell.querySelector(SELECTORS.cells.statsCell.primary);
    if (!statsElement) {
        return cell.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
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
        if (exportType === EXPORT_TYPES.CURRENT_YEAR_STATS || exportType === EXPORT_TYPES.PREVIOUS_YEAR_STATS) {
            value = valueContainer ? extractStatsData(valueContainer) : '';
        } 
        // Special handling for shoe info (SVG icons)
        else if (exportType === EXPORT_TYPES.SHOE_INFO) {
            value = valueContainer ? extractShoeInfo(valueContainer) : '';
        } 
        else {
            value = valueContainer ? valueContainer.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ') : '';
        }
        
        if (exportType) {
            data[exportType] = value;
        } else if (headerText) {
            // Fallback to using header text as key
            const key = headerText.toLowerCase().replace(TEXT_PATTERNS.NON_ALPHANUMERIC, '_');
            data[key] = value;
        }
    });

    return data;
}

function extractShoeInfo(container) {
    // Shoe info is represented by SVG icons or dashes for no info
    // ShoeOnFilledIcon = C (shoe on)
    // ShoeOffFilledIcon = Ȼ (shoe off/barfoot)
    // shoeCellNoInfo = - (no information)
    
    if (!container) return '';
    
    // Check for no-info case first (dashes)
    const noInfoElements = container.querySelectorAll('[class*="shoeCellNoInfo"]');
    if (noInfoElements.length > 0) {
        // Return dashes for no info (e.g., "--" for front and back)
        return Array.from(noInfoElements).map(() => '-').join('');
    }
    
    // Otherwise, look for SVG icons - try multiple selectors
    let svgs = container.querySelectorAll('svg[data-test-id*="Shoe"]');
    
    // If not found, try looking for the span with data-test-id first
    if (svgs.length === 0) {
        const shoeSpan = container.querySelector('[data-test-id="startlist-cell-shoe"]');
        if (shoeSpan) {
            svgs = shoeSpan.querySelectorAll('svg[data-test-id*="Shoe"]');
        }
    }
    
    if (svgs.length === 0) return '';
    
    const shoeSymbols = [];
    svgs.forEach(svg => {
        const testId = svg.getAttribute('data-test-id');
        if (testId === SHOE_SYMBOLS.ON_ICON_ID) {
            shoeSymbols.push(SHOE_SYMBOLS.ON);  // Shoe on
        } else if (testId === SHOE_SYMBOLS.OFF_ICON_ID) {
            shoeSymbols.push(SHOE_SYMBOLS.OFF);  // Shoe off (barfoot)
        }
    });
    
    return shoeSymbols.join('');
}

function detectPreviousStartsColumns(thead) {
    // Detect column positions dynamically from table headers
    // Returns a map of field names to column indices
    // This makes the parser resilient to ATG adding/removing/reordering columns
    const columnMap = {
        isExpanded: false
    };
    
    if (!thead) return columnMap;
    
    const headers = thead.querySelectorAll('th');
    headers.forEach((th, index) => {
        // Look for data-test-id in header spans
        let fieldDetected = false;
        const testIdElement = th.querySelector(`[${ATTRIBUTES.DATA_TEST_ID}^="${PREVIOUS_STARTS_HEADERS.PREFIX}"]`);
        if (testIdElement) {
            const testId = testIdElement.getAttribute(ATTRIBUTES.DATA_TEST_ID);
            // Extract field name: "table-header-track" -> "track"
            const fieldName = testId.replace(PREVIOUS_STARTS_HEADERS.PREFIX, '');
            
            // Only trust the test-id if it's not the buggy "distance" for everything
            if (fieldName && fieldName !== 'distance') {
                columnMap[fieldName] = index;
                fieldDetected = true;
                
                // If we find "track" header, it's expanded view
                if (fieldName === PREVIOUS_STARTS_HEADERS.TRACK_FIELD) {
                    columnMap.isExpanded = true;
                }
            }
        }
        
        // Fallback: If test-id wasn't reliable, use text content
        // This handles compact view where ATG has buggy test-ids
        if (!fieldDetected) {
            const headerText = th.textContent.trim().toUpperCase();
        if (headerText.includes('DATUM') || headerText.includes('DATE')) {
            columnMap.date = index;
        } else if (headerText.includes('PLAC')) {
            columnMap.place = index;
        } else if (headerText.includes('DIST') && headerText.includes('SPÅR')) {
            columnMap.distance = index;
        } else if (headerText.includes('KM-TID') || headerText.includes('KMTIME')) {
            columnMap.kmTime = index;
        } else if (headerText.includes('SKOR') || headerText.includes('SHOE')) {
            columnMap.shoes = index;
        } else if (headerText.includes('ODDS')) {
            columnMap.odds = index;
        } else if (headerText.includes('PRIS') || headerText.includes('PRIZE')) {
            columnMap.firstPrize = index;
        } else if (headerText.includes('BANA') || headerText.includes('TRACK')) {
            columnMap.track = index;
            columnMap.isExpanded = true; // Track column means expanded view
        } else if (headerText.includes('KUSK') || headerText.includes('RYTTARE') || headerText.includes('DRIVER')) {
            columnMap.driver = index;
        } else if (headerText.includes('VAGN') || headerText.includes('SULKY')) {
            columnMap.sulky = index;
        }
        }
    });
    
    return columnMap;
}

function extractPreviousStartField(cells, columnMap, fieldName, extractor = null) {
    // Helper to extract a field from cells using columnMap
    // extractor is an optional function to process the cell value
    if (columnMap[fieldName] === undefined || !cells[columnMap[fieldName]]) {
        return null;
    }
    
    const cell = cells[columnMap[fieldName]];
    if (extractor) {
        return extractor(cell);
    }
    return cell.textContent.trim();
}

function extractPreviousStarts(extendedRow) {
    // Find the previous starts table inside the extended row
    const previousStartsTable = extendedRow.querySelector(`table[class*="${CSS_PATTERNS.COMPACT_PREVIOUS_STARTS}"]`);
    if (!previousStartsTable) return [];
    
    const previousStarts = [];
    const tbody = previousStartsTable.querySelector('tbody');
    if (!tbody) return [];
    
    // Detect column positions from headers
    const thead = previousStartsTable.querySelector('thead');
    const columnMap = detectPreviousStartsColumns(thead);
    const isExpandedView = columnMap.isExpanded;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    let i = 0;
    
    while (i < rows.length) {
        const row = rows[i];
        const rowClass = row.className || '';
        
        // Main data row (contains the race result)
        // Must have tableRowBody but NOT MoreInfoArea or RaceComments
        const isMainRow = rowClass.includes(ROW_PATTERNS.TABLE_ROW_BODY) && 
                         !rowClass.includes(ROW_PATTERNS.MORE_INFO_AREA) && 
                         !rowClass.includes(ROW_PATTERNS.RACE_COMMENTS);
        
        if (isMainRow) {
            const start = {};
            const cells = row.querySelectorAll('td');
            
            // Extract common fields (works for both views)
            // Date with link
            if (columnMap.date !== undefined && cells[columnMap.date]) {
                const dateCell = cells[columnMap.date];
                const dateLink = dateCell.querySelector('a');
                let dateText = dateLink ? dateLink.textContent.trim() : dateCell.textContent.trim();
                start.date = normalizeDateFormat(dateText);
                start.raceLink = dateLink ? dateLink.getAttribute(ATTRIBUTES.HREF) : null;
            } else if (!isExpandedView && cells[0]) {
                // Compact view: date is always first column
                const dateLink = cells[0].querySelector('a');
                let dateText = dateLink ? dateLink.textContent.trim() : cells[0].textContent.trim();
                start.date = normalizeDateFormat(dateText);
                start.raceLink = dateLink ? dateLink.getAttribute(ATTRIBUTES.HREF) : null;
            }
            
            // Extract fields using helper (reduces duplication)
            const track = extractPreviousStartField(cells, columnMap, 'track');
            if (track) start.track = track;
            
            const driver = extractPreviousStartField(cells, columnMap, 'driver');
            if (driver) start.driver = driver;
            
            const placement = extractPreviousStartField(cells, columnMap, 'place');
            if (placement) start.placement = placement;
            
            const distanceTrack = extractPreviousStartField(cells, columnMap, 'distance');
            if (distanceTrack) start.distanceTrack = distanceTrack;
            
            const kmTime = extractPreviousStartField(cells, columnMap, 'kmTime');
            if (kmTime) start.kmTime = kmTime;
            
            const shoeInfo = extractPreviousStartField(cells, columnMap, 'shoes', extractShoeInfo);
            if (shoeInfo) start.shoeInfo = shoeInfo;
            
            const odds = extractPreviousStartField(cells, columnMap, 'odds');
            if (odds) start.odds = odds;
            
            const prize = extractPreviousStartField(cells, columnMap, 'firstPrize');
            if (prize) start.prize = prize;
            
            // Wagon type (needs special processing)
            const wagon = extractPreviousStartField(cells, columnMap, 'sulky');
            if (wagon) {
                start.wagonType = wagon.replace(TEXT_PATTERNS.WAGON_PREFIX, '').trim();
            }
            
            if (isExpandedView) {
                // Comment (last column in expanded view)
                const commentIndex = cells.length - 1;
                if (commentIndex >= 0 && cells[commentIndex]) {
                    const commentText = cells[commentIndex].textContent.trim();
                    // Only set if it's not a button or empty
                    if (commentText && !cells[commentIndex].querySelector('button')) {
                        start.comment = commentText;
                    }
                }
            }
            // Note: In compact view, track/driver/wagonType may come from MoreInfoArea (extracted below)
            
            // Check for additional rows after main row
            // In compact view: MoreInfoArea row contains track/driver/wagon
            // In both views: RaceComments row may contain comment
            let rowsToSkip = 0;
            
            // Check MoreInfoArea (compact view only)
            if (!isExpandedView && i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextClass = nextRow.className || '';
                
                if (nextClass.includes(ROW_PATTERNS.MORE_INFO_AREA)) {
                    const moreInfo = extractPreviousStartMoreInfo(nextRow);
                    Object.assign(start, moreInfo);
                    rowsToSkip++;
                }
            }
            
            // Check RaceComments row (only if comment not already set)
            if (!start.comment && i + 1 + rowsToSkip < rows.length) {
                const commentRow = rows[i + 1 + rowsToSkip];
                const commentClass = commentRow.className || '';
                
                if (commentClass.includes(ROW_PATTERNS.RACE_COMMENTS)) {
                    start.comment = extractRaceComment(commentRow);
                    rowsToSkip++;
                }
            }
            
            // Skip the additional rows we processed
            i += rowsToSkip;
            
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
    
    const detailsArea = cell.querySelector(`[class*="${CSS_PATTERNS.MORE_DETAILS_AREA}"]`);
    if (!detailsArea) return info;
    
    // Extract track, driver, and wagon type
    const items = detailsArea.querySelectorAll(`[class*="${CSS_PATTERNS.MORE_DETAILS_ITEM}"]`);
    if (items.length === 0) return info;
    items.forEach((item, index) => {
        const text = item.textContent.trim();
        // First item is track, second is driver, wagon has "Vagn:" prefix
        if (index === 0) {
            info.track = text; // e.g., "Bollnäs-2"
        } else if (index === 1) {
            info.driver = text; // e.g., "Kevin Svedlund"
        } else if (text.startsWith('Vagn:')) {
            info.wagonType = text.replace(TEXT_PATTERNS.WAGON_PREFIX, '').trim(); // e.g., "Am" or "Va"
        }
    });
    
    return info;
}

function extractRaceComment(row) {
    // Extract comment from RaceComments row
    const commentCell = row.querySelector('td');
    if (!commentCell) return '';
    
    const commentDiv = commentCell.querySelector(`[class*="${CSS_PATTERNS.RACE_COMMENT_CELL}"]`);
    return commentDiv ? commentDiv.textContent.trim() : commentCell.textContent.trim();
}

function normalizeDateFormat(dateStr) {
    // Normalize date formats to YYYY-MM-DD
    // Supported input formats:
    // - "251117" (YYMMDD)
    // - "2025-11-17" (already normalized)
    // - "17-11-2025" or "17/11/2025" (DD-MM-YYYY or DD/MM/YYYY)
    // - "11-17-2025" or "11/17/2025" (MM-DD-YYYY or MM/DD/YYYY)
    
    if (!dateStr) return '';
    
    const cleaned = dateStr.trim();
    
    // Already in YYYY-MM-DD format
    if (cleaned.match(DATE_FORMATS.NORMALIZED)) {
        return cleaned;
    }
    
    // YYMMDD format (6 digits)
    if (cleaned.match(DATE_FORMATS.SHORT)) {
        const year = DATE_FORMATS.CENTURY_PREFIX + cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        const day = cleaned.substring(4, 6);
        return `${year}-${month}-${day}`;
    }
    
    // Try DD-MM-YYYY or DD/MM/YYYY (European format)
    const europeanMatch = cleaned.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (europeanMatch) {
        const [, day, month, year] = europeanMatch;
        // Validate it's actually DD-MM-YYYY (day > 12 or month <= 12)
        if (parseInt(day) > 12 || parseInt(month) <= 12) {
            return `${year}-${month}-${day}`;
        }
    }
    
    // Try MM-DD-YYYY or MM/DD/YYYY (US format)
    const usMatch = cleaned.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (usMatch) {
        const [, month, day, year] = usMatch;
        return `${year}-${month}-${day}`;
    }
    
    // Return as-is if format is unknown
    return cleaned;
}
