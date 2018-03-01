const { resolve } = require('path');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { merge, config, isProd, filterTruthy } = require('./webpack.config.common');

module.exports = merge(config, {
  entry: {
    'content-script': './src/web-ext/content-script.ts',
    background: './src/web-ext/background.ts',
    devtools: './src/web-ext/devtools.ts',
    messaging: './src/web-ext/messaging.ts',
    panel: './src/common/panel.ts'
  },

  output: {
    path: resolve(__dirname, 'dist', 'web-ext')
  },

  plugins: filterTruthy([
    ...config.plugins,

    !isProd && new ChromeExtensionReloader(),

    new CopyWebpackPlugin(filterTruthy([
      !isProd && { from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map', flatten: true },
      { from: './src/common/*.png', flatten: true },
      { from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js', flatten: true },
      { from: './src/web-ext/manifest.json', flatten: true },
      { from: './src/web-ext/devtools.html', flatten: true },
      { from: './src/web-ext/panel.html', flatten: true },
    ])),
  ])
});