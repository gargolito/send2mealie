// “Operates only on user-approved sites and transmits only page URLs required for recipe detection and import.”
// This script does not scrape page content or transmit browsing data.

async function isRecipePage(url, mealieUrl, mealieApiToken) {
  try {
    const endpoint = new URL('/api/recipes/test-scrape-url', mealieUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    // Determines whether the current page URL can be scraped as a recipe by Mealie.
    // This request sends only the page URL for compatibility checking.
    // No page content, user data, or browsing history is transmitted.
    const resp = await fetch(endpoint.href, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mealieApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) return false;

    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
    return contentLength > 500;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // no-op
});

// Injects the content script only after page load completes,
// and only on user-approved sites.
// This is required to detect recipe pages and render the "Send to Mealie" UI.
// No browsing data is collected or transmitted during this step.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  try {
    if (!tab.url) return;

    const { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
    if (userSites.length === 0) return;

    const tabUrl = new URL(tab.url);
    const tabDomain = tabUrl.hostname.replace(/^www\./, '');
    if (userSites.some(domain => tabDomain.endsWith(domain))) {
      // Script injection is restricted to domains explicitly approved by the user.
      // No scripts are injected on non-approved sites.
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['contentScript.js']
      });
    }
  } catch (e) {
    console.error('Send2Mealie: Error injecting content script');
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get(["mealieUrl", "mealieApiToken"], (cfg) => {
    if (!cfg.mealieUrl || !cfg.mealieApiToken) {
      chrome.action.openPopup();
      return;
    }
    createRecipeViaApi(tab.url, cfg.mealieUrl, cfg.mealieApiToken);
  });
});

// Checks whether a recipe URL already exists in the user's Mealie instance.
// Only the page URL is transmitted; no page content is accessed or sent.
async function checkDuplicate(url, mealieUrl, mealieApiToken) {
  try {
    const endpoint = new URL('/api/recipes', mealieUrl);

    endpoint.search = new URLSearchParams({
      page: 1,
      perPage: 1,
      queryFilter: `orgURL = "${url}"`
    }).toString();

    const resp = await fetch(endpoint.href, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mealieApiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) return null;

    const data = await resp.json();

    return data?.items?.length > 0 ? data.items[0] : null;
  } catch (e) {
    return null;
  }
}

async function createRecipeViaApi(url, mealieUrl, mealieApiToken) {
  try {
    const fetchUrl = new URL('/api/recipes/create/url', mealieUrl).href;
    const resp = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mealieApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    if (!resp.ok) throw new Error('Failed to send recipe');
    await resp.json();
    // Displays a confirmation notification after an explicit user action.
    // Notifications are not used for advertising or background alerts.
    chrome.notifications?.create({ type: "basic", title: "Sent to Mealie", iconUrl: "icon-128.png", message: "Recipe URL submitted." });
  } catch (e) {
    chrome.notifications?.create({ type: "basic", title: "Mealie error", iconUrl: "icon-128.png", message: "Failed to send recipe" });
  }
}

// Handles messages from content scripts related to recipe detection,
// duplicate checking, and explicit user-initiated imports.
// No background processing occurs outside these scoped requests.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Imports a recipe into Mealie only after explicit user action.
  // This operation is not performed automatically.
  if (msg?.type === "createViaApi" && msg.url) {
    (async () => {
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiToken", "enableDuplicateCheck"]);
      const { mealieUrl, mealieApiToken, enableDuplicateCheck } = cfg;
      if (!mealieUrl || !mealieApiToken) { chrome.action.openPopup(); sendResponse({ success: false }); return; }
      try {
        if (enableDuplicateCheck) {
          const existing = await checkDuplicate(msg.url, mealieUrl, mealieApiToken);
          if (existing) {
            sendResponse({ success: false, error: "Recipe already imported", duplicate: true, recipe: existing });
            return;
          }
        }
        const fetchUrl = new URL('/api/recipes/create/url', mealieUrl).href;
        const resp = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mealieApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: msg.url })
        });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        await resp.json();
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: "Failed to send recipe" });
      }
    })();
    return true;
  }

  if (msg?.type === "checkDuplicate" && msg.url) {
    (async () => {
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiToken"]);
      const { mealieUrl, mealieApiToken } = cfg;
      if (!mealieUrl || !mealieApiToken) {
        sendResponse({ exists: false });
        return;
      }
      try {
        const recipe = await checkDuplicate(msg.url, mealieUrl, mealieApiToken);
        sendResponse({ exists: !!recipe });
      } catch (e) {
        sendResponse({ exists: false });
      }
    })();
    return true;
  }

  if (msg?.type === "isRecipePage" && msg.url) {
    (async () => {
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiToken"]);
      const { mealieUrl, mealieApiToken } = cfg;
      if (!mealieUrl || !mealieApiToken) {
        sendResponse({ isRecipe: false });
        return;
      }
      try {
        const isRecipe = await isRecipePage(msg.url, mealieUrl, mealieApiToken);
        sendResponse({ isRecipe });
      } catch (e) {
        sendResponse({ isRecipe: false });
      }
    })();
    return true;
  }
});
