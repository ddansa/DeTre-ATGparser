// CSS Selectors Configuration
// Edit these if the HTML structure changes

const SELECTORS = {
    // Game container (top-level wrapper)
    gameContainer: {
        primary: '[data-test-id$="-game"]',
        fallbacks: [
            '[class*="game-container"]',
            'div[class*="V85"]',
            'div[class*="V4"]',
            'div[class*="V75"]'
        ]
    },

    // Race sections
    raceSections: {
        primary: '[data-race-id]',
        fallbacks: [
            '[class*="race-section"]',
            'section[class*="race"]'
        ]
    },

    // Race metadata
    legHeader: {
        primary: '#leg-header',
        fallbacks: [
            '[class*="leg-header"]',
            '[class*="race-header"]',
            'header'
        ]
    },

    // Startlist table
    startlistTable: {
        primary: 'table[data-test-id="startlist"]',
        fallbacks: [
            'table[class*="startlist"]',
            'table[class*="start-list"]',
            'table'
        ]
    },

    // Table headers
    tableHeaders: {
        primary: 'thead th',
        fallbacks: [
            'tr:first-child th',
            'tr:first-child td'
        ]
    },

    // Horse rows
    horseRow: {
        primary: '[data-test-id^="horse-row-"]',
        pattern: /^horse-row-/,
        fallbacks: [
            'tr[class*="horse-row"]',
            'tbody > tr'
        ]
    },

    // Additional row (overflow data)
    additionalRow: {
        primary: '[data-test-id="additional-table-row"]',
        fallbacks: [
            '[class*="additional-row"]',
            '[class*="more-details-row"]'
        ]
    },

    // Cell identifiers
    cells: {
        horseCell: {
            startNumber: '[data-start-number]',
            // Support both normal and scratched horses
            horseName: '[startlist-export-id^="startlist-cell-horse-split-export"]',
            ageAndSex: '[startlist-export-id^="startlist-cell-ageAndSex-split-export"]',
            driver: '[startlist-export-id^="startlist-cell-driver-split-export"]',
            trainer: '[startlist-export-id="startlist-cell-trainer-export"]'
        },
        statsCell: {
            primary: '[data-test-id="startlist-cell-stats"]',
            statsSpan: 'span[class*="stats"]'
        },
        exportType: 'startlist-export-type',
        exportId: 'startlist-export-id'
    },

    // Additional row details
    additionalDetails: {
        columns: '[class*="moreDetailsColumn"]',
        columnsFallback: '[class*="details-column"], [class*="detail-column"]',
        header: '[class*="moreDetailsColumnHeader"]',
        text: '[class*="moreDetailsColumnText"]'
    },

    // Race metadata elements
    raceMetadata: {
        title: '[class*="title"]',
        bodySpans: 'span[class*="body"]',
        timeToStart: '[class*="TimeToStart"]'
    }
};

// Helper function to try primary selector with fallbacks
function findElement(container, selectorConfig) {
    if (typeof selectorConfig === 'string') {
        return container.querySelector(selectorConfig);
    }

    // Try primary selector
    let element = container.querySelector(selectorConfig.primary);
    if (element) return element;

    // Try fallbacks
    if (selectorConfig.fallbacks) {
        for (const fallback of selectorConfig.fallbacks) {
            element = container.querySelector(fallback);
            if (element) {
                console.warn(`Using fallback selector: ${fallback} (primary failed: ${selectorConfig.primary})`);
                return element;
            }
        }
    }

    return null;
}

// Helper function to find all elements with fallbacks
function findElements(container, selectorConfig) {
    if (typeof selectorConfig === 'string') {
        return container.querySelectorAll(selectorConfig);
    }

    // Try primary selector
    let elements = container.querySelectorAll(selectorConfig.primary);
    if (elements.length > 0) return elements;

    // Try fallbacks
    if (selectorConfig.fallbacks) {
        for (const fallback of selectorConfig.fallbacks) {
            elements = container.querySelectorAll(fallback);
            if (elements.length > 0) {
                console.warn(`Using fallback selector: ${fallback} (primary failed: ${selectorConfig.primary})`);
                return elements;
            }
        }
    }

    return [];
}

// Helper to get attribute with fallback
function getAttribute(element, attrName, fallbackAttr = null) {
    let value = element.getAttribute(attrName);
    if (value) return value;
    
    if (fallbackAttr) {
        value = element.getAttribute(fallbackAttr);
        if (value) {
            console.warn(`Using fallback attribute: ${fallbackAttr} (primary failed: ${attrName})`);
            return value;
        }
    }
    
    return null;
}
