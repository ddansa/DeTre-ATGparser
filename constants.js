// Constants for the ATG Horse Racing Parser
// This file contains all magic numbers, strings, and patterns used throughout the application

// ============================================================================
// ATTRIBUTE NAMES
// ============================================================================
const ATTRIBUTES = {
    DATA_TEST_ID: 'data-test-id',
    DATA_RACE_ID: 'data-race-id',
    DATA_START_NUMBER: 'data-start-number',
    STARTLIST_EXPORT_ID: 'startlist-export-id',
    ID: 'id',
    HREF: 'href',
    CLASS_NAME: 'className'
};

// ============================================================================
// GAME CONTAINER PATTERNS
// ============================================================================
const GAME_PATTERNS = {
    SUFFIX: '-game',
    UNKNOWN: 'UNKNOWN'
};

// ============================================================================
// ROW TYPE PATTERNS
// ============================================================================
const ROW_PATTERNS = {
    HORSE_ROW_PREFIX: 'horse-row-',
    HORSE_ROW_MATCH: /horse.*row/i,
    ADDITIONAL_ROW: 'additional-table-row',
    EXTENDED_ROW_CLASS: 'extendedStartRow',
    MORE_INFO_AREA: 'MoreInfoArea',
    RACE_COMMENTS: 'RaceComments',
    TABLE_ROW_BODY: 'tableRowBody'
};

// ============================================================================
// CSS CLASS PATTERNS
// ============================================================================
const CSS_PATTERNS = {
    PREVIOUS_STARTS_TABLE: 'PreviousStartsTable',
    MORE_DETAILS_AREA: 'moreDetailsArea',
    MORE_DETAILS_ITEM: 'moreDetailsItem',
    RACE_COMMENT_CELL: 'RaceCommentCell',
    STATS_SPAN: 'stats'
};

// ============================================================================
// RACE METADATA PATTERNS
// ============================================================================
const METADATA_PATTERNS = {
    // Distance pattern (e.g., "2140 m", "1640m")
    DISTANCE: /^\d+\s*m$/i,
    
    // Race type pattern (exact match only)
    RACE_TYPE: /^(trav|galopp|monté)$/i,
    
    // Start type pattern
    START_TYPE: /autostart|voltstart/i,
    
    // Track condition pattern
    TRACK_CONDITION: /lätt|tung|god|hård|mjuk|fryst/i,
    
    // Bullet separator
    BULLET: '•'
};

// ============================================================================
// DATE FORMATS
// ============================================================================
const DATE_FORMATS = {
    // YYYY-MM-DD format (normalized)
    NORMALIZED: /^\d{4}-\d{2}-\d{2}$/,
    
    // YYMMDD format (6 digits)
    SHORT: /^\d{6}$/,
    
    // Century prefix for short dates
    CENTURY_PREFIX: '20'
};

// ============================================================================
// SHOE INFO SYMBOLS
// ============================================================================
const SHOE_SYMBOLS = {
    ON: 'C',           // Shoe on
    OFF: 'Ȼ',          // Shoe off (barfoot)
    ON_ICON_ID: 'ShoeOnFilledIcon',
    OFF_ICON_ID: 'ShoeOffFilledIcon',
    SELECTOR_PATTERN: 'svg[data-test-id*="Shoe"]'
};

// ============================================================================
// CELL SELECTOR PATTERNS
// ============================================================================
const CELL_PATTERNS = {
    TEST_ID_PREFIX: 'startlist-cell-',
    TABLE_CELL_HEAD: 'tableCellHead'
};

// ============================================================================
// PREVIOUS STARTS HEADER PATTERNS
// ============================================================================
// Note: Column positions are now detected dynamically from headers
// This makes the parser resilient to ATG adding/removing/reordering columns
const PREVIOUS_STARTS_HEADERS = {
    PREFIX: 'table-header-',
    TRACK_FIELD: 'track'  // Used to detect expanded vs compact view
};

// ============================================================================
// TEXT PATTERNS
// ============================================================================
const TEXT_PATTERNS = {
    // Pattern to remove leading number from horse name (e.g., "1 Horse Name" -> "Horse Name")
    LEADING_NUMBER: /^\d+\s+/,
    
    // Pattern to clean up whitespace
    WHITESPACE: /\s+/g,
    
    // Pattern for wagon type prefix
    WAGON_PREFIX: /^Vagn:/,
    
    // Pattern for non-alphanumeric characters (for key generation)
    NON_ALPHANUMERIC: /[^a-z0-9]/g
};

// ============================================================================
// EXPORT TYPES (field names)
// ============================================================================
const EXPORT_TYPES = {
    HORSE: 'horse',
    LIFE_STATS: 'lifeStats',
    CURRENT_YEAR_STATS: 'currentYearStats',
    PREVIOUS_YEAR_STATS: 'previousYearStats',
    SHOE_INFO: 'shoeInfo'
};

// ============================================================================
// FALLBACK VALUES
// ============================================================================
const FALLBACKS = {
    UNKNOWN_RACE: 'unknown-race',
    COLUMN_PREFIX: 'column_',
    HORSE_PREFIX: 'horse_'
};

// ============================================================================
// TABLE HEADER TEST IDS
// ============================================================================
const TABLE_HEADERS = {
    TRACK: 'table-header-track'
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================
const ERROR_MESSAGES = {
    NO_GAME_CONTAINER: 'No game container found. Tried selectors: ',
    NO_RACES: 'No races found. Tried selectors: ',
    NO_STARTLIST_TABLE: 'No startlist table found for race '
};

// Export all constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ATTRIBUTES,
        GAME_PATTERNS,
        ROW_PATTERNS,
        CSS_PATTERNS,
        METADATA_PATTERNS,
        DATE_FORMATS,
        SHOE_SYMBOLS,
        CELL_PATTERNS,
        PREVIOUS_STARTS_HEADERS,
        TEXT_PATTERNS,
        EXPORT_TYPES,
        FALLBACKS,
        TABLE_HEADERS,
        ERROR_MESSAGES
    };
}
