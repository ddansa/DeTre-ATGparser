/**
 * ATG Race Data Parser
 * Extracts race and horse data from ATG HTML pages
 */

function extractRaceData(doc, debugMode = false) {
    const gameContainer = findElement(doc, SELECTORS.gameContainer);
    if (!gameContainer) {
        throw new Error(ERROR_MESSAGES.NO_GAME_CONTAINER + 
            [SELECTORS.gameContainer.primary, ...SELECTORS.gameContainer.fallbacks].join(', '));
    }

    const gameType = (getAttribute(gameContainer, ATTRIBUTES.DATA_TEST_ID) || GAME_PATTERNS.UNKNOWN)
        .replace(GAME_PATTERNS.SUFFIX, '');

    const raceSections = findElements(doc, SELECTORS.raceSections);
    if (raceSections.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_RACES + 
            [SELECTORS.raceSections.primary, ...SELECTORS.raceSections.fallbacks].join(', '));
    }

    const races = [];
    let totalHorses = 0;

    raceSections.forEach((raceSection) => {
        const raceId = getAttribute(raceSection, ATTRIBUTES.DATA_RACE_ID) || 
                       getAttribute(raceSection, ATTRIBUTES.ID) || 
                       FALLBACKS.UNKNOWN_RACE;
        
        const legHeader = findElement(raceSection, SELECTORS.legHeader);
        const raceMetadata = extractRaceMetadata(legHeader);

        const startlistTable = findElement(raceSection, SELECTORS.startlistTable);
        if (!startlistTable) {
            console.warn(ERROR_MESSAGES.NO_STARTLIST_TABLE + raceId);
            return;
        }

        const headers = extractTableHeaders(startlistTable);
        const horses = extractHorses(startlistTable, headers);
        totalHorses += horses.length;

        const raceData = {
            raceId,
            gameType,
            metadata: raceMetadata,
            horses
        };

        if (debugMode) raceData.headers = headers;
        races.push(raceData);
    });

    return {
        gameType,
        races,
        totalHorses,
        extractedAt: new Date().toISOString()
    };
}

function extractRaceMetadata(legHeader) {
    if (!legHeader) return {};

    const metadata = {};

    // Extract race title/number (remove trailing comma)
    const title = legHeader.querySelector(SELECTORS.raceMetadata.title);
    if (title) metadata.title = title.textContent.trim().replace(/,\s*$/, '');

    // Extract all text spans that contain race info
    const infoSpans = legHeader.querySelectorAll(SELECTORS.raceMetadata.bodySpans);
    const infoTexts = [];
    infoSpans.forEach(span => {
        const text = span.textContent.trim();
        if (text && text !== METADATA_PATTERNS.BULLET) {
            infoTexts.push(text);
        }
    });

    const unmatchedTexts = [];
    infoTexts.forEach((text, index) => {
        if (text.match(METADATA_PATTERNS.DISTANCE)) {
            metadata.distance = text;
        } else if (text.match(METADATA_PATTERNS.RACE_TYPE)) {
            metadata.raceType = text;
        } else if (text.match(METADATA_PATTERNS.START_TYPE)) {
            metadata.startType = text;
        } else if (!metadata.track && index === 0) {
            metadata.track = text;
        } else if (text.match(METADATA_PATTERNS.TRACK_CONDITION)) {
            metadata.trackCondition = text;
        } else {
            unmatchedTexts.push(text);
        }
    });
    
    if (unmatchedTexts.length > 0) {
        metadata.description = unmatchedTexts.join(' - ');
    }

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
            index,
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
            const horseData = extractRowData(row, headers);
            
            if (!horseData.startNumber) {
                horseData.startNumber = testId ? 
                    testId.replace(new RegExp(`^${ROW_PATTERNS.HORSE_ROW_PREFIX}`), '') : 
                    `${FALLBACKS.HORSE_PREFIX}${i}`;
            }

            if (i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextTestId = getAttribute(nextRow, ATTRIBUTES.DATA_TEST_ID);
                
                const isAdditionalRow = nextTestId === ROW_PATTERNS.ADDITIONAL_ROW ||
                                       nextTestId?.includes('additional') ||
                                       nextRow.classList.contains('additional-row');
                
                if (isAdditionalRow) {
                    Object.assign(horseData, extractAdditionalRowData(nextRow));
                    i++;
                }
            }

            if (i + 1 < rows.length) {
                const extendedRow = rows[i + 1];
                const extendedClass = extendedRow.className || '';
                
                if (extendedClass.includes(ROW_PATTERNS.EXTENDED_ROW_CLASS)) {
                    const previousStarts = extractPreviousStarts(extendedRow);
                    if (previousStarts.length > 0) {
                        horseData.previousStarts = previousStarts;
                    }
                    i++;
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
        
        let text = cell.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
        
        const testIdElement = cell.querySelector(`[${ATTRIBUTES.DATA_TEST_ID}^="${CELL_PATTERNS.TEST_ID_PREFIX}"]`);
        if (testIdElement) {
            text = testIdElement.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
        }

        if (header.exportType === EXPORT_TYPES.HORSE) {
            Object.assign(data, extractHorseCell(cell));
        } else if (header.exportType === EXPORT_TYPES.LIFE_STATS || header.exportType === EXPORT_TYPES.CURRENT_YEAR_STATS) {
            data[header.exportType] = extractStatsData(cell);
        } else if (header.exportType === EXPORT_TYPES.SHOE_INFO) {
            data[header.exportType] = extractShoeInfo(cell);
        } else {
            data[header.exportType] = text;
        }
    });

    return data;
}

