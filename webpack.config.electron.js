const { resolve } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { merge, config } = require('./webpack.config.common');

module.exports = [
  merge({
    target: 'electron-renderer',

    entry: {
      panel: './src/electron/panel.ts',
    },

    output: {
      path: resolve(__dirname, 'dist', 'electron')
    },

    plugins: config.plugins.concat([
      new CopyWebpackPlugin([
        { from: './src/common/icon.png', flatten: true },
        { from: './src/electron/panel.html', flatten: true }
      ])
    ])
  }),

  merge({
    entry: {
      'injected-script': './src/electron/injected-script.ts',
    },

    output: {
      path: resolve(__dirname, 'dist', 'electron')
    },
  })
]
