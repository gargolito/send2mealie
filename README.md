# <img src="public/icons/icon_512.png" width="256" align="center">

# Send2Mealie (1.5.4)

A Chrome extension that adds a "Send to Mealie" button to recipe websites, allowing you to quickly save recipes to your own Mealie server.

## Features

- **15+ pre-configured recipe sites** - Instantly add button to popular recipe websites (AllRecipes, Food Network, BBC Good Food, NYT Cooking, and more)
- **Add custom recipe sites** - Users can add any website with optional host permissions, stored securely in Chrome
- **Auto-detect "Mealied!" state** - Shows when a recipe is already saved to your Mealie instance
- **Duplicate detection** - Optional: warn before sending recipes you've already imported
- **Secure configuration** - Mealie URL and API key stored in Chrome's encrypted sync storage
- **Auto-save settings** - Settings save instantly as you type
- **Security hardened** - Redacted error messages, strict URL validation, minimal permissions

## Install

### From Source (Development)

```bash
git clone https://github.com/gargolito/send2mealie.git
cd send2mealie
npm install
npm run build
```

Then load in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `build/` directory

### Configuration

1. Click the extension icon
2. Enter your Mealie server URL (HTTPS required)
3. Enter your Mealie API key (generated in Mealie settings)
4. Click "Test connection" to verify
5. Add custom recipe sites as needed

### Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup, architecture, and contribution guidelines.

## Supported Recipe Sites

Default supported sites include:
- AllRecipes, BBC Good Food, Budget Bytes, Cooking.com (NYT), Eating Well
- Food.com, Food Network, Sally's Baking Addiction, Serious Eats
- Simply Recipes, Skinny Taste, Tasty, Tasty Kitchen, The Pioneer Woman, The Spruce Eats

Add any site you want via the popup's "Add Custom Site" feature.

## Privacy

Send2Mealie respects your privacy:
- No data collection or tracking
- Only communicates with your Mealie server and recipe websites you approve
- All credentials stored locally in Chrome (encrypted sync storage)
- See [PRIVACY.md](./PRIVACY.md) for full details

## License

See LICENSE file

