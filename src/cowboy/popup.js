import { DEFAULT_WHITELIST } from './whitelist.js';

// Use browser namespace (Firefox) if available, otherwise chrome
const api = typeof browser !== 'undefined' ? browser : chrome;

function trimSlash(u) { return u ? u.replace(/\/$/, '') : u; }

// Cowboy version: Allows HTTP and IP addresses for Mealie URL
// This is for developer installations only, not for extension stores
function isValidUrl(url) {
  try {
    const u = new URL(url);
    // Allow both http and https, and IP addresses
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0;
  } catch {
    return false;
  }
}

function isIpOrLocalhost(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost') return true;
  if (hostname.includes(':')) return true; // IPv6
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function getMealieOriginPattern(urlObj) {
  return `${urlObj.protocol}//${urlObj.hostname}/*`;
}

function getMealiePermissionOrigins(urlObj) {
  const domain = urlObj.hostname.replace(/^www\./, '');
  if (isIpOrLocalhost(domain)) {
    return [`http://${domain}/*`, `https://${domain}/*`];
  }
  return [getMealieOriginPattern(urlObj)];
}

function getSiteOriginPattern(urlObj) {
  const domain = urlObj.hostname.replace(/^www\./, '');
  if (isIpOrLocalhost(domain)) {
    return `${urlObj.protocol}//${domain}/*`;
  }
  return `${urlObj.protocol}//*.${domain}/*`;
}

function getOriginPatternsForDomain(domain) {
  if (isIpOrLocalhost(domain)) {
    return [`http://${domain}/*`, `https://${domain}/*`];
  }
  return [`http://*.${domain}/*`, `https://*.${domain}/*`];
}

async function hasAnyOriginPermission(origins) {
  for (const origin of origins) {
    // permissions.contains requires all origins to be present, so check individually
    const hasPermission = await api.permissions.contains({ origins: [origin] });
    if (hasPermission) return true;
  }
  return false;
}

async function requestMealieOriginPermission(mealieUrl) {
  if (!mealieUrl) return false;
  try {
    const urlObj = new URL(mealieUrl);
    const origins = getMealiePermissionOrigins(urlObj);
    const hasPermission = await hasAnyOriginPermission(origins);
    if (hasPermission) return true;
    return await api.permissions.request({ origins });
  } catch {
    return false;
  }
}

async function autoSave() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiToken = document.getElementById("mealieApiToken").value.trim();
  const enableDuplicateCheck = document.getElementById("enableDuplicateCheck").checked;
  const openEditMode = document.getElementById("openEditMode").checked;
  const enableParse = document.getElementById("enableParse").checked;

  const sanitizedUrl = mealieUrl && isValidUrl(mealieUrl) ? mealieUrl : "";
  await api.storage.sync.set({ mealieUrl: sanitizedUrl, mealieApiToken, enableDuplicateCheck, openEditMode, enableParse });
}

function showDefaultSitesModal() {
  const modal = document.getElementById("modal");
  const listEl = document.getElementById("defaultSitesList");
  listEl.replaceChildren();
  DEFAULT_WHITELIST.forEach(site => {
    const li = document.createElement('li');
    li.textContent = site;
    listEl.appendChild(li);
  });
  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
}

async function load() {
  const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken", "enableDuplicateCheck", "openEditMode", "enableParse"]) || {};
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiToken").value = cfg.mealieApiToken || "";
  document.getElementById("enableDuplicateCheck").checked = cfg.enableDuplicateCheck || false;
  document.getElementById("openEditMode").checked = cfg.openEditMode || false;
  document.getElementById("enableParse").checked = cfg.enableParse || false;

  const pendingSiteUrl = localStorage.getItem("pendingSiteUrl");
  if (pendingSiteUrl) {
    try {
      const urlObj = new URL(pendingSiteUrl);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const origin = getSiteOriginPattern(urlObj);

      // Only add site if permission was actually granted
      const hasPermission = await api.permissions.contains({ origins: [origin] });
      if (hasPermission) {
        // Test if Mealie can scrape this site before adding it
        await validateAndAddSite(pendingSiteUrl, domain);
      }
      document.getElementById("customSiteUrl").value = "";
    } catch (err) {
      console.error("Error auto-saving site");
    }
    localStorage.removeItem("pendingSiteUrl");
  }

  renderSitesList();
}

