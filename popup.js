function trimSlash(u){return u?u.replace(/\/$/,''):u}
async function load(){
  const cfg = await chrome.storage.sync.get(["mealieUrl","mealieApiKey","defaultAction"]);
  document.getElementById("mealieUrl").value = cfg.mealieUrl || "";
  document.getElementById("mealieApiKey").value = cfg.mealieApiKey || "";
  document.getElementById("defaultAction").value = cfg.defaultAction || "send";
}
async function save(){
  const mealieUrl = document.getElementById("mealieUrl").value.trim();
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  const defaultAction = document.getElementById("defaultAction").value;
  await chrome.storage.sync.set({ mealieUrl, mealieApiKey, defaultAction });
  window.close();
}
async function test(){
  const mealieUrl = trimSlash(document.getElementById("mealieUrl").value.trim());
  const mealieApiKey = document.getElementById("mealieApiKey").value.trim();
  try{
    const resp = await fetch(`${mealieUrl}/api/app/about`, { headers: { Authorization: `Bearer ${mealieApiKey}`, "Api-Key": mealieApiKey, "X-Api-Key": mealieApiKey }});
    alert(resp.ok ? "Connection OK" : `Failed: HTTP ${resp.status}`);
  }catch(e){ alert(`Error: ${e.message}`); }
}
async function sendCurrent(){
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  const { mealieUrl, mealieApiKey } = await chrome.storage.sync.get(["mealieUrl","mealieApiKey"]);
  if (!mealieUrl || !mealieApiKey) { alert("Please configure Mealie first."); return; }
  chrome.runtime.sendMessage({ type: "createViaApi", url: tab.url });
}

document.getElementById("saveBtn").addEventListener("click", save);
document.getElementById("testBtn").addEventListener("click", test);
document.getElementById("sendBtn").addEventListener("click", sendCurrent);
load();
