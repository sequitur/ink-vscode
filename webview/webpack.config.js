'use strict';

const Path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = {
    entry: {
      preview: [Path.resolve(__dirname, 'preview/preview.js')]
    },
    output: {
      path: Path.resolve(__dirname),
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: Path.resolve(__dirname, 'preview/preview.html'),
        inject: true,
        inlineSource: '.(js|css)$',
        filename: Path.resolve(__dirname, 'preview.html'),
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css"
      }),
      new HtmlWebpackInlineSourcePlugin(),
      new OptimizeCSSAssetsPlugin({})
    ],
    resolve: {
      extensions: ['.js'],
      modules: [Path.resolve(__dirname), 'node_modules']
    },
    module: {
      rules: [
          {
              test: /\.css$/,
              use: [
                  {
                      loader: MiniCssExtractPlugin.loader
                  },
                  {
                      loader: 'css-loader',
                      options: {
                        minimize: true,
                        sourceMap: true,
                      }
                  },
              ],
              exclude: /node_modules/
          }
      ]
    },
}
