# Privacy Policy – Send2Mealie

Effective date: YYYY-MM-DD

## Overview

Send2Mealie is a Chrome extension that detects recipe pages on user-approved websites and allows users to send those recipes to their own Mealie server.

The extension is designed to minimize data access and does not collect personal information.

## Data Collection

Send2Mealie does not collect, log, or aggregate personal data.

The extension does not use analytics, telemetry, advertising identifiers, or tracking technologies.

## Data Access and Use

Send2Mealie accesses the following data strictly to perform its core functionality:

### Recipe Page URLs

- On websites explicitly approved by the user, Send2Mealie checks whether the current page can be scraped as a recipe.
- When a recipe page is detected, the page URL is sent to the user’s Mealie server to determine whether the recipe already exists.
- If the user chooses to import the recipe, the page URL is sent to the user’s Mealie server for processing.

### Mealie Configuration Data

- The Mealie server URL and API token are provided by the user.
- These credentials are stored using Chrome’s encrypted sync storage.
- Credentials are used only to authenticate requests to the user’s own Mealie instance.

## Data Sharing

Send2Mealie does not sell, share, or transfer data to third parties.

All network requests are limited to:
- User-approved recipe websites
- The user’s configured Mealie server

## User Control

- The extension runs only on websites explicitly approved by the user.
- Additional sites require explicit approval via Chrome’s permission prompt.
- Removing a site immediately stops all access to that site.
- Uninstalling the extension removes all locally stored data.

## Data Retention and Deletion

Send2Mealie retains no data outside the user’s browser or the user’s Mealie server.

All locally stored configuration data is deleted when the extension is uninstalled.

## Changes to This Policy

Updates to this privacy policy will be published in the project repository and reflected in the Chrome Web Store listing.
