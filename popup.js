const DEFAULT_WHITELIST = ["allrecipes.com", "foodnetwork.com", "food.com", "simplyrecipes.com", "seriouseats.com", "budgetbytes.com", "tasty.co"];

function trimSlash(u) { return u ? u.replace(/\/$/, '') : u; }
function isValidUrl(url) {
  try { new URL(url); return url.startsWith('https://'); } catch { return false; }
}

async function load() {
  const cfg = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey", "defaultAction", "domainWhitelist"]);
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiKey").value = cfg.mealieApiKey || "";
  document.getElementById("defaultAction").value = cfg.defaultAction || "send";
  document.getElementById("domainWhitelist").value = (cfg.domainWhitelist || DEFAULT_WHITELIST).join("\n");
}

async function save() {
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  const defaultAction = document.getElementById("defaultAction").value;
  const domainWhitelist = document.getElementById("domainWhitelist").value.split("\n").map(d => d.trim()).filter(d => d);

  if (!isValidUrl(mealieUrl)) {
    alert("Invalid Mealie URL. Must be HTTPS.");
    return;
  }
  if (!mealieApiKey || mealieApiKey.length < 10) {
    alert("Invalid API key.");
    return;
  }

  await chrome.storage.sync.set({ mealieUrl, mealieApiKey, defaultAction, domainWhitelist });
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
    alert(resp.ok ? "Connection OK" : `Failed: HTTP ${resp.status}`);
  } catch (e) { alert(`Error: ${e.message}`); }
}

async function sendCurrent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { mealieUrl, mealieApiKey } = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
  if (!mealieUrl || !mealieApiKey) { alert("Please configure Mealie first."); return; }
  chrome.runtime.sendMessage({ type: "createViaApi", url: tab.url });
}

async function resetWhitelist() {
  document.getElementById("domainWhitelist").value = DEFAULT_WHITELIST.join("\n");
}

document.getElementById("saveBtn").addEventListener("click", save);
document.getElementById("testBtn").addEventListener("click", test);
document.getElementById("sendBtn").addEventListener("click", sendCurrent);
document.getElementById("resetWhitelistBtn").addEventListener("click", resetWhitelist);
load();
