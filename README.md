# <img src="public/icons/icon_512.png" width="256" align="center">
* * *
[![!Chrome Webstore](https://developer.chrome.com/static/docs/webstore/branding/image/UV4C4ybeBTsZt43U4xis.png)](https://chromewebstore.google.com/detail/send2mealie/eagkljoemahmoockacaccngpahbljddl) [![Firefox Browser Addons](https://blog.mozilla.org/addons/files/2015/11/get-the-addon.png)](https://addons.mozilla.org/addon/send2mealie)

# Send2Mealie (1.7.1)
**Send recipes from the web directly to your [Mealie](https://github.com/mealie-recipes/mealie) instance.**

Send2Mealie is a browser extension for Chrome and Firefox that adds a “Send to Mealie” button to Mealie supported recipe websites, allowing you to import recipes into your own Mealie server with minimal friction.

Built for self-hosters who want explicit control, minimal permissions, and predictable behavior.

**Note:** NOT ASSOCIATED WITH MEALIE.

* * *

## Features

-   **15+ pre-configured recipe sites**
    Works out of the box on popular recipe sites including AllRecipes, Food Network, BBC Good Food, NYT Cooking, and more.

-   **User-added custom sites**
    Add additional recipe websites using the browser’s optional host permissions. Access is granted only after explicit user approval, and custom permissions are restricted to HTTPS origins for parity across stores.

-   **Recipe state detection**
    Automatically indicates when a recipe has already been saved to your Mealie instance (“Mealied!”).

-   **Duplicate detection**
    Optional warning before importing recipes that already exist in Mealie.

-   **Secure configuration storage**
    Mealie server URL and API token are stored using the browser’s encrypted sync storage.

-   **Immediate settings persistence**
    Configuration changes are saved automatically.

-   **Action-scoped notifications**
    Browser notifications are displayed only after you explicitly send a recipe, providing success or failure confirmation without background alerts.

-   **Security-focused design**
    Strict URL validation, redacted error messages, minimal permissions, and no background scraping outside approved sites.

* * *

## Installation

### From Source (Development)

```bash
git clone https://github.com/gargolito/send2mealie.git
cd send2mealie
npm install
npm run build      # Chrome build → build/
npm run build:firefox  # Firefox build → build-firefox/

# Distribution packages
npm run dist:chrome      # Chrome zip → dist/chrome/
npm run dist:firefox     # Firefox xpi → dist/firefox/
npm run dist:cowboy:chrome  # Cowboy Chrome zip → dist/cowboy/chrome/
npm run dist:cowboy:firefox # Cowboy Firefox xpi → dist/cowboy/firefox/
npm run dist:cowboy:all     # Both cowboy packages
```

#### Cowboy Version (For Self-Hosted/Local Development)

The cowboy version is intended for development installations with:
- **HTTP** protocol (not just HTTPS)
- **IP addresses** (e.g., `192.168.1.100:8000`)
- **Self-signed SSL certificates**
- **Non-standard domain names** (e.g., `mealie.local`)

⚠️ **Important:** This version is **not** submitted to extension stores and is for personal/development use only.

```bash
npm run build:cowboy:chrome    # Chrome → build-cowboy/chrome/
npm run build:cowboy:firefox   # Firefox → build-cowboy/firefox/
npm run build:cowboy:all       # Both
```

#### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `build/` directory

#### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `build-firefox/manifest.json`


* * *

## Configuration

### Getting Your API Token
1. Open your Mealie server: `http://mealie.example.com` (or your server URL)
2. Go to **Profile** → **API Tokens** (or `/user/profile/api-tokens`)
3. Create a new token or copy an existing one

### Configuring Send2Mealie
1. Click the **Send2Mealie** extension icon
2. Enter your Mealie server URL
   - Standard: `https://mealie.example.com`
   - Local/HTTP: `http://localhost:8000` or `http://192.168.1.100:8080` (cowboy version only)
3. Paste your API token
4. Click **Test Connection** to verify connectivity

### Adding Custom Recipe Sites
You can add recipe websites beyond the default 15+ sites:

1. Visit a recipe page on any website
2. Enter the full recipe URL in the **"Add another site"** field (e.g., `https://example.com/recipe/pasta`)
3. Click **Add Site**
4. The extension validates that recipes can be scraped from the site
5. If valid, your browser prompts for permission; grant it to enable the extension on that site
6. The "Send to Mealie" button will now appear on that site's recipe pages

**Notes:**
- Only HTTPS sites are supported (browser security requirement) — use the [Cowboy version](#cowboy-version-for-self-hostedlocal-development) for HTTP
- You must enter a full **recipe page URL**, not just the domain
- If scraping fails, the site cannot be added


* * *

## Supported Recipe Sites

Default mealie supported sites include:

-   AllRecipes

-   BBC Good Food

-   Budget Bytes

-   Eating Well

-   Food.com

-   Food Network

-   NYT Cooking

-   Sally’s Baking Addiction

-   Serious Eats

-   Simply Recipes

-   Skinny Taste

-   Tasty

-   Tasty Kitchen

-   The Pioneer Woman

-   The Spruce Eats


Additional sites can be added via the popup using explicit browser permission prompts.

* * *

## Privacy

Send2Mealie is designed to minimize data access:

-   No analytics, tracking, or telemetry

-   No third-party data sharing

-   Network requests are limited to:

    -   User-approved recipe websites

    -   The user’s configured Mealie server

-   Credentials are stored locally using the browser’s encrypted sync storage


See [PRIVACY.md](https://chatgpt.com/c/PRIVACY.md) for full details.

* * *

## Development

See [DEVELOPMENT.md](https://chatgpt.com/c/DEVELOPMENT.md) for architecture notes, setup instructions, and contribution guidelines.

* * *

## License

See the `LICENSE` file for details.
