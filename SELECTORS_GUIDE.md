# Selector Configuration Guide

If the HTML structure of the race pages changes and the parser stops working, you can easily fix it by editing the `selectors.js` file.

## How It Works

The parser uses CSS selectors to find elements in the HTML. Each selector has:
- **Primary selector**: The main way to find the element
- **Fallback selectors**: Alternative ways if the primary fails

## Common Fixes

### 1. Game Container Not Found

**Error**: `No game container found`

**Fix**: Edit `SELECTORS.gameContainer` in `selectors.js`

```javascript
gameContainer: {
    primary: '[data-test-id$="-game"]',  // Current selector
    fallbacks: [
        '[class*="game-container"]',      // Add new patterns here
        'div[class*="V85"]',
        'div[class*="V4"]'
    ]
}
```

### 2. Races Not Found

**Error**: `No races found`

**Fix**: Edit `SELECTORS.raceSections`

```javascript
raceSections: {
    primary: '[data-race-id]',
    fallbacks: [
        '[class*="race-section"]',
        'section[class*="race"]'
    ]
}
```

### 3. Horse Names Missing

**Fix**: Edit `SELECTORS.cells.horseCell.horseName`

```javascript
cells: {
    horseCell: {
        horseName: '[startlist-export-id="startlist-cell-horse-split-export"]',
        // Change to new selector if attribute changes
    }
}
```

### 4. Stats Not Parsing Correctly

**Fix**: Edit `SELECTORS.cells.statsCell`

```javascript
statsCell: {
    primary: '[data-test-id="startlist-cell-stats"]',
    statsSpan: 'span[class*="stats"]'  // Pattern for total count span
}
```

## Finding New Selectors

1. **Open the saved HTML file in a browser**
2. **Right-click on the element** you want to extract (e.g., horse name)
3. **Select "Inspect" or "Inspect Element"**
4. **Look for unique attributes**:
   - `data-test-id="..."`
   - `data-*` attributes
   - `class="..."`
   - `id="..."`
5. **Copy the attribute** and update `selectors.js`

## Testing Changes

1. Edit `selectors.js`
2. Save the file
3. Reload `index.html` in your browser
4. Test with a race page HTML file
5. Check browser console (F12) for warnings about fallback selectors being used

## Selector Priority

The parser tries selectors in this order:
1. Primary selector
2. First fallback
3. Second fallback
4. And so on...

If a fallback is used, you'll see a **warning in the browser console** (F12).

## Example: Complete Fix

If horse names stop being extracted:

1. **Inspect the HTML** and find the new structure:
   ```html
   <span data-horse-name="Nephtys Boko">Nephtys Boko</span>
   ```

2. **Update selectors.js**:
   ```javascript
   cells: {
       horseCell: {
           horseName: '[data-horse-name]',  // New primary
           // Keep old as fallback for compatibility
       }
   }
   ```

3. **Test** - reload and parse a file

## Need Help?

- Check browser console (F12) for error messages
- Errors show which selector failed
- Console warnings show which fallback was used
- Use debug mode checkbox to see column mapping

## Advanced: Pattern Matching

Some selectors use pattern matching for flexibility:

```javascript
// Matches any test-id starting with "horse-row-"
testId.startsWith('horse-row-')

// Matches any class containing "stats"
'span[class*="stats"]'

// Regex pattern matching
testId.match(/horse.*row/i)
```

You can add similar patterns in the parser code if needed.
