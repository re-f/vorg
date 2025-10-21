// @ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // VSCode 扩展运行在 Node.js 环境
  mode: 'none', // 在 package.json 中通过 scripts 控制模式

  entry: './src/extension.ts', // 扩展入口
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2', // VSCode 扩展使用 commonjs2
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'nosources-source-map', // 生成 source map 但不包含源代码
  externals: {
    vscode: 'commonjs vscode' // vscode 模块不打包，由 VSCode 运行时提供
  },
  resolve: {
    extensions: ['.ts', '.js'] // 支持的文件扩展名
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  performance: {
    hints: false // 关闭性能警告
  }
};

module.exports = config;

