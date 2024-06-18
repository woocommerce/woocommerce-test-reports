const path = require( 'path' );
const HtmlWebpackPlugin = require( 'html-webpack-plugin' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
const manifest = require( './manifest.json' );

module.exports = {
	entry: './src/index.js',
	output: {
		path: path.resolve( __dirname, 'dist' ),
		filename: 'bundle.js',
		publicPath: '/woocommerce-test-reports/',
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.css$/,
				use: [ 'style-loader', 'css-loader' ],
			},
			{
				test: /\.(png|svg)$/,
				use: [ 'file-loader' ],
			},
			{
				test: /\.json$/,
				type: 'javascript/auto',
				exclude: /(node_modules|bower_components)/,
				use: [
					{
						loader: 'json-loader',
					},
				],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin( {
			template: './src/templates/index.html',
			favicon: './src/assets/favicon.ico',
			title: manifest.name,
			meta: {
				description: manifest.description,
			},
		} ),
		new CopyWebpackPlugin( {
			patterns: [
				{ from: 'src/static', to: '.' },
				{ from: 'manifest.json', to: 'manifest.json' },
			],
		} ),
	],
};
