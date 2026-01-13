// const DEFAULT_WHITELIST = ["allrecipes.com","bbcgoodfood.com","budgetbytes.com","cooking.nytimes.com","eatingwell.com","food.com","foodnetwork.com","sallysbakingaddiction.com","seriouseats.com","simplyrecipes.com","skinnytaste.com","tasty.co","tastykitchen.com","thepioneerwoman.com","thespruceeats.com"];
const DEFAULT_WHITELIST = ["allrecipes.com","bbcgoodfood.com","budgetbytes.com","cooking.nytimes.com","eatingwell.com","food.com","foodnetwork.com","sallysbakingaddiction.com","seriouseats.com","simplyrecipes.com","skinnytaste.com","tasty.co","tastykitchen.com","thepioneerwoman.com","thespruceeats.com"];

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
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  const enableDuplicateCheck = document.getElementById("enableDuplicateCheck").checked;

  await chrome.storage.sync.set({ mealieUrl, mealieApiKey, enableDuplicateCheck });
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
  const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey", "enableDuplicateCheck"]);
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiKey").value = cfg.mealieApiKey || "";
  document.getElementById("enableDuplicateCheck").checked = cfg.enableDuplicateCheck || false;

  const pendingSiteUrl = localStorage.getItem("pendingSiteUrl");
  if (pendingSiteUrl) {
    try {
      const urlObj = new URL(pendingSiteUrl);
      const domain = urlObj.hostname.replace(/^www\./, '');
      let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });

      if (!userSites.includes(domain)) {
        userSites.push(domain);
        await chrome.storage.sync.set({ userSites });
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
  const { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
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
      let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
      userSites = userSites.filter(s => s !== siteToRemove);
      await chrome.storage.sync.set({ userSites });

      chrome.permissions.remove({ origins: [`https://${siteToRemove}/*`] }, () => {
        console.log('Permission update processed');
      });

      await renderSitesList();
    });
  });
}

async function test() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  if (!isValidUrl(mealieUrl)) {
    alert("Invalid Mealie URL. Must be HTTPS.");
    return;
  }
  try {
    const resp = await fetch(`${mealieUrl}/api/app/about`, { headers: { Authorization: `Bearer ${mealieApiKey}` } });
    if (resp.ok) {
      await chrome.storage.sync.set({ mealieUrl, mealieApiKey });
      alert("Connection OK");
    } else {
      alert("Connection failed");
    }
  } catch (e) { alert("Connection error"); }
}

async function sendCurrent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { mealieUrl, mealieApiKey } = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
  if (!mealieUrl || !mealieApiKey) { alert("Please configure Mealie first."); return; }
  chrome.runtime.sendMessage({ type: "createViaApi", url: tab.url });
}

async function addUserSite(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const origin = `https://${domain}/*`;

    const hasPermission = await chrome.permissions.contains({
      origins: [origin]
    });

    if (!hasPermission) {
      localStorage.setItem("pendingSiteUrl", url);
      alert(`Click OK to grant permission for ${domain}. Return to this popup when done.`);
      chrome.permissions.request({ origins: [origin] });
      return;
    }

    let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
    if (!userSites.includes(domain)) {
      userSites.push(domain);
      await chrome.storage.sync.set({ userSites });
      await renderSitesList();
      alert(`Site added: ${domain}`);
    } else {
      alert(`${domain} is already added.`);
    }
  } catch (err) {
    console.error("Error adding site");
    alert("Invalid URL. Please enter a valid website URL (e.g., https://example.com or https://example.com/recipe/123).");
  }
}

document.getElementById("mealieUrl").addEventListener("input", autoSave);
document.getElementById("mealieApiKey").addEventListener("input", autoSave);
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
