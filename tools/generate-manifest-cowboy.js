#!/usr/bin/env node

/**
 * Generate cowboy manifest.json from whitelist
 * Keeps host_permissions, content_scripts matches in sync
 * Supports both Chrome (MV3) and Firefox (MV2) manifests for the cowboy version
 * Cowboy version allows HTTP and IP addresses for Mealie server
 */

const fs = require('fs');
const path = require('path');

// Extract whitelist from whitelist.js (same whitelist as main version)
const whitelistPath = path.join(__dirname, '../src/whitelist.js');
const whitelistContent = fs.readFileSync(whitelistPath, 'utf-8');

// Extract the array content between [ and ]
const arrayMatch = whitelistContent.match(/\[(.*)\]/s);
if (!arrayMatch) {
  console.error('Could not parse whitelist from whitelist.js');
  process.exit(1);
}

// Parse the array items
const sites = arrayMatch[1]
  .split(',')
  .map(s => s.trim())
  .map(s => s.replace(/^"/, '').replace(/"$/, ''))
  .filter(s => s.length > 0)
  .sort(); // Sort alphabetically

console.log(`Found ${sites.length} sites in whitelist:`, sites);

// Generate host_permissions/permissions patterns
const hostPermissions = sites.map(site => `https://*.${site}/*`);

// Generate content_scripts matches
const contentScriptMatches = sites.map(site => `https://*.${site}/*`);

/**
 * Update Chrome cowboy manifest (Manifest V3)
 */
function updateChromeManifest() {
  const manifestPath = path.join(__dirname, '../cowboy/chrome/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.host_permissions = hostPermissions;
  manifest.content_scripts[0].matches = contentScriptMatches;
  manifest.optional_host_permissions = ["http://*/*", "https://*/*"];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('✓ Updated Chrome cowboy manifest.json');
}

/**
 * Update Firefox cowboy manifest (Manifest V2)
 * Firefox MV2 uses 'permissions' instead of 'host_permissions'
 * and 'browser_action' instead of 'action'
 */
function updateFirefoxManifest() {
  const manifestPath = path.join(__dirname, '../cowboy/firefox/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Firefox MV2: host permissions go in the permissions array
  // Keep base permissions and add host permissions
  // 'tabs' permission needed to access tab.url in onUpdated listener
  const basePermissions = ['storage', 'activeTab', 'tabs', 'notifications'];
  manifest.permissions = [...basePermissions, ...hostPermissions];
  manifest.content_scripts[0].matches = contentScriptMatches;
  manifest.optional_permissions = ["http://*/*", "https://*/*"];

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('✓ Updated Firefox cowboy manifest.json');
}

// Update manifests based on target
const targetBrowser = process.argv[2] || 'all';
const validBrowsers = ['chrome', 'firefox', 'all'];
if (!validBrowsers.includes(targetBrowser)) {
  console.error(`Invalid browser: ${targetBrowser}. Use: chrome, firefox, or all`);
  process.exit(1);
}

if (targetBrowser === 'chrome' || targetBrowser === 'all') {
  updateChromeManifest();
}
if (targetBrowser === 'firefox' || targetBrowser === 'all') {
  updateFirefoxManifest();
}

console.log('✓ Cowboy manifests updated (HTTP and IP allowed for Mealie server)');