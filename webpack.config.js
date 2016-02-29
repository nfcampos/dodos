var webpack = require('webpack')
var path = require('path')

var config = {
  entry: path.resolve(__dirname, 'src/dodo.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dodos.js',
    library: 'Dodos',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['', '.js'],
  },
  module: {
    loaders: [
        {
          test: /\.jsx?$/,
          loader: 'babel',
          include: path.resolve(__dirname, 'src'),
        },
    ],
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
}

module.exports = config
