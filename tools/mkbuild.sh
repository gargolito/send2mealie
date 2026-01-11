#!/usr/bin/env bash
source ~/.bash_lazy_loader
node ./node_modules/webpack/bin/webpack.js --mode=production --config config/webpack.config.js
