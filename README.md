# <img src="public/icons/icon_512.png" width="512" align="center">

# Send2Mealie

## Features

- Adds a "Send to Mealie" button to whitelisted recipe sites.
- Configurable whitelist: add or remove recipe websites as needed.
- Detects if a recipe is already in Mealie and displays "Mealied!" button state on page load.
- Persistent button state after successful send—remains "Mealied!" without additional API calls.
- Optional duplicate URL detection to prevent re-importing recipes.
- Secure credential storage via Chrome's encrypted sync storage.
- Security-hardened: redacted error messages, strict URL validation, minimal host permissions.

## Install
- git clone github.com/gargolito/send2mealie
- cd send2mealie
- node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.config.js
- in your Chrome-based browser, go to settings/extensions
- enable developer mode
- click on **Load unpacked**
- navigate to the build directory, click ok
- configure with your Mealie URL and API key (generated from Mealie)

TBD: [**Chrome** extension store]()
