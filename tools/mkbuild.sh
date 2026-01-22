#!/usr/bin/env bash
# Build script for Send2Mealie browser extension
# Usage: ./mkbuild.sh [chrome|firefox|all]
# Default: all

source ~/.bash_lazy_loader 2>/dev/null || true

TARGET=${1:-all}
project=${PWD##*/}
version=$(jq -r .version manifest.json)

build_chrome() {
    echo "Building Chrome extension..."
    sed -ri "s/[\t ]*[0-9]+\.[0-9]+\.[0-9]+$/      ${version}/" public/popup.html
    node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.config.js || exit 1
    [[ -d build ]] || exit 1
    pushd ./build > /dev/null 2>&1
    pkg=${project}-${version}.zip
    [[ -d ../dist/chrome ]] || mkdir ../dist/chrome
    rm -f ../dist/chrome/${project}-*.zip
    zip -9 -qr ../dist/chrome/$pkg . -x ".history"
    popd > /dev/null 2>&1
    echo "✓ Chrome build: dist/$pkg"
}

build_firefox() {
    echo "Building Firefox extension..."
    sed -ri "s/[\t ]*[0-9]+\.[0-9]+\.[0-9]+$/      ${version}/" public-firefox/popup.html
    node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.firefox.js || exit 1
    [[ -d build-firefox ]] || exit 1
    pushd ./build-firefox > /dev/null 2>&1
    pkg=${project}-${version}.zip
    [[ -d ../dist/firefox ]] || mkdir ../dist/firefox
    rm -f ../dist/firefox/${project}-*.zip
    zip -9 -qr ../dist/firefox/$pkg . -x ".history"
    popd > /dev/null 2>&1
    echo "✓ Firefox build: dist/$pkg"
}

# Generate manifests for both browsers
node ./tools/generate-manifest.js all

case "$TARGET" in
    chrome)
        build_chrome
        ;;
    firefox)
        build_firefox
        ;;
    all)
        build_chrome
        build_firefox
        ;;
    *)
        echo "Usage: $0 [chrome|firefox|all]"
        exit 1
        ;;
esac

echo ""
tree dist
