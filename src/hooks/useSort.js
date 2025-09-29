import React, { useState, useCallback } from 'react';
import { Button } from 'react-bootstrap';

export function useSort( sortOptions ) {
	const [ sortBy, setSortBy ] = useState( null );
	const [ isAscending, setIsAscending ] = useState( true );

	const sortData = useCallback( ( key, ascending ) => {
		setSortBy( key );
		setIsAscending( ascending );
	}, [] );

	const getSortButtons = useCallback(
		onSortChange => {
			const cssClass = isAscending ? 'sort-by-asc' : 'sort-by-desc';

			return Object.keys( sortOptions ).map( ( key, index ) => {
				return (
					<Button
						variant="dark"
						className="filter-btn"
						key={ index }
						onClick={ () => {
							const newIsAsc = ! isAscending;
							sortData( key, newIsAsc );
							if ( onSortChange ) {
								onSortChange( key, newIsAsc );
							}
						} }
					>
						{ sortOptions[ key ].toUpperCase() }
						<span className={ sortBy === key ? cssClass : '' } />
					</Button>
				);
			} );
		},
		[ sortOptions, sortBy, isAscending, sortData ]
	);

	return {
		sortBy,
		isAscending,
		sortData,
		getSortButtons,
	};
}
