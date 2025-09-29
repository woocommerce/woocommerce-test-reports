import React from 'react';

export default class ErrorBoundary extends React.Component {
	constructor( props ) {
		super( props );
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError( error ) {
		return { hasError: true, error };
	}

	componentDidCatch( error, errorInfo ) {
		console.error( 'Error caught by boundary:', error, errorInfo );
	}

	handleRetry = () => {
		this.setState( { hasError: false, error: null } );
	};

	render() {
		if ( this.state.hasError ) {
			return (
				<div className="error-boundary">
					<h2>Something went wrong</h2>
					<p>An error occurred while loading this section.</p>
					<button onClick={ this.handleRetry } className="btn btn-primary">
						Try again
					</button>
					{ process.env.NODE_ENV === 'development' && (
						<details style={ { marginTop: '1rem' } }>
							<summary>Error details (development only)</summary>
							<pre style={ { whiteSpace: 'pre-wrap', fontSize: '0.8rem' } }>
								{ this.state.error && this.state.error.toString() }
							</pre>
						</details>
					) }
				</div>
			);
		}

		return this.props.children;
	}
}
