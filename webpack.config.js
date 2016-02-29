var webpack = require('webpack')
var path = require('path')

var config = {
  entry: [
     __dirname + '/src/index.js'
  ],
  output: {
    path: __dirname + '/dist',
    filename: 'perspective.js',
  },
  resolve: {
    extensions: ['', '.js'],
  },
  module: {
    loaders: [
        {
          test: /\.jsx?$/,
          loader: 'babel',
          include: [
            path.resolve(__dirname, 'src'),
          ]
        },
    ],
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin({
      'process.env': { 'NODE_ENV': JSON.stringify('production') },
    }),
  ],
}

module.exports = config
