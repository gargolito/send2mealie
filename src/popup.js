import { DEFAULT_WHITELIST } from './whitelist.js';

// Use browser namespace (Firefox) if available, otherwise chrome
const api = typeof browser !== 'undefined' ? browser : chrome;

function trimSlash(u) { return u ? u.replace(/\/$/, '') : u; }
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}

async function autoSave() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiToken = document.getElementById("mealieApiToken").value.trim();
  const enableDuplicateCheck = document.getElementById("enableDuplicateCheck").checked;

  const sanitizedUrl = mealieUrl && isValidUrl(mealieUrl) ? mealieUrl : "";
  await api.storage.sync.set({ mealieUrl: sanitizedUrl, mealieApiToken, enableDuplicateCheck });
}

function showDefaultSitesModal() {
  const modal = document.getElementById("modal");
  const listEl = document.getElementById("defaultSitesList");
  listEl.innerHTML = DEFAULT_WHITELIST.map(site => `<li>${site}</li>`).join('');
  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
}

async function load() {
  const cfg = await api.storage.sync.get(["mealieUrl", "mealieApiToken", "enableDuplicateCheck"]) || {};
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiToken").value = cfg.mealieApiToken || "";
  document.getElementById("enableDuplicateCheck").checked = cfg.enableDuplicateCheck || false;

  const pendingSiteUrl = localStorage.getItem("pendingSiteUrl");
  if (pendingSiteUrl) {
    try {
      const urlObj = new URL(pendingSiteUrl);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const origin = `https://*.${domain}/*`;

      // Only add site if permission was actually granted
      const hasPermission = await api.permissions.contains({ origins: [origin] });
      if (hasPermission) {
        const result = await api.storage.sync.get({ userSites: [] }) || {};
        let userSites = result.userSites || [];

        if (!userSites.includes(domain)) {
          userSites.push(domain);
          await api.storage.sync.set({ userSites });
        }
      }
      document.getElementById("customSiteUrl").value = "";
    } catch (err) {
      console.error("Error auto-saving site");
    }
    localStorage.removeItem("pendingSiteUrl");
  }

  renderSitesList();
}

async function renderSitesList() {
  const result = await api.storage.sync.get({ userSites: [] }) || {};
  const userSites = result.userSites || [];
  const listEl = document.getElementById("sitesList");

  if (userSites.length === 0) {
    listEl.innerHTML = '<div style="padding: 8px; color: #999; text-align: center;">No custom sites added</div>';
    return;
  }

  listEl.innerHTML = userSites.map(site => `
    <div class="site-item">
      <span>${site}</span>
      <button data-site="${site}">Remove</button>
    </div>
  `).join('');

  listEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const siteToRemove = e.target.dataset.site;
      const result = await api.storage.sync.get({ userSites: [] }) || {};
      let userSites = result.userSites || [];
      userSites = userSites.filter(s => s !== siteToRemove);
      await api.storage.sync.set({ userSites });

      const origin = `https://*.${siteToRemove}/*`;
      api.permissions.remove({ origins: [origin] }).catch(() => {});

      await renderSitesList();
    });
  });
}

async function test() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiToken = document.getElementById("mealieApiToken").value.trim();
  if (!isValidUrl(mealieUrl)) {
    alert("Invalid Mealie URL. Must be HTTPS.");
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
    // Custom sites are limited to HTTPS origin permissions for consistency across stores
    const origin = `https://*.${domain}/*`;

    // Store pending URL before requesting permission (Firefox closes popup on permission request)
    localStorage.setItem("pendingSiteUrl", url);

    // Request permission synchronously from click handler (required by Firefox)
    api.permissions.request({ origins: [origin] }).then(async (granted) => {
      if (granted) {
        const result = await api.storage.sync.get({ userSites: [] }) || {};
        let userSites = result.userSites || [];
        if (!userSites.includes(domain)) {
          userSites.push(domain);
          await api.storage.sync.set({ userSites });
          localStorage.removeItem("pendingSiteUrl");
          await renderSitesList();
          alert(`Site added: ${domain}`);
        } else {
          localStorage.removeItem("pendingSiteUrl");
          alert(`${domain} is already added.`);
        }
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
