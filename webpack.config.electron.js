const { resolve } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { merge, config } = require('./webpack.config.common');

module.exports = merge(config, {
  target: 'electron-renderer',

  entry: {
    messaging: './src/electron/messaging.ts',
    panel: './src/electron/panel.ts'
  },

  output: {
    path: resolve(__dirname, 'dist', 'electron')
  },

  plugins: [
    ...config.plugins,

    new CopyWebpackPlugin([
      { from: './src/common/icon.png', flatten: true },
      { from: './src/electron/panel.html', flatten: true }
    ])
  ]
});
