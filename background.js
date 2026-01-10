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
    console.error('createRecipeViaApi error:', e);
    chrome.notifications?.create({ type: "basic", title: "Mealie error", iconUrl: "icon-128.png", message: `Failed: ${e.message}` });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "createViaApi" && msg.url) {
    (async () => {
      const { mealieUrl, mealieApiKey } = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
      if (!mealieUrl || !mealieApiKey) { chrome.action.openPopup(); sendResponse({ success: false }); return; }
      try {
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
        console.error('createViaApi error:', e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
});