function extractHorseCell(cell) {
    const horseData = {};

    const numberButton = cell.querySelector(SELECTORS.cells.horseCell.startNumber);
    if (numberButton) {
        horseData.startNumber = getAttribute(numberButton, ATTRIBUTES.DATA_START_NUMBER);
    }

    const nameElement = cell.querySelector(SELECTORS.cells.horseCell.horseName);
    if (nameElement) {
        horseData.horseName = nameElement.textContent.trim().replace(TEXT_PATTERNS.LEADING_NUMBER, '');
    }

    const ageElement = cell.querySelector(SELECTORS.cells.horseCell.ageAndSex);
    if (ageElement) {
        horseData.ageAndSex = ageElement.textContent.trim();
    }

    const driverElement = cell.querySelector(SELECTORS.cells.horseCell.driver);
    if (driverElement) {
        const trainerShortElement = driverElement.querySelector('[class*="trainerShortName"]');
        
        if (trainerShortElement) {
            const trainerShort = trainerShortElement.textContent.trim();
            horseData.trainer = trainerShort.replace(/[()]/g, '').trim();
            
            const driverNameElement = driverElement.querySelector('[class*="driverName"]');
            horseData.driver = driverNameElement ? 
                driverNameElement.textContent.trim() : 
                driverElement.textContent.replace(trainerShort, '').trim();
        } else {
            horseData.driver = driverElement.textContent.trim();
        }
    }

    const trainerElement = cell.querySelector(SELECTORS.cells.horseCell.trainer);
    if (trainerElement) {
        horseData.trainer = trainerElement.textContent.trim();
    }

    return horseData;
}

function extractStatsData(cell) {
    const statsElement = cell.querySelector(SELECTORS.cells.statsCell.primary);
    if (!statsElement) {
        return cell.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ');
    }

    const totalSpan = statsElement.querySelector(SELECTORS.cells.statsCell.statsSpan);
    const total = totalSpan ? totalSpan.textContent.trim() : '';

    let placementText = statsElement.textContent.trim();
    if (total) {
        placementText = placementText.replace(total, '').trim();
    }

    if (total && placementText) return `${total} ${placementText}`;
    return placementText || total || '';
}

