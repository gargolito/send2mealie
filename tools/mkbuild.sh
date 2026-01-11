#!/usr/bin/env bash
source ~/.bash_lazy_loader
node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.config.js && \
project=${PWD##*/}
[[ -d build ]] || exit 1
pushd ./build > /dev/null 2>&1
version=$(jq -r .version ../public/manifest.json)
pkg=${project}-${version}.zip
[[ -d ../dist ]] || mkdir ../dist
rm ../dist/*
zip -9 -qr ../dist/$pkg . -x ".history"
popd > /dev/null 2>&1
tree dist