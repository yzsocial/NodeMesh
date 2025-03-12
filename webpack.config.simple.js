const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
  ],
  // Disable source maps and other features that might cause issues
  devtool: false,
  // Simplified dev server config
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3001, // Use a non-standard port
    open: false, // Don't open browser automatically
    hot: false, // Disable hot module replacement
  },
}; 