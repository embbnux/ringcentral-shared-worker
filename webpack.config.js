const path = require('path');

module.exports = [{
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'build'),
    library: 'RingCentral',
    libraryTarget: 'umd',
    libraryExport: '',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: false
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: [
          'ts-loader',
        ],
        exclude: /node_modules/
      },
    ]
  },
}, {
  entry: './worker/index.ts',
  target: 'webworker',
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'build'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: false
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
}];
