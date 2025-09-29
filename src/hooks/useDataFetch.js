import { useState, useEffect } from 'react';
import { fetchWithDedup } from '../utils/fetchWithDedup';

export function useDataFetch( urls, options = {} ) {
	const [ data, setData ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		const fetchData = async () => {
			try {
				setLoading( true );
				setError( null );

				const headers = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					...options.headers,
				};

				if ( Array.isArray( urls ) ) {
					const responses = await Promise.all(
						urls.map( url => fetchWithDedup( url, { ...options, headers } ) )
					);
					const jsonData = await Promise.all( responses.map( response => response.json() ) );
					setData( jsonData );
				} else {
					const response = await fetchWithDedup( urls, { ...options, headers } );
					const jsonData = await response.json();
					setData( jsonData );
				}
			} catch ( err ) {
				setError( err );
				console.error( 'Fetch error:', err );
			} finally {
				setLoading( false );
			}
		};

		fetchData();
	}, [ urls, options ] );

	return { data, loading, error };
}
