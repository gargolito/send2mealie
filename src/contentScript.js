(function () {
  import('./whitelist.js').then(({ DEFAULT_WHITELIST }) => {
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
      const data = await chrome.storage.sync.get(["mealieUrl", "mealieApiKey"]);
      const { mealieUrl, mealieApiKey } = data;
      if (!mealieUrl || !mealieApiKey) {
        chrome.runtime.sendMessage({ type: "openPopup" });
        return;
      }
      btn.textContent = "Sending...";
      btn.style.background = "#9ACD32";
      btn.style.opacity = "0.7";
      btn.style.pointerEvents = "none";
      chrome.runtime.sendMessage({ type: "createViaApi", url: location.href }, (response) => {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
        if (response?.success) {
          btn.style.background = "#E58325";
          btn.textContent = "Mealied!";
          btn.disabled = true;
          btn.style.cursor = "default";
          btn.style.pointerEvents = "none";
        } else if (response?.duplicate) {
          btn.style.background = "#2098eeff";
          btn.textContent = "Already saved ✓";
          setTimeout(() => (btn.textContent = "Send to Mealie"), 3000);
        } else {
          btn.textContent = "Error";
          setTimeout(() => (btn.textContent = "Send to Mealie"), 2000);
        }
      });
    });

    async function checkRecipeExists() {
      try {
        const data = await chrome.storage.sync.get(['mealieUrl', 'mealieApiKey', 'enableDuplicateCheck']);
        if (!data.enableDuplicateCheck || !data.mealieUrl || !data.mealieApiKey) {
          return;
        }

        chrome.runtime.sendMessage(
          { type: "checkDuplicate", url: location.href },
          (response) => {
            if (response?.exists) {
              btn.textContent = "Mealied!";
              btn.style.background = "#E58325";
              btn.disabled = true;
              btn.style.opacity = "0.7";
              btn.style.cursor = "default";
              btn.style.pointerEvents = "none";
            }
          }
        );
      } catch (e) {
        console.error('Send2Mealie: Error checking recipe existence', e);
      }
    }

    async function shouldShowButton() {
      const hostname = new URL(location.href).hostname;
      const domain = hostname.replace(/^www\./, '');

      try {
        const data = await chrome.storage.sync.get(['domainWhitelist', 'userSites', 'mealieUrl', 'mealieApiKey']);
        const whitelist = data.domainWhitelist || DEFAULT_WHITELIST;
        const userSites = data.userSites || [];
        const allDomains = [...whitelist, ...userSites];

        if (allDomains.some(w => domain.endsWith(w))) {
          if (!data.mealieUrl || !data.mealieApiKey) {
            return;
          }

          chrome.runtime.sendMessage(
            { type: "isRecipePage", url: location.href },
            (response) => {
              if (response?.isRecipe) {
                if (document.body) {
                  document.body.appendChild(btn);
                  checkRecipeExists();
                } else {
                  document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(btn);
                    checkRecipeExists();
                  });
                }
              }
            }
          );
        }
      } catch (e) {
        console.error('Send2Mealie: Error checking whitelist', e);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', shouldShowButton);
    } else {
      shouldShowButton();
    }
  });
})();
