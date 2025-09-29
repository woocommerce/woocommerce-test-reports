const pendingRequests = new Map();

export function fetchWithDedup( url, options = {} ) {
	const key = `${ url }-${ JSON.stringify( options ) }`;

	if ( pendingRequests.has( key ) ) {
		return pendingRequests.get( key );
	}

	const promise = fetch( url, options )
		.then( response => {
			pendingRequests.delete( key );
			return response;
		} )
		.catch( error => {
			pendingRequests.delete( key );
			throw error;
		} );

	pendingRequests.set( key, promise );
	return promise;
}
