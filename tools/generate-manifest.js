#!/usr/bin/env node

/**
 * Generate manifest.json from whitelist
 * Keeps host_permissions and content_scripts matches in sync with the whitelist
 */

const fs = require('fs');
const path = require('path');

// Extract whitelist from whitelist.js
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
  .filter(s => s.length > 0);

console.log(`Found ${sites.length} sites in whitelist:`, sites);

// Generate host_permissions
const hostPermissions = sites.map(site => `https://*.${site}/*`);

// Generate content_scripts matches
const contentScriptMatches = sites.map(site => `https://*.${site}/*`);

// Read current manifest
const manifestPath = path.join(__dirname, '../public/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Update manifest
manifest.host_permissions = hostPermissions;
manifest.content_scripts[0].matches = contentScriptMatches;

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('✓ Updated manifest.json with whitelist sites');

