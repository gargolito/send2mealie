# Send2Mealie - Copilot Session Guide

## Environment
- Direct, efficient communication focused on implementation
- No unnecessary comments or compliments
- Work follows established patterns and best practices

## Project Goal
Create a Chrome extension that adds a "Send to Mealie" button to recipe websites, allowing users to save recipes to their personal Mealie instance.

## Architecture Overview

```
src/
├── whitelist.js          # Single source of truth for supported sites (auto-sorted)
├── contentScript.js      # Injects button on recipe pages, detects recipes
├── background.js         # Service worker, handles API calls & message routing
└── popup.js              # Extension popup UI for settings & site management

public/
├── manifest.json         # Generated from whitelist (auto-updated during build)
├── popup.html            # Popup markup
├── popup.css             # Popup styles (all external CSS)
└── icons/                # Extension icons

tools/
└── generate-manifest.js  # Build script that syncs whitelist → manifest & popup.js
```

## Key Implementation Details

### Whitelist Management
- Single source of truth: `src/whitelist.js`
- Build script auto-generates:
  - `public/manifest.json` (host_permissions & content_scripts.matches)
  - `src/popup.js` (DEFAULT_WHITELIST, sorted alphabetically)
- All three stay perfectly in sync

### Button Injection
- **Default sites**: Manifest content_scripts auto-inject on page load
- **User sites**: background.js watches `userSites` and dynamically injects on demand

### Features
- ✅ 15+ default recipe sites (AllRecipes, Food Network, BBC Good Food, etc.)
- ✅ User can add custom sites with optional host permissions
- ✅ Auto-detect "Mealied!" state on page load (shows if recipe already saved)
- ✅ Optional duplicate detection (warns before re-sending)
- ✅ Auto-save settings (no save button needed)
- ✅ Scrollable modal showing all default sites (alphabetically sorted)
- ✅ Recipe page validation via Mealie test-scrape-url endpoint
- ✅ Secure credential storage (Chrome encrypted sync)
- ✅ Security hardened (redacted errors, strict validation, minimal permissions)

## Build Process

```bash
npm run build    # or npm run watch

# Step 1: node tools/generate-manifest.js
#   - Parse src/whitelist.js
#   - Sort sites alphabetically
#   - Update public/manifest.json
#   - Update src/popup.js DEFAULT_WHITELIST

# Step 2: webpack bundles everything
#   - background.js
#   - contentScript.js (with whitelist imported)
#   - popup.js (with updated DEFAULT_WHITELIST)
#   - Static assets from public/
#   - Output → build/
```

## Adding New Recipe Sites

1. Edit `src/whitelist.js` - add domain to `DEFAULT_WHITELIST`
2. Run `npm run build` - everything auto-updates
3. Test visiting the new site - button should appear
4. Commit changes

The build script handles all the syncing automatically.

## Data Storage

- **Chrome sync storage:**
  - `mealieUrl` - User's Mealie server URL
  - `mealieApiKey` - User's API key
  - `enableDuplicateCheck` - Duplicate detection preference
  - `userSites` - Array of user-added domains

- **localStorage:**
  - `pendingSiteUrl` - Temporarily stores URL during permission grant

## API Endpoints Used

- `POST /api/recipes/create/url` - Send recipe URL to Mealie
- `POST /api/recipes/test-scrape-url` - Validate if URL is a recipe
- `GET /api/recipes?queryFilter=orgURL="..."` - Check for duplicate
- `GET /api/app/about` - Test connection (credentials validation)

## Security & Privacy

- No analytics, tracking, or data collection
- Only communicates with Mealie server and whitelisted recipe sites
- Error messages redacted (no sensitive data in console)
- All credentials encrypted in Chrome storage
- See PRIVACY.md and README.md for details

## Common Tasks

### Debug Content Script Issues
- Open DevTools on recipe page
- Console shows contentScript logs
- Check whitelist includes the domain

### Test Recipe Detection
- Configure Mealie URL & API key
- Visit recipe page
- Button should appear if isRecipePage() returns true

### Add Custom Site
- Pop up extension → "Add Custom Site"
- Grant permission when prompted
- Return to popup after permission grant
- Site should appear in custom sites list

## Debugging Checklist

- [ ] Extension loads without errors (chrome://extensions)
- [ ] Service Worker shows no errors
- [ ] Mealie URL uses HTTPS
- [ ] API key is valid
- [ ] Site domain is in whitelist or userSites
- [ ] Test connection passes before testing button
- [ ] Page actually contains recipe content

## Notes

- Whitelist is alphabetically sorted to ensure consistency
- Modal for default sites is scrollable (up to 15+ sites now)
- Remove button is styled as cherry red (#dc143c) with minimal padding
- Popup height frozen at 600px to prevent expansion
- Custom sites list shows max 4 items before scrolling

See DEVELOPMENT.md for comprehensive developer documentation.