async function validateAndAddSite(url, domain) {
  try {
    const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken"]) || {};
    const { mealieUrl, mealieApiToken } = cfg;

    if (!mealieUrl || !mealieApiToken) {
      alert("Please configure Mealie first.");
      return;
    }

    // Test if Mealie can scrape this site
    const response = await new Promise((resolve) => {
      api.runtime.sendMessage({ type: "isRecipePage", url }, resolve);
    });

    if (response?.isRecipe) {
      // Site is valid, add it to userSites
      const result = await api.storage.sync.get({ userSites: [] }) || {};
      let userSites = result.userSites || [];

      if (!userSites.includes(domain)) {
        userSites.push(domain);
        await api.storage.sync.set({ userSites });
        await renderSitesList();
        alert(`✓ Site added: ${domain}\nMealie can parse this site.`);
      } else {
        alert(`${domain} is already added.`);
      }
    } else {
      // Site cannot be scraped by Mealie
      alert(`✗ Cannot add site: ${domain}\n\nMealie cannot parse recipes from this site. The site may not be supported.`);
    }
  } catch (err) {
    console.error("Error validating site", err);
    alert("Error validating site. Please try again.");
  }
}

async function renderSitesList() {
  const result = await api.storage.sync.get({ userSites: [] }) || {};
  const userSites = result.userSites || [];
  const listEl = document.getElementById("sitesList");

  listEl.replaceChildren();

  if (userSites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'padding: 8px; color: #999; text-align: center;';
    emptyMsg.textContent = 'No custom sites added';
    listEl.appendChild(emptyMsg);
    return;
  }

  userSites.forEach(site => {
    const div = document.createElement('div');
    div.className = 'site-item';

    const span = document.createElement('span');
    span.textContent = site;

    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.addEventListener('click', async () => {
      const result = await api.storage.sync.get({ userSites: [] }) || {};
      let currentSites = result.userSites || [];
      currentSites = currentSites.filter(s => s !== site);
      await api.storage.sync.set({ userSites: currentSites });

      const origins = getOriginPatternsForDomain(site);
      api.permissions.remove({ origins }).catch(() => { });

      await renderSitesList();
    });

    div.appendChild(span);
    div.appendChild(btn);
    listEl.appendChild(div);
  });
}

async function test() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiToken = document.getElementById("mealieApiToken").value.trim();
  if (!isValidUrl(mealieUrl)) {
    alert("Invalid Mealie URL. Must be HTTP or HTTPS.");
    return;
  }
  const hasOriginPermission = await requestMealieOriginPermission(mealieUrl);
  if (!hasOriginPermission) {
    alert("Permission denied. Please allow access to your Mealie server URL.");
    return;
  }
  try {
    // Use /api/users/self which requires valid authentication
    const resp = await fetch(`${mealieUrl}/api/users/self`, {
      headers: { Authorization: `Bearer ${mealieApiToken}` }
    });
    if (resp.ok) {
      await api.storage.sync.set({ mealieUrl, mealieApiToken });
      alert("Connection OK");
    } else if (resp.status === 401) {
      alert("Invalid API token");
    } else {
      alert("Connection failed");
    }
  } catch (e) { alert("Connection error"); }
}

async function sendCurrent() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const { mealieUrl, mealieApiToken } = await api.storage.sync.get(["mealieUrl", "mealieApiToken"]);
  if (!mealieUrl || !mealieApiToken) { alert("Please configure Mealie first."); return; }
  api.runtime.sendMessage({ type: "createViaApi", url: tab.url });
}

function addUserSite(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const origin = getSiteOriginPattern(urlObj);

    // Store pending URL before requesting permission (Firefox closes popup on permission request)
    localStorage.setItem("pendingSiteUrl", url);

    // Request permission synchronously from click handler (required by Firefox)
    api.permissions.request({ origins: [origin] }).then(async (granted) => {
      if (granted) {
        localStorage.removeItem("pendingSiteUrl");
        await validateAndAddSite(url, domain);
      } else {
        localStorage.removeItem("pendingSiteUrl");
        alert("Permission denied.");
      }
    });
  } catch (err) {
    console.error("Error adding site");
    alert("Invalid URL. Please enter a valid website URL (e.g., https://example.com or https://example.com/recipe/123).");
  }
}

document.getElementById("mealieUrl").addEventListener("input", autoSave);
document.getElementById("mealieApiToken").addEventListener("input", autoSave);
document.getElementById("enableDuplicateCheck").addEventListener("change", autoSave);
document.getElementById("openEditMode").addEventListener("change", autoSave);
document.getElementById("enableParse").addEventListener("change", autoSave);

document.getElementById("testBtn").addEventListener("click", test);
document.getElementById("addSiteBtn").addEventListener("click", () => {
  const url = document.getElementById("customSiteUrl").value.trim();
  if (url) {
    addUserSite(url);
    document.getElementById("customSiteUrl").value = "";
  } else {
    alert("Please enter a valid URL.");
  }
});

document.getElementById("infoBtn").addEventListener("click", (e) => {
  e.preventDefault();
  showDefaultSitesModal();
});

document.getElementById("modalClose").addEventListener("click", closeModal);

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") {
    closeModal();
  }
});

load();
