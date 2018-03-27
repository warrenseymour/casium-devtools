const { resolve } = require('path');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { merge, config, isDev, filter } = require('./webpack.config.common');

module.exports = merge({
  entry: {
    'content-script': './src/web-ext/content-script.ts',
    'injected-script': './src/web-ext/injected-script.ts',
    background: './src/web-ext/background.ts',
    devtools: './src/web-ext/devtools.ts',
    messaging: './src/web-ext/messaging.ts',
    panel: './src/web-ext/panel.ts'
  },

  output: {
    path: resolve(__dirname, 'dist', 'web-ext')
  },

  plugins: config.plugins.concat(filter([
    isDev && new ChromeExtensionReloader(),

    new CopyWebpackPlugin(filter([
      isDev && { from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map', flatten: true },
      { from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js', flatten: true },
      { from: './src/common/*.png', flatten: true },
      { from: './src/web-ext/manifest.json', flatten: true },
      { from: './src/web-ext/devtools.html', flatten: true },
      { from: './src/web-ext/panel.html', flatten: true },
    ])),
  ]))
});
