import React, { useState, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import checkSquare from '../assets/check-square.svg';
import square from '../assets/square.svg';

export function useDataRangeFilter( initialValue = false ) {
	const [ isAllData, setIsAllData ] = useState( initialValue );

	const toggleDataRange = useCallback( () => {
		setIsAllData( prev => ! prev );
	}, [] );

	const getDataRangeFilterButton = useCallback(
		onChange => {
			const icon = isAllData ? checkSquare : square;

			return (
				<Button
					variant="dark"
					className="filter-btn"
					onClick={ () => {
						toggleDataRange();
						if ( onChange ) {
							onChange( ! isAllData );
						}
					} }
				>
					<img src={ icon } width={ 16 } height={ 16 } alt="checkbox" /> all data
				</Button>
			);
		},
		[ isAllData, toggleDataRange ]
	);

	return {
		isAllData,
		toggleDataRange,
		getDataRangeFilterButton,
	};
}
