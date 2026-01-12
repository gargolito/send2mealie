// const DEFAULT_WHITELIST = ["allrecipes.com", "eatingwell.com", "foodnetwork.com", "food.com", "simplyrecipes.com", "seriouseats.com", "budgetbytes.com", "tasty.co"];
let initialState = {};

function trimSlash(u) { return u ? u.replace(/\/$/, '') : u; }
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}

function hasChanges() {
  const current = {
    url: document.getElementById("mealieUrl").value.trim(),
    key: document.getElementById("mealieApiKey").value.trim(),
    check: document.getElementById("enableDuplicateCheck").checked
  };
  return JSON.stringify(current) !== JSON.stringify(initialState);
}

function updateSaveButtonState() {
  const saveBtn = document.getElementById("saveBtn");
  if (hasChanges()) {
    saveBtn.classList.remove("no-change");
    saveBtn.classList.add("changed");
  } else {
    saveBtn.classList.remove("changed");
    saveBtn.classList.add("no-change");
  }
}

async function load() {
  const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey", "enableDuplicateCheck"]);
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiKey").value = cfg.mealieApiKey || "";
  document.getElementById("enableDuplicateCheck").checked = cfg.enableDuplicateCheck || false;

  initialState = {
    url: document.getElementById("mealieUrl").value.trim(),
    key: document.getElementById("mealieApiKey").value.trim(),
    check: document.getElementById("enableDuplicateCheck").checked
  };
  updateSaveButtonState();
}

async function save() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  const enableDuplicateCheck = document.getElementById("enableDuplicateCheck").checked;

  if (!isValidUrl(mealieUrl)) {
    alert("Invalid Mealie URL. Must be HTTPS.");
    return;
  }
  if (!mealieApiKey || mealieApiKey.length < 10) {
    alert("Invalid API key.");
    return;
  }

  await chrome.storage.sync.set({ mealieUrl, mealieApiKey, enableDuplicateCheck });
  window.close();
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
    alert(resp.ok ? "Connection OK" : "Connection failed");
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

    // Check if already have permission
    const hasPermission = await chrome.permissions.contains({
      origins: [origin]
    });
    console.log(`Already has permission: ${hasPermission}`);

    if (hasPermission) {
      // Already have permission, just add to storage
      let { userSites = [] } = await chrome.storage.sync.get({ userSites: [] });
      console.log(`Current userSites: ${JSON.stringify(userSites)}`);
      if (!userSites.includes(domain)) {
        userSites.push(domain);
        await chrome.storage.sync.set({ userSites });
        console.log(`Saved userSites: ${JSON.stringify(userSites)}`);
      }
      alert(`Site added: ${domain}`);
    } else {
      // Request permission
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

document.getElementById("mealieUrl").addEventListener("input", updateSaveButtonState);
document.getElementById("mealieApiKey").addEventListener("input", updateSaveButtonState);
document.getElementById("enableDuplicateCheck").addEventListener("change", updateSaveButtonState);

document.getElementById("saveBtn").addEventListener("click", save);
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
