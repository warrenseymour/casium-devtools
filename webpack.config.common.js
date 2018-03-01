const { resolve } = require('path');
const { filter, identity, mergeDeepRight } = require('ramda');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: 'style.css'
});

const isProd = process.env.NODE_ENV === 'production';
const filterTruthy = filter(identity);

module.exports = {
  isProd,

  filterTruthy,

  merge: mergeDeepRight,

  config: {
	  devtool: isProd ? false : 'source-map',

    output: {
      filename: '[name].js'
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },

    module: {
      rules: [{
        test: /\.tsx?$/,
        use: [{
          loader: 'awesome-typescript-loader',
        }]
      }, {
        test: /.scss$/,
        use: extractSass.extract({
          use: [{
            loader: 'css-loader'
          }, {
            loader: 'sass-loader'
          }],

          fallback: 'style-loader'
        })
      }, {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        loader: "url-loader?limit=10000&mimetype=application/font-woff"
      }, {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        loader: "url-loader?limit=10000&mimetype=application/font-woff"
      }, {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        loader: "url-loader?limit=10000&mimetype=application/octet-stream"
      }, {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        loader: "file-loader"
      }, {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: "url-loader?limit=10000&mimetype=image/svg+xml"
      }]
    },

    plugins: filterTruthy([
      extractSass,
      isProd && new UglifyJsPlugin(),
    ])
  }
};
