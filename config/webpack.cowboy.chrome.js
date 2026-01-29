'use strict';

const path = require('path');
const SizePlugin = require('size-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Cowboy version - allows HTTP and IP addresses
// Outputs to build-cowboy/chrome/ and uses cowboy/chrome/ for static assets
const config = {
  entry: {
    popup: path.resolve(__dirname, '../src/cowboy/popup.js'),
    contentScript: path.resolve(__dirname, '../src/cowboy/contentScript.js'),
    background: path.resolve(__dirname, '../src/cowboy/background.js'),
  },
  output: {
    path: path.resolve(__dirname, '../build-cowboy/chrome'),
    filename: '[name].js',
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
    new CopyWebpackPlugin({
      patterns: [
        {
          from: '**/*',
          context: 'cowboy/chrome',
        },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};

module.exports = config;