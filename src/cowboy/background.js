// "Operates only on user-approved sites and transmits only page URLs required for recipe detection and import."
// This script does not scrape page content or transmit browsing data.

import { executeScript, openPopup } from './browser-polyfill.js';

// Use browser namespace (Firefox) if available, otherwise chrome
const api = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined';
const actionAPI = api.action || api.browserAction;
const permissionWarningState = new Map();

function flagPermissionWarning(tabId, domain) {
  if (!actionAPI?.setBadgeText) return;
  const current = permissionWarningState.get(tabId);
  if (current === domain) return;
  permissionWarningState.set(tabId, domain);
  actionAPI.setBadgeBackgroundColor?.({ color: '#d93025', tabId });
  actionAPI.setBadgeText({ text: '!', tabId });
  actionAPI.setTitle?.({
    tabId,
    title: `Grant Send2Mealie permission for ${domain} via the popup`
  });
}

function clearPermissionWarning(tabId) {
  if (!actionAPI?.setBadgeText) return;
  if (!permissionWarningState.has(tabId)) return;
  permissionWarningState.delete(tabId);
  actionAPI.setBadgeText({ text: '', tabId });
  actionAPI.setTitle?.({ tabId, title: 'Send to Mealie' });
}

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
    return contentLength > 100;
  } catch (e) {
    return false;
  }
}

api.runtime.onInstalled.addListener(() => {
  // no-op
});

// Injects the content script only after page load completes,
// and only on user-approved sites.
// This is required to detect recipe pages and render the "Send to Mealie" UI.
// No browsing data is collected or transmitted during this step.
api.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  try {
    if (!tab.url) return;

    const result = await api.storage.sync.get({ userSites: [] }) || {};
    const userSites = result.userSites || [];
    if (userSites.length === 0) {
      clearPermissionWarning(tabId);
      return;
    }

    const tabUrl = new URL(tab.url);
    const tabDomain = tabUrl.hostname.replace(/^www\./, '');

    // Check if current domain matches any user site
    const matchedDomain = userSites.find(domain => tabDomain.endsWith(domain));
    if (matchedDomain) {
      // Try to inject the script - will fail silently if no permission
      try {
        await executeScript(tabId, ['contentScript.js']);
        clearPermissionWarning(tabId);
      } catch (injectionError) {
        const message = injectionError?.message || '';
        if (/Missing host permission|Cannot access contents of the page/i.test(message)) {
          console.warn('Send2Mealie: Missing host permission for tab', tabId, matchedDomain);
          flagPermissionWarning(tabId, matchedDomain);
        } else {
          console.error('Send2Mealie: Error injecting content script', injectionError);
        }
      }
    } else {
      clearPermissionWarning(tabId);
    }
  } catch (e) {
    console.error('Send2Mealie: Error in tabs.onUpdated listener', e);
  }
});

// Handle action/browserAction click - use appropriate API based on browser
if (actionAPI?.onClicked) {
  actionAPI.onClicked.addListener((tab) => {
    api.storage.sync.get(["mealieUrl", "mealieApiToken", "openEditMode", "enableParse"]).then(async (cfg) => {
      if (!cfg.mealieUrl || !cfg.mealieApiToken) {
        openPopup();
        return;
      }
      try {
        const recipe = await createRecipeViaApi(tab.url, cfg.mealieUrl, cfg.mealieApiToken);
        if (cfg.openEditMode && recipe) {
          await openRecipeEditPage(recipe, cfg.mealieUrl, cfg.mealieApiToken, cfg.enableParse);
        }
      } catch (e) {
        // Error already handled in createRecipeViaApi
      }
    });
  });
}

