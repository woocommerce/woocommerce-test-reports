const common = require( './webpack.config.common' );
const { join } = require( 'node:path' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
const webpack = require( 'webpack' );

module.exports = {
	...common,
	mode: 'development',
	devtool: 'inline-source-map',
	devServer: {
		static: {
			directory: join( __dirname, 'dist' ),
		},
		compress: true,
		port: 3000,
	},
	plugins: [
		...common.plugins,
		new CopyWebpackPlugin( {
			patterns: [ { from: 'data', to: 'data' } ],
		} ),
		new webpack.DefinePlugin( {
			'process.env': {
				NODE_ENV: JSON.stringify( 'development' ),
			},
		} ),
	],
};
