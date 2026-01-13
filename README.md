# <img src="public/icons/icon_512.png" width="256" align="center">

# Send2Mealie (1.5.6) (1.5.6) (1.5.6) (1.5.6) (1.5.6) (1.5.6)

**Send recipes from the web directly to your Mealie instance.**

Send2Mealie is a Chrome extension that adds a “Send to Mealie” button to supported recipe websites, allowing you to import recipes into your own Mealie server with minimal friction.

Built for self-hosters who want explicit control, minimal permissions, and predictable behavior.

* * *

## Features

-   **15+ pre-configured recipe sites**
    Works out of the box on popular recipe sites including AllRecipes, Food Network, BBC Good Food, NYT Cooking, and more.

-   **User-added custom sites**
    Add additional recipe websites using Chrome’s optional host permissions. Access is granted only after explicit user approval.

-   **Recipe state detection**
    Automatically indicates when a recipe has already been saved to your Mealie instance (“Mealied!”).

-   **Duplicate detection**
    Optional warning before importing recipes that already exist in Mealie.

-   **Secure configuration storage**
    Mealie server URL and API token are stored using Chrome’s encrypted sync storage.

-   **Immediate settings persistence**
    Configuration changes are saved automatically.

-   **Security-focused design**
    Strict URL validation, redacted error messages, minimal permissions, and no background scraping outside approved sites.


* * *

## Installation

### From Source (Development)

bash

Copy code

`git clone https://github.com/gargolito/send2mealie.git cd send2mealie npm install npm run build`

Load the extension in Chrome:

1.  Open `chrome://extensions/`

2.  Enable **Developer mode**

3.  Click **Load unpacked**

4.  Select the `build/` directory


* * *

## Configuration
Get a token from your mealie server (http://mealie.example.com/user/profile/api-tokens)

1.  Click the Send2Mealie extension icon

2.  Enter your Mealie server URL (HTTPS required)

3.  Enter your Mealie API token (generated in Mealie settings)

4.  Click **Test Connection** to verify connectivity

5.  Add additional recipe sites if desired


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


Additional sites can be added via the popup using explicit Chrome permission prompts.

* * *

## Privacy

Send2Mealie is designed to minimize data access:

-   No analytics, tracking, or telemetry

-   No third-party data sharing

-   Network requests are limited to:

    -   User-approved recipe websites

    -   The user’s configured Mealie server

-   Credentials are stored locally using Chrome’s encrypted sync storage


See [PRIVACY.md](https://chatgpt.com/c/PRIVACY.md) for full details.

* * *

## Development

See [DEVELOPMENT.md](https://chatgpt.com/c/DEVELOPMENT.md) for architecture notes, setup instructions, and contribution guidelines.

* * *

## License

See the `LICENSE` file for details.

