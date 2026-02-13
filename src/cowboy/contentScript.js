import { DEFAULT_WHITELIST } from './whitelist.js';
// Content script responsible for displaying the "Send to Mealie" button
// on user-approved recipe websites and coordinating recipe detection.
// This script does not scrape page content or transmit browsing data.

// Use browser namespace (Firefox) if available, otherwise chrome
const api = typeof browser !== 'undefined' ? browser : chrome;

(function () {
  // Prevents duplicate UI injection on the same page
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
  // Handles explicit user action to send the current recipe URL to Mealie.
  // Recipe import is never performed automatically.
  btn.addEventListener("click", async () => {
    const data = await api.storage.sync.get(["mealieUrl", "mealieApiToken", "openEditMode"]) || {};
    const { mealieUrl, mealieApiToken, openEditMode } = data;
    if (!mealieUrl || !mealieApiToken) {
      api.runtime.sendMessage({ type: "openPopup" });
      return;
    }
    btn.textContent = "Sending...";
    btn.style.background = "#9ACD32";
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";
    api.runtime.sendMessage({ type: "createViaApi", url: location.href }, (response) => {
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
      if (response?.success) {
        btn.style.background = "#E58325";
        if (openEditMode) {
          btn.textContent = "Opening editor...";
        } else {
          btn.textContent = "Mealied!";
          btn.disabled = true;
          btn.style.cursor = "default";
          btn.style.pointerEvents = "none";
        }
      } else if (response?.duplicate) {
        btn.style.background = "#2098eeff";
        if (openEditMode) {
          btn.textContent = "Opening editor...";
        } else {
          btn.textContent = "Already saved ✓";
          setTimeout(() => (btn.textContent = "Send to Mealie"), 3000);
        }
      } else {
        // Errors are intentionally generic to avoid exposing sensitive details.
        btn.textContent = "Error";
        setTimeout(() => (btn.textContent = "Send to Mealie"), 2000);
      }
    });
  });
  // Checks whether the current recipe URL already exists in the user's Mealie instance.
  // Only the page URL is sent; no page content is accessed or transmitted.
  async function checkRecipeExists() {
    try {
      const data = await api.storage.sync.get(['mealieUrl', 'mealieApiToken']) || {};
      if (!data.mealieUrl || !data.mealieApiToken) {
        return;
      }

      api.runtime.sendMessage(
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
      console.error('Send2Mealie: Error checking recipe existence');
    }
  }

  async function shouldShowButton() {
    const hostname = new URL(location.href).hostname;
    const domain = hostname.replace(/^www\./, '');

    try {
      const data = await api.storage.sync.get(['domainWhitelist', 'userSites', 'mealieUrl', 'mealieApiToken']) || {};
      // Built-in supported domains combined with user-approved custom sites.
      // No access occurs outside these domains.
      const whitelist = data.domainWhitelist || DEFAULT_WHITELIST;
      const userSites = data.userSites || [];
      const allDomains = [...whitelist, ...userSites];

      if (allDomains.some(w => domain.endsWith(w))) {
        if (!data.mealieUrl || !data.mealieApiToken) {
          return;
        }
        // Determines whether the current page URL can be scraped as a recipe by Mealie.
        // This is a compatibility check using only the URL; no page content is transmitted.
        api.runtime.sendMessage(
          { type: "isRecipePage", url: location.href },
          (response) => {
            if (response?.isRecipe) {
              if (document.body) {
                // Injects a fixed-position UI button for user interaction.
                // No existing page content or structure is modified.
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
})();
