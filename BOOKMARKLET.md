# ATG Race Data Extractor - Bookmarklet

## 📌 Installation Instructions

### Step 1: Show Your Bookmarks Bar
- **Chrome/Edge**: Press `Ctrl+Shift+B`
- **Firefox**: Press `Ctrl+Shift+B` or right-click toolbar → "Bookmarks Toolbar"

### Step 2: Create the Bookmarklet

**Option A: Drag and Drop** (Easiest)
1. Open this file in a browser
2. Drag the link below to your bookmarks bar:

   <a href="javascript:(function(){const html=document.body.outerHTML;const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);const a=document.createElement('a');const date=new Date().toISOString().split('T')[0];const title=document.title.replace(/[^a-z0-9]/gi,'_');a.href=url;a.download=`ATG_${title}_${date}.html`;a.click();URL.revokeObjectURL(url);})();">📥 Extract ATG Race Data</a>

**Option B: Manual Creation**
1. Right-click your bookmarks bar → "Add page" or "New bookmark"
2. Name it: `Extract ATG Race Data`
3. Copy the code below and paste it as the URL:

```
javascript:(function(){const html=document.body.outerHTML;const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);const a=document.createElement('a');const date=new Date().toISOString().split('T')[0];const title=document.title.replace(/[^a-z0-9]/gi,'_');a.href=url;a.download=`ATG_${title}_${date}.html`;a.click();URL.revokeObjectURL(url);})();
```

### Step 3: Use It!
1. Go to any ATG race page (e.g., https://www.atg.se/spel/...)
2. Wait for the page to fully load
3. Click the bookmarklet in your bookmarks bar
4. The HTML file will download automatically!
5. Upload the downloaded file to the Horse Extractor tool

---

## 🎯 What It Does

- Extracts the **fully rendered** HTML from the current page
- Automatically names the file with the page title and date
- Downloads it directly to your Downloads folder
- Works on any ATG race page

---

## 💡 Tips

- Make sure the page is **fully loaded** before clicking
- The file will be named like: `ATG_V64_Farjestad_2025_11_24_2025-11-24.html`
- If nothing happens, check your browser's download settings
- Works in Chrome, Firefox, Edge, and Safari

---

## 🔧 Troubleshooting

**"Nothing happens when I click"**
- Make sure you copied the ENTIRE code including `javascript:` at the start
- Try refreshing the ATG page and clicking again

**"Download is blocked"**
- Check your browser's download permissions
- Some browsers may ask for permission on first use

**"File is empty or doesn't parse"**
- Wait a few more seconds for the page to fully load
- Scroll down to make sure all content is rendered
- Try clicking the bookmarklet again

---

## 📝 Alternative: Console Method

If the bookmarklet doesn't work, you can paste this in the browser console (F12):

```javascript
const html = document.body.outerHTML;
const blob = new Blob([html], {type: 'text/html'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
const date = new Date().toISOString().split('T')[0];
const title = document.title.replace(/[^a-z0-9]/gi, '_');
a.href = url;
a.download = `ATG_${title}_${date}.html`;
a.click();
URL.revokeObjectURL(url);
```

Then press Enter and the file will download.
