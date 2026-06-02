const globals = require( 'globals' );
const prettierConfig = require( 'eslint-config-prettier' );
const wordpress = require( '@wordpress/eslint-plugin' );

const importResolver = {
	node: {
		extensions: [ '.js', '.jsx', '.json', '.css', '.svg' ],
	},
};

const wordpressConfig = wordpress.configs[ 'recommended-with-formatting' ].map( config => {
	if ( ! config.settings?.[ 'import/resolver' ] ) {
		return config;
	}

	return {
		...config,
		settings: {
			...config.settings,
			'import/resolver': importResolver,
		},
	};
} );

module.exports = [
	{
		ignores: [ 'node_modules/**', 'docs/**', 'downloads/**', 'dist/**', 'data/**' ],
	},
	...wordpressConfig,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		settings: {
			'import/resolver': importResolver,
		},

		rules: {
			'arrow-parens': [ 0, 'as-needed' ],
			'no-console': 0,
			camelcase: 0,
		},
	},
	prettierConfig,
];
