export function sortArray( data, sortKey, desc = false ) {
	const sorted = data.sort( ( a, b ) =>
		// eslint-disable-next-line no-nested-ternary
		a[ sortKey ] > b[ sortKey ] ? 1 : b[ sortKey ] > a[ sortKey ] ? -1 : 0
	);

	if ( desc ) {
		return sorted.reverse();
	}

	return sorted;
}
