# Development Guide – Send2Mealie

## Project Overview

Send2Mealie is a Chrome extension that detects recipe pages on whitelisted websites and allows users to send those recipes to their own Mealie server.

**Key Technologies:**
- JavaScript (ES6+)
- Webpack for bundling
- Chrome Extensions API (Manifest v3)
- Chrome Storage API (sync storage)

## Architecture

### Core Files

- **src/whitelist.js** - Single source of truth for supported recipe sites (alphabetically sorted)
- **src/contentScript.js** - Injected into recipe pages; detects recipes and shows button
- **src/background.js** - Service worker; handles API calls and message passing
- **src/popup.js** - Extension popup UI; handles settings and site management
- **public/popup.html** - Popup markup
- **public/popup.css** - Popup styles
- **public/manifest.json** - Extension manifest (auto-generated from whitelist)
- **tools/generate-manifest.js** - Build script that syncs whitelist to manifest and popup.js

### Data Flow

```
User adds site → popup.js → Chrome permissions API
                 ↓
             localStorage (pending)
                 ↓
User grants permission → popup reloads
                 ↓
localStorage check → save to userSites → render list
                 ↓
background.js detects userSites → injects contentScript
                 ↓
contentScript loads on page → checks default whitelist + userSites
                 ↓
Shows button → user clicks → sends to Mealie via background.js
```

### Build Process

1. **generate-manifest.js** runs first:
   - Parses `src/whitelist.js` to extract sites
   - Sorts sites alphabetically
   - Updates `public/manifest.json` host_permissions and content_scripts
   - Updates `src/popup.js` DEFAULT_WHITELIST constant

2. **Webpack** bundles:
   - `src/contentScript.js` (with whitelist imported)
   - `src/background.js`
   - `src/popup.js` (with updated DEFAULT_WHITELIST)
   - Static assets from `public/`

3. **Output**: `build/` directory with ready-to-load extension

## Setup & Installation

```bash
# Clone repository
git clone https://github.com/gargolito/send2mealie
cd send2mealie

# Install dependencies
npm install

# Development build (with watch mode)
npm run watch

# Production build
npm run build

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the build/ directory
```

## Adding Sites to Whitelist

To add new recipe sites:

1. Edit `src/whitelist.js`
2. Add domain to the `DEFAULT_WHITELIST` array
3. Run `npm run build` - the following happen automatically:
   - Manifest is regenerated with new host_permissions
   - Content script matches are updated
   - popup.js DEFAULT_WHITELIST is updated and sorted
4. Test by visiting the new recipe site (button should appear)
5. Commit changes

**Example:**
```javascript
// src/whitelist.js
export const DEFAULT_WHITELIST = [
  "allrecipes.com",
  "budgetbytes.com",
  "newsite.com"  // ← Add new domain
];
```

## Testing

### Manual Testing
1. Load extension in Chrome (see Setup section)
2. Configure Mealie URL and API key in popup
3. Visit a recipe site (e.g., allrecipes.com)
4. Verify "Send to Mealie" button appears
5. Click button → should send recipe to Mealie

### Test Scenarios
- Default sites (manifest content_scripts)
- User-added sites (dynamic injection via background.js)
- Duplicate detection (if enabled)
- Recipe page validation
- Error handling

## Key Features & Implementation

### 1. Default Whitelist (Auto-loaded)
- **File:** `src/whitelist.js`
- **How it works:** Manifest's content_scripts automatically injects contentScript.js on matching sites
- **Sync:** Build script keeps manifest.json in sync

### 2. User-Added Sites (Optional Permissions)
- **File:** `src/popup.js` (addUserSite function)
- **How it works:** 
  - User enters URL → script extracts domain
  - Request permission via `chrome.permissions.request()`
  - Store domain in `chrome.storage.sync.userSites`
  - background.js watches for userSites and dynamically injects contentScript
- **Stored in:** Chrome sync storage (`userSites` array)

### 3. Recipe Detection
- **File:** `src/background.js` (isRecipePage function)
- **How it works:** Calls Mealie's test-scrape-url endpoint
- **Logic:** If content-length > 1000, likely a recipe
- **Note:** Page must have mealieUrl and mealieApiKey configured

### 4. Duplicate Detection
- **File:** `src/background.js` (checkDuplicate function)
- **How it works:** Queries Mealie recipes API with orgURL filter
- **When used:** 
  - Always on page load (to show "Mealied!" state)
  - If enableDuplicateCheck is enabled, warns before sending
- **Storage:** User preference in `chrome.storage.sync`

### 5. Auto-Save Settings
- **File:** `src/popup.js` (autoSave function)
- **Trigger:** Input/checkbox change
- **Saved:** Mealie URL, API key, duplicate check preference

## Security & Privacy

- **No data collection:** Extension only accesses configured Mealie server and whitelisted sites
- **Credentials:** Stored in Chrome's encrypted sync storage
- **Errors:** Redacted in console (no sensitive details logged)
- **URLs:** Only sent to Mealie server and whitelisted recipe sites
- **Permissions:** Minimal permissions; optional host_permissions for user sites

See [PRIVACY.md](./PRIVACY.md) for full privacy policy.

## Code Style

- **Formatting:** No strict formatter (consider adding Prettier in future)
- **Comments:** Only where logic needs clarification
- **Variable naming:** Descriptive names (e.g., `enableDuplicateCheck`, `mealieUrl`)
- **Error handling:** Try/catch blocks; generic error messages in UI

## Debugging

### Enable Logging
Uncomment console statements in background.js and contentScript.js (note: redacted error messages per privacy policy)

### Check Extension Status
1. Go to `chrome://extensions/`
2. Find "Send2Mealie"
3. Click "Details" → "Service Worker" to view background.js console
4. Right-click on page → "Inspect" → "Console" for contentScript logs

### Common Issues

**Button not showing on recipe site:**
- [ ] Check manifest has correct host_permissions
- [ ] Verify site is in whitelist or userSites
- [ ] Check if page passes recipe detection (Mealie test-scrape-url)
- [ ] Verify Mealie URL and API key are configured

**Duplicate detection not working:**
- [ ] Verify enableDuplicateCheck is enabled in popup
- [ ] Check Mealie server is reachable
- [ ] Verify API key has permission to query recipes

**User site not working after adding:**
- [ ] Ensure permission was granted (browser should ask)
- [ ] Reload the site (background.js injects on page load)
- [ ] Check userSites in chrome://extensions/ → Details → Storage

## Contributing

1. Create a feature branch: `git checkout -b feature/description`
2. Make changes following code style guidelines
3. Test manually in Chrome
4. Commit with clear message: `git commit -m "Feature: Description of changes"`
5. Push and create pull request

## Future Improvements

- [ ] Add Prettier for consistent code formatting
- [ ] Add unit tests for utility functions
- [ ] Add E2E tests with Puppeteer
- [ ] Support recipe page detection improvements
- [ ] Add ability to customize button appearance
- [ ] Support Mealie authentication via OAuth
- [ ] Add recipe preview before sending

## References

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest v3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Mealie API](https://docs.mealie.io/api/)
