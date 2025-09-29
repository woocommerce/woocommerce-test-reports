import React, { useState, useCallback, useRef } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import moment from 'moment';

export function useDateFilter() {
	const [ startDate, setStartDate ] = useState( '1970-01-01' );
	const [ endDate, setEndDate ] = useState( moment().format( 'YYYY-MM-DD' ) );
	const startDateRef = useRef( null );
	const endDateRef = useRef( null );

	const setDatePickersValues = useCallback( ( start, end ) => {
		if ( startDateRef.current ) {
			startDateRef.current.value = start;
		}
		if ( endDateRef.current ) {
			endDateRef.current.value = end;
		}
		setStartDate( start );
		setEndDate( end );
	}, [] );

	const getValidDate = useCallback( ( ref, fallbackValue ) => {
		return ref.current?.value || fallbackValue;
	}, [] );

	const handleStartDateChange = useCallback( () => {
		const newStartDate = getValidDate( startDateRef, '2021-10-01' );
		const minDate = newStartDate;

		if ( endDateRef.current ) {
			endDateRef.current.setAttribute( 'min', minDate );
			if (
				moment( endDateRef.current.value ).format( 'YYYY-MM-DD' ) <
				moment( minDate ).format( 'YYYY-MM-DD' )
			) {
				endDateRef.current.value = minDate;
				setEndDate( minDate );
			}
		}
		setStartDate( newStartDate );
	}, [ getValidDate ] );

	const applyDateFilter = useCallback(
		onChange => {
			const newStartDate = getValidDate( startDateRef, '1970-01-01' );
			const newEndDate = getValidDate( endDateRef, moment().format( 'YYYY-MM-DD' ) );
			setStartDate( newStartDate );
			setEndDate( newEndDate );
			if ( onChange ) {
				onChange( { startDate: newStartDate, endDate: newEndDate } );
			}
		},
		[ getValidDate ]
	);

	const getFilterByDateFields = useCallback(
		onChange => {
			const dateFormat = 'YYYY-MM-DD';

			return (
				<div className="col filters">
					<InputGroup>
						{ [
							[ 'today', 0 ],
							[ 'last 7 days', 7 ],
							[ 'last 14 days', 14 ],
						].map( ( e, index ) => (
							<Button
								key={ index }
								variant="dark"
								className="filter-btn"
								onClick={ () => {
									const start = moment().subtract( e[ 1 ], 'd' ).format( dateFormat );
									const end = moment().format( dateFormat );
									setDatePickersValues( start, end );
									if ( onChange ) {
										onChange( { startDate: start, endDate: end } );
									}
								} }
							>
								{ e[ 0 ] }
							</Button>
						) ) }
						<FormControl
							ref={ startDateRef }
							type="date"
							max={ moment().format( dateFormat ) }
							onChange={ handleStartDateChange }
						/>
						<FormControl ref={ endDateRef } type="date" max={ moment().format( 'YYYY-MM-DD' ) } />
						<Button
							variant="dark"
							className="filter-btn"
							onClick={ () => applyDateFilter( onChange ) }
						>
							Apply
						</Button>
					</InputGroup>
				</div>
			);
		},
		[ setDatePickersValues, handleStartDateChange, applyDateFilter ]
	);

	return {
		startDate,
		endDate,
		setStartDate,
		setEndDate,
		setDatePickersValues,
		getFilterByDateFields,
	};
}
