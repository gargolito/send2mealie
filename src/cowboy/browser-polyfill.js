/**
 * Browser API compatibility layer for Chrome MV3 and Firefox MV2
 * Provides unified API that works across both browsers
 */

// Detect browser environment
const isFirefox = typeof browser !== 'undefined' && browser.runtime?.id;

// Use browser namespace if available (Firefox), otherwise chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Unified action/browserAction API
 * Chrome MV3 uses 'action', Firefox MV2 uses 'browserAction'
 */
const actionAPI = browserAPI.action || browserAPI.browserAction;

/**
 * Execute script in a tab
 * Chrome MV3: chrome.scripting.executeScript({ target: { tabId }, files: [...] })
 * Firefox MV2: browser.tabs.executeScript(tabId, { file: ... })
 */
async function executeScript(tabId, files) {
  if (browserAPI.scripting?.executeScript) {
    // Chrome MV3
    return browserAPI.scripting.executeScript({
      target: { tabId },
      files: files
    });
  } else {
    // Firefox MV2 - execute each file sequentially
    for (const file of files) {
      await browserAPI.tabs.executeScript(tabId, { file });
    }
  }
}

/**
 * Open the extension popup
 * Note: Firefox doesn't support programmatically opening the popup
 * This is a no-op on Firefox
 */
function openPopup() {
  if (actionAPI?.openPopup) {
    try {
      actionAPI.openPopup();
    } catch (e) {
      // Firefox doesn't support this - silent fail
      console.log('Send2Mealie: Popup cannot be opened programmatically');
    }
  }
}

export {
  browserAPI,
  actionAPI,
  isFirefox,
  executeScript,
  openPopup
};
