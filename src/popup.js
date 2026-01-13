// const DEFAULT_WHITELIST = ["allrecipes.com", "eatingwell.com", "foodnetwork.com", "food.com", "simplyrecipes.com", "seriouseats.com", "budgetbytes.com", "tasty.co"];

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

async function load() {
  const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey", "enableDuplicateCheck"]);
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiKey").value = cfg.mealieApiKey || "";
  document.getElementById("enableDuplicateCheck").checked = cfg.enableDuplicateCheck || false;

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
      renderSitesList();
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
    const origin = urlObj.origin + "/*";
    const domain = urlObj.hostname.replace(/^www\./, '');

    console.log(`Requesting permission for: ${origin}`);

    const hasPermission = await chrome.permissions.contains({
      origins: [origin]
    });
    console.log(`Already has permission: ${hasPermission}`);

    if (hasPermission) {
      let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
      console.log(`Current userSites: ${JSON.stringify(userSites)}`);
      if (!userSites.includes(domain)) {
        userSites.push(domain);
        await chrome.storage.sync.set({ userSites });
        console.log(`Saved userSites: ${JSON.stringify(userSites)}`);
        renderSitesList();
      }
      alert(`Site added: ${domain}`);
    } else {
      const granted = await chrome.permissions.request({
        origins: [origin]
      });

      console.log(`Permission request result: ${granted}`);

      if (granted) {
        console.log(`Permission granted for ${origin}`);
        let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
        console.log(`Current userSites: ${JSON.stringify(userSites)}`);
        if (!userSites.includes(domain)) {
          userSites.push(domain);
          await chrome.storage.sync.set({ userSites });
          console.log(`Saved userSites: ${JSON.stringify(userSites)}`);
          renderSitesList();
        }
        alert(`Site added: ${domain}`);
      } else {
        console.warn(`Permission denied for ${origin}`);
        alert(`Permission denied. The site cannot be added.`);
      }
    }
  } catch (err) {
    console.error("Error adding site:", err);
    alert("Invalid URL. Please enter a valid website URL.");
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
load();
