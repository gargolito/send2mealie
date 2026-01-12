async function isRecipePage(url, mealieUrl, mealieApiKey) {
  try {
    const endpoint = new URL('/api/recipes/test-scrape-url', mealieUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(endpoint.href, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mealieApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) return false;

    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
    return contentLength > 1000;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // no-op
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  try {
    const { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
    if (userSites.length === 0) return;

    const tabUrl = new URL(tab.url);
    const tabDomain = tabUrl.hostname.replace(/^www\./, '');

    if (userSites.some(domain => tabDomain.endsWith(domain))) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['contentScript.js']
      });
    }
  } catch (e) {
    console.error('Error injecting content script:', e);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get(["mealieUrl", "mealieApiKey"], (cfg) => {
    if (!cfg.mealieUrl || !cfg.mealieApiKey) {
      chrome.action.openPopup();
      return;
    }
    createRecipeViaApi(tab.url, cfg.mealieUrl, cfg.mealieApiKey);
  });
});

async function checkDuplicate(url, mealieUrl, mealieApiKey) {
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
        'Authorization': `Bearer ${mealieApiKey}`,
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

async function createRecipeViaApi(url, mealieUrl, mealieApiKey) {
  try {
    const fetchUrl = new URL('/api/recipes/create/url', mealieUrl).href;
    const resp = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mealieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    if (!resp.ok) throw new Error('Failed to send recipe');
    await resp.json();
    chrome.notifications?.create({ type: "basic", title: "Sent to Mealie", iconUrl: "icon-128.png", message: "Recipe URL submitted." });
  } catch (e) {
    chrome.notifications?.create({ type: "basic", title: "Mealie error", iconUrl: "icon-128.png", message: "Failed to send recipe" });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "createViaApi" && msg.url) {
    (async () => {
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey", "enableDuplicateCheck"]);
      const { mealieUrl, mealieApiKey, enableDuplicateCheck } = cfg;
      if (!mealieUrl || !mealieApiKey) { chrome.action.openPopup(); sendResponse({ success: false }); return; }
      try {
        if (enableDuplicateCheck) {
          const existing = await checkDuplicate(msg.url, mealieUrl, mealieApiKey);
          if (existing) {
            sendResponse({ success: false, error: "Recipe already imported", duplicate: true, recipe: existing });
            return;
          }
        }
        const fetchUrl = new URL('/api/recipes/create/url', mealieUrl).href;
        const resp = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mealieApiKey}`,
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
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
      const { mealieUrl, mealieApiKey } = cfg;
      if (!mealieUrl || !mealieApiKey) {
        sendResponse({ exists: false });
        return;
      }
      try {
        const recipe = await checkDuplicate(msg.url, mealieUrl, mealieApiKey);
        sendResponse({ exists: !!recipe });
      } catch (e) {
        sendResponse({ exists: false });
      }
    })();
    return true;
  }

  if (msg?.type === "isRecipePage" && msg.url) {
    (async () => {
      const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
      const { mealieUrl, mealieApiKey } = cfg;
      if (!mealieUrl || !mealieApiKey) {
        sendResponse({ isRecipe: false });
        return;
      }
      try {
        const isRecipe = await isRecipePage(msg.url, mealieUrl, mealieApiKey);
        sendResponse({ isRecipe });
      } catch (e) {
        sendResponse({ isRecipe: false });
      }
    })();
    return true;
  }
});
