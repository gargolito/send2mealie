#!/usr/bin/env bash
# Build script for Send2Mealie browser extension
# Usage: ./mkbuild.sh [chrome|firefox|all]
# Default: all

set -e
#source ~/.bash_lazy_loader 2>/dev/null || true
TARGET=${1:-all}
project=${PWD##*/}
version=$(jq -r .version ${PWD}/public/manifest.json)

update_manifest_version() {
    local file_path=$1
    if [[ -f "${file_path}" ]]; then
        jq --arg version "${version}" '.version = $version' "${file_path}" > "${file_path}.tmp"
        mv "${file_path}.tmp" "${file_path}"
    fi
}

update_popup_version() {
    local file_path=$1
    if [[ -f "${file_path}" ]]; then
        sed -ri "s/[\t ]*[0-9]+\.[0-9]+\.[0-9]+$/      ${version}/" "${file_path}"
    fi
}

update_readme_version() {
    if [[ -f "README.md" ]]; then
        sed -ri "s/^# Send2Mealie \([0-9]+\.[0-9]+\.[0-9]+\)/# Send2Mealie (${version})/" README.md
    fi
}

update_versions() {
    update_popup_version public/shared/popup.html
    update_popup_version cowboy/shared/popup.html

    update_manifest_version public-firefox/manifest.json
    update_manifest_version cowboy/chrome/manifest.json
    update_manifest_version cowboy/firefox/manifest.json

    update_readme_version
}

build_chrome() {
    echo "Building Chrome extension..."
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
    node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.firefox.js || exit 1
    [[ -d build-firefox ]] || exit 1
    pushd ./build-firefox > /dev/null 2>&1
    pkg=${project}-${version}.xpi
    [[ -d ../dist/firefox ]] || mkdir ../dist/firefox
    rm -f ../dist/firefox/${project}-*.xpi
    zip -9 -qr ../dist/firefox/$pkg . -x ".history"
    popd > /dev/null 2>&1
    echo "✓ Firefox build: dist/$pkg"
}

# Generate manifests for both browsers
node ./tools/generate-manifest.js all

update_versions

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
