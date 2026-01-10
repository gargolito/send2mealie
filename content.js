(function() {
  const BTN_ID = "add-to-mealie-button";
  if (document.getElementById(BTN_ID)) return;

  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.textContent = "Send to Mealie";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "2147483647";
  btn.style.background = "#E58325";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.padding = "10px 14px";
  btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  btn.style.cursor = "pointer";
  btn.style.font = "14px/1.2 -apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,\"Fira Sans\", \"Droid Sans\", \"Helvetica Neue\", Arial, sans-serif";

  btn.addEventListener("click", async () => {
    const { mealieUrl, mealieApiKey } = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
    if (!mealieUrl || !mealieApiKey) {
      chrome.runtime.sendMessage({ type: "openPopup" });
      return;
    }
    btn.textContent = "Sending...";
    chrome.runtime.sendMessage({ type: "createViaApi", url: location.href }, (response) => {
      if (response?.success) {
        btn.textContent = "Sent!";
        setTimeout(() => (btn.textContent = "Send to Mealie"), 2000);
      } else {
        btn.textContent = "Error";
        setTimeout(() => (btn.textContent = "Send to Mealie"), 2000);
      }
    });
  });

  function shouldShowButton() {
    const hostname = new URL(location.href).hostname;
    const domain = hostname.replace(/^www\./, '');
    chrome.storage.sync.get(['domainWhitelist'], (data) => {
      const whitelist = data.domainWhitelist || ["allrecipes.com", "foodnetwork.com", "food.com", "simplyrecipes.com", "seriouseats.com", "budgetbytes.com", "tasty.co"];
      console.log('Domain:', domain, 'Match:', whitelist.some(w => domain.endsWith(w)));
      if (whitelist.some(w => domain.endsWith(w))) {
        if (document.body) {
          document.body.appendChild(btn);
        } else {
          document.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
        }
      }
    });
  }

  shouldShowButton();
})();
