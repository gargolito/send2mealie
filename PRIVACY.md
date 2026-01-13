# Privacy Policy – Send2Mealie

**Effective Date:** 2026-01-13

## Overview

Send2Mealie is a browser extension that allows users to send recipe URLs to their self-hosted Mealie instance. The extension is built with a "privacy-first" architecture: it does not scrape page content, does not track browsing history, and only operates on domains explicitly approved by the user.

## Data Collection and Transmission

Send2Mealie does not collect, log, or aggregate personal data. No analytics or telemetry tools are included in the source code.

### 1\. Recipe URLs

- **Detection:** On approved sites, the extension sends only the current tab's URL to the user's Mealie instance to verify if the page is a compatible recipe.

- **Duplicate Checking:** The URL is used to query the user's Mealie database to check if the recipe has already been imported.

- **Importing:** Only upon explicit user action (clicking the "Send to Mealie" button), the URL is transmitted to the Mealie API for processing.

- **No Content Scraping:** The extension does **not** read or transmit the page's HTML, text content, or images. All scraping is performed server-side by the user's Mealie instance.


### 2\. Authentication Credentials

- The Mealie URL and API Token provided by the user are stored locally using `chrome.storage.sync`.

- These credentials are transmitted only to the user-specified Mealie server for authentication purposes.


## Permissions and User Control

- **Limited Operation:** The extension's content script only executes on a pre-defined whitelist of recipe sites or custom domains manually added by the user.

- **Host Permissions:** The extension requests host permissions only for the user's specific Mealie instance and any custom domains added via the "Add Site" feature.

- **Revocation:** Users can remove site permissions at any time through the extension popup, which triggers `chrome.permissions.remove`.


## Data Retention and Third Parties

- **No Third-Party Sharing:** No data is ever sold, shared, or transferred to third parties or external servers.

- **Local Deletion:** All configuration data, including API tokens, is removed from the browser when the extension is uninstalled.