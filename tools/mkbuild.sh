#!/usr/bin/env bash
# Build script for Send2Mealie browser extension
# Usage: ./mkbuild.sh [chrome|firefox|all]
# Default: all

source ~/.bash_lazy_loader 2>/dev/null || true

TARGET=${1:-all}
project=${PWD##*/}

build_chrome() {
    echo "Building Chrome extension..."
    node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.config.js || exit 1
    [[ -d build ]] || exit 1
    pushd ./build > /dev/null 2>&1
    version=$(jq -r .version manifest.json)
    pkg=${project}-chrome-${version}.zip
    [[ -d ../dist ]] || mkdir ../dist
    rm -f ../dist/${project}-chrome-*.zip
    zip -9 -qr ../dist/$pkg . -x ".history"
    popd > /dev/null 2>&1
    echo "✓ Chrome build: dist/$pkg"
}

build_firefox() {
    echo "Building Firefox extension..."
    node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.firefox.js || exit 1
    [[ -d build-firefox ]] || exit 1
    pushd ./build-firefox > /dev/null 2>&1
    version=$(jq -r .version manifest.json)
    pkg=${project}-firefox-${version}.zip
    [[ -d ../dist ]] || mkdir ../dist
    rm -f ../dist/${project}-firefox-*.zip
    zip -9 -qr ../dist/$pkg . -x ".history"
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
