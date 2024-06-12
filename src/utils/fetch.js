export async function fetchJsonData( url ) {
	const response = await fetch( url );
	if ( ! response.ok ) {
		console.error( `Error fetching data from ${ url } ${ response.status }` );
	}
	return await response.json();
}
