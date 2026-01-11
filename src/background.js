chrome.runtime.onInstalled.addListener(() => {
  // no-op
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
    const searchUrl = new URL('/api/recipes', mealieUrl).href;
    const resp = await fetch(`${searchUrl}?search=${encodeURIComponent(url)}`, {
      headers: { 'Authorization': `Bearer ${mealieApiKey}` }
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
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    await resp.json();
    chrome.notifications?.create({ type: "basic", title: "Sent to Mealie", iconUrl: "icon-128.png", message: "Recipe URL submitted." });
  } catch (e) {
    chrome.notifications?.create({ type: "basic", title: "Mealie error", iconUrl: "icon-128.png", message: `Failed: ${e.message}` });
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
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
});