function extractAdditionalRowData(row) {
    const data = {};
    
    let columns = row.querySelectorAll(SELECTORS.additionalDetails.columns);
    if (columns.length === 0) {
        columns = row.querySelectorAll(SELECTORS.additionalDetails.columnsFallback);
    }
    
    columns.forEach(column => {
        const header = column.querySelector(SELECTORS.additionalDetails.header);
        const headerText = header ? header.textContent.trim().replace(':', '') : null;
        const valueContainer = column.querySelector(SELECTORS.additionalDetails.text);
        const exportType = header ? getAttribute(header, SELECTORS.cells.exportType) : null;
        
        let value;
        if (exportType === EXPORT_TYPES.CURRENT_YEAR_STATS || exportType === EXPORT_TYPES.PREVIOUS_YEAR_STATS) {
            value = valueContainer ? extractStatsData(valueContainer) : '';
        } else if (exportType === EXPORT_TYPES.SHOE_INFO) {
            value = valueContainer ? extractShoeInfo(valueContainer) : '';
        } else {
            value = valueContainer ? valueContainer.textContent.trim().replace(TEXT_PATTERNS.WHITESPACE, ' ') : '';
        }
        
        if (exportType) {
            data[exportType] = value;
        } else if (headerText) {
            const key = headerText.toLowerCase().replace(TEXT_PATTERNS.NON_ALPHANUMERIC, '_');
            data[key] = value;
        }
    });

    return data;
}

function extractShoeInfo(container) {
    if (!container) return '';
    
    const noInfoElements = container.querySelectorAll('[class*="shoeCellNoInfo"]');
    if (noInfoElements.length > 0) {
        return Array.from(noInfoElements).map(() => '-').join('');
    }
    
    let svgs = container.querySelectorAll('svg[data-test-id*="Shoe"]');
    
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
            shoeSymbols.push(SHOE_SYMBOLS.ON);
        } else if (testId === SHOE_SYMBOLS.OFF_ICON_ID) {
            shoeSymbols.push(SHOE_SYMBOLS.OFF);
        }
    });
    
    return shoeSymbols.join('');
}