// Checks whether a recipe URL already exists in the user's Mealie instance.
// Only the page URL is transmitted; no page content is accessed or sent.
async function checkDuplicate(url, mealieUrl, mealieApiToken) {
  try {
    const endpoint = new URL('/api/recipes', mealieUrl);

    const sanitizedUrl = JSON.stringify(url || '');
    endpoint.search = new URLSearchParams({
      page: 1,
      perPage: 1,
      queryFilter: `orgURL = ${sanitizedUrl}`
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
    const recipe = await resp.json();
    // Displays a confirmation notification after an explicit user action.
    // Notifications are not used for advertising or background alerts.
    api.notifications?.create({ type: "basic", title: "Sent to Mealie", iconUrl: "icon-128.png", message: "Recipe URL submitted." });
    return recipe;
  } catch (e) {
    api.notifications?.create({ type: "basic", title: "Mealie error", iconUrl: "icon-128.png", message: "Failed to send recipe" });
    throw e;
  }
}

async function getGroupSlug(mealieUrl, mealieApiToken) {
  try {
    const resp = await fetch(`${mealieUrl}/api/groups/self`, {
      headers: { Authorization: `Bearer ${mealieApiToken}` }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.slug;
  } catch (e) {
    return null;
  }
}

async function waitForRecipeSlug(recipe, mealieUrl, mealieApiToken, maxRetries = 10) {
  // Handle case where recipe is just a string (name/slug)
  if (typeof recipe === 'string') {
    console.warn('Send2Mealie: Recipe response is a string, not an object:', recipe);
    // Try to fetch recipe by searching or just return early
    return { slug: recipe };
  }

  // If slug is already available, return recipe immediately
  if (recipe?.slug) {
    console.log('Send2Mealie: Recipe slug already available:', recipe.slug);
    return recipe;
  }

  // If recipe has an ID, try to fetch it with retries
  if (!recipe?.id) {
    console.error('Send2Mealie: Recipe has no ID or slug', JSON.stringify(recipe));
    // If no ID, assume response contains the slug and return
    if (recipe?.name) {
      return { slug: recipe.name };
    }
    return recipe;
  }

  // Wait and retry to get the recipe slug
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between retries
    try {
      const resp = await fetch(`${mealieUrl}/api/recipes/${recipe.id}`, {
        headers: { Authorization: `Bearer ${mealieApiToken}` }
      });
      if (resp.ok) {
        const updatedRecipe = await resp.json();
        if (updatedRecipe?.slug) {
          console.log('Send2Mealie: Recipe slug ready after', (i + 1) * 500, 'ms:', updatedRecipe.slug);
          return updatedRecipe;
        }
      }
    } catch (e) {
      console.error('Send2Mealie: Error fetching recipe details on retry', i + 1, e);
    }
  }

  console.warn('Send2Mealie: Recipe slug not available after retries', JSON.stringify(recipe));
  return recipe;
}

async function openRecipeEditPage(recipe, mealieUrl, mealieApiToken, enableParse) {
  // Handle string recipe (just slug/name)
  let recipeSlug = recipe?.slug || (typeof recipe === 'string' ? recipe : null);
  
  if (!recipeSlug) {
    console.error('Send2Mealie: Cannot determine recipe slug from', JSON.stringify(recipe));
    return false;
  }

  try {
    const groupSlug = await getGroupSlug(mealieUrl, mealieApiToken);
    if (!groupSlug) {
      console.error('Send2Mealie: Failed to fetch group slug');
      return false;
    }

    const params = new URLSearchParams({ edit: 'true' });
    if (enableParse) {
      params.append('parse', 'true');
    }

    const editUrl = `${mealieUrl}/g/${groupSlug}/r/${recipeSlug}?${params.toString()}`;
    console.log('Send2Mealie: Opening editor:', editUrl);
    await api.tabs.create({ url: editUrl });
    return true;
  } catch (e) {
    console.error('Send2Mealie: Error opening recipe edit page', e);
    return false;
  }
}

// Handles messages from content scripts related to recipe detection,
// duplicate checking, and explicit user-initiated imports.
// No background processing occurs outside these scoped requests.
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Imports a recipe into Mealie only after explicit user action.
  // This operation is not performed automatically.
  if (msg?.type === "createViaApi" && msg.url) {
    (async () => {
      const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken", "enableDuplicateCheck", "openEditMode", "enableParse"]);
      const { mealieUrl, mealieApiToken, enableDuplicateCheck, openEditMode, enableParse } = cfg;
      if (!mealieUrl || !mealieApiToken) { openPopup(); sendResponse({ success: false }); return; }
      try {
        if (enableDuplicateCheck) {
          const existing = await checkDuplicate(msg.url, mealieUrl, mealieApiToken);
          if (existing) {
            sendResponse({ success: false, error: "Recipe already imported", duplicate: true, recipe: existing });
            if (openEditMode) {
              // Wait for recipe to be fully processed before opening edit page
              const updatedRecipe = await waitForRecipeSlug(existing, mealieUrl, mealieApiToken);
              await openRecipeEditPage(updatedRecipe, mealieUrl, mealieApiToken, enableParse);
            }
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
        let recipe = await resp.json();
        if (openEditMode) {
          // Wait for recipe to be fully processed before opening edit page
          recipe = await waitForRecipeSlug(recipe, mealieUrl, mealieApiToken);
          openRecipeEditPage(recipe, mealieUrl, mealieApiToken, enableParse).catch(e => {
            console.error('Send2Mealie: Failed to open edit page after recipe creation', e);
          });
        }
        sendResponse({ success: true });
      } catch (e) {
        console.error('Send2Mealie: Error in createViaApi', e);
        sendResponse({ success: false, error: "Failed to send recipe" });
      }
    })();
    return true;
  }

  if (msg?.type === "checkDuplicate" && msg.url) {
    (async () => {
      const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken"]);
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
      const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken"]);
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
