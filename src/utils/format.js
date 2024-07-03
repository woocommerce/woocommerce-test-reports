export function prettyNumber( number ) {
	if ( number >= 1000000 ) {
		return `${ ( number / 1000000 ).toFixed( 2 ) }m`;
	} else if ( number >= 1000 ) {
		return `${ Math.floor( number / 1000 ) }k`;
	} else {
		return `${ number }`;
	}
}