function detectPreviousStartsColumns(thead) {
    const columnMap = { isExpanded: false };
    if (!thead) return columnMap;
    
    const headers = thead.querySelectorAll('th');
    headers.forEach((th, index) => {
        let fieldDetected = false;
        const testIdElement = th.querySelector(`[${ATTRIBUTES.DATA_TEST_ID}^="${PREVIOUS_STARTS_HEADERS.PREFIX}"]`);
        
        if (testIdElement) {
            const testId = testIdElement.getAttribute(ATTRIBUTES.DATA_TEST_ID);
            const fieldName = testId.replace(PREVIOUS_STARTS_HEADERS.PREFIX, '');
            
            if (fieldName && fieldName !== 'distance') {
                columnMap[fieldName] = index;
                fieldDetected = true;
                
                if (fieldName === PREVIOUS_STARTS_HEADERS.TRACK_FIELD) {
                    columnMap.isExpanded = true;
                }
            }
        }
        
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
                columnMap.isExpanded = true;
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
    if (columnMap[fieldName] === undefined || !cells[columnMap[fieldName]]) {
        return null;
    }
    
    const cell = cells[columnMap[fieldName]];
    return extractor ? extractor(cell) : cell.textContent.trim();
}

function extractPreviousStarts(extendedRow) {
    const previousStartsTable = extendedRow.querySelector(`table[class*="${CSS_PATTERNS.PREVIOUS_STARTS_TABLE}"]`);
    if (!previousStartsTable) return [];
    
    const tbody = previousStartsTable.querySelector('tbody');
    if (!tbody) return [];
    
    const thead = previousStartsTable.querySelector('thead');
    const columnMap = detectPreviousStartsColumns(thead);
    const isExpandedView = columnMap.isExpanded;
    
    const previousStarts = [];
    
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
            
            if (columnMap.date !== undefined && cells[columnMap.date]) {
                const dateCell = cells[columnMap.date];
                const dateLink = dateCell.querySelector('a');
                const dateText = dateLink ? dateLink.textContent.trim() : dateCell.textContent.trim();
                start.date = normalizeDateFormat(dateText);
                start.raceLink = dateLink ? dateLink.getAttribute(ATTRIBUTES.HREF) : null;
            } else if (!isExpandedView && cells[0]) {
                const dateLink = cells[0].querySelector('a');
                const dateText = dateLink ? dateLink.textContent.trim() : cells[0].textContent.trim();
                start.date = normalizeDateFormat(dateText);
                start.raceLink = dateLink ? dateLink.getAttribute(ATTRIBUTES.HREF) : null;
            }
            
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
            
            const wagon = extractPreviousStartField(cells, columnMap, 'sulky');
            if (wagon) {
                start.wagonType = wagon.replace(TEXT_PATTERNS.WAGON_PREFIX, '').trim();
            }
            
            if (isExpandedView) {
                const commentIndex = cells.length - 1;
                if (commentIndex >= 0 && cells[commentIndex]) {
                    const commentText = cells[commentIndex].textContent.trim();
                    if (commentText && !cells[commentIndex].querySelector('button')) {
                        start.comment = commentText;
                    }
                }
            }
            
            let rowsToSkip = 0;
            
            if (!isExpandedView && i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                const nextClass = nextRow.className || '';
                
                if (nextClass.includes(ROW_PATTERNS.MORE_INFO_AREA)) {
                    Object.assign(start, extractPreviousStartMoreInfo(nextRow));
                    rowsToSkip++;
                }
            }
            
            if (!start.comment && i + 1 + rowsToSkip < rows.length) {
                const commentRow = rows[i + 1 + rowsToSkip];
                const commentClass = commentRow.className || '';
                
                if (commentClass.includes(ROW_PATTERNS.RACE_COMMENTS)) {
                    start.comment = extractRaceComment(commentRow);
                    rowsToSkip++;
                }
            }
            
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
    
    const items = detailsArea.querySelectorAll(`[class*="${CSS_PATTERNS.MORE_DETAILS_ITEM}"]`);
    if (items.length === 0) return info;
    
    items.forEach((item, index) => {
        const text = item.textContent.trim();
        if (index === 0) {
            info.track = text;
        } else if (index === 1) {
            info.driver = text;
        } else if (text.startsWith('Vagn:')) {
            info.wagonType = text.replace(TEXT_PATTERNS.WAGON_PREFIX, '').trim();
        }
    });
    
    return info;
}

function extractRaceComment(row) {
    const commentCell = row.querySelector('td');
    if (!commentCell) return '';
    
    const commentDiv = commentCell.querySelector(`[class*="${CSS_PATTERNS.RACE_COMMENT_CELL}"]`);
    return commentDiv ? commentDiv.textContent.trim() : commentCell.textContent.trim();
}

function normalizeDateFormat(dateStr) {
    if (!dateStr) return '';
    
    const cleaned = dateStr.trim();
    
    if (cleaned.match(DATE_FORMATS.NORMALIZED)) return cleaned;
    
    if (cleaned.match(DATE_FORMATS.SHORT)) {
        const year = DATE_FORMATS.CENTURY_PREFIX + cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        const day = cleaned.substring(4, 6);
        return `${year}-${month}-${day}`;
    }
    
    const europeanMatch = cleaned.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (europeanMatch) {
        const [, day, month, year] = europeanMatch;
        if (parseInt(day) > 12 || parseInt(month) <= 12) {
            return `${year}-${month}-${day}`;
        }
    }
    
    const usMatch = cleaned.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (usMatch) {
        const [, month, day, year] = usMatch;
        return `${year}-${month}-${day}`;
    }
    
    return cleaned;
}
