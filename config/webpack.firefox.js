'use strict';

const path = require('path');
const SizePlugin = require('size-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const PATHS = require('./paths');

// Firefox-specific webpack configuration
// Standalone config (not merged) to avoid plugin conflicts
// Outputs to build/firefox/ and uses common/ for shared assets
const config = {
  entry: {
    popup: PATHS.src + '/popup.js',
    contentScript: PATHS.src + '/contentScript.js',
    background: PATHS.src + '/background.js',
  },
  output: {
    path: path.resolve(__dirname, '../build/firefox'),
    filename: '[name].js',
    // Flatten source paths - strip src/ directory
    devtoolModuleFilenameTemplate: (info) => {
      return info.resourcePath
        .replace(/^.*[\\/]src[\\/]/, '')
        .replace(/\\/g, '/');
    },
  },
  devtool: 'source-map',
  stats: {
    all: false,
    errors: true,
    builtAt: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'images',
              name: '[name].[ext]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new SizePlugin(),
    // Copy shared assets + Firefox manifest + shared icons
    new CopyWebpackPlugin({
      patterns: [
        {
          from: '**/*',
          context: 'common',
        },
        {
          from: 'manifest-firefox.json',
          to: 'manifest.json',
          context: '',
        },
        {
          from: 'icons/**/*',
          context: 'common',
        },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};

module.exports = config;
