import React from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';

export default class BaseComponent extends React.Component {
	getSortButtons( sortOptions, currentSortStateBy, currentSortStateIsAsc ) {
		const cssClass = currentSortStateIsAsc ? 'sort-by-asc' : 'sort-by-desc';

		return Object.keys( sortOptions ).map( ( key, index ) => {
			return (
				<Button
					variant="dark"
					className="filter-btn"
					key={ index }
					onClick={ () => {
						this.sortData( key, ! currentSortStateIsAsc );
					} }
				>
					{ sortOptions[ key ].toUpperCase() }
					{ <span className={ currentSortStateBy === key ? cssClass : '' } /> }
				</Button>
			);
		} );
	}

	getTrunkOnlyFilterButton() {
		const icon = this.state.filters.isTrunkOnly ? faCheckSquare : faSquare;

		return (
			<Button
				variant="dark"
				className="filter-btn"
				onClick={ () => {
					this.setState( prevState => ( {
						filters: {
							...prevState.filters,
							isTrunkOnly: ! this.state.filters.isTrunkOnly,
						},
					} ) );
				} }
			>
				<FontAwesomeIcon icon={ icon } /> trunk only
			</Button>
		);
	}

	getFilterByDateFields() {
		const dateFormat = 'YYYY-MM-DD';

		function getValidDate( controlId, fallbackValue ) {
			const element = document.getElementById( controlId );
			return element.value ? element.value : fallbackValue;
		}

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
								this.setDatePickersValues(
									moment().subtract( e[ 1 ], 'd' ).format( dateFormat ),
									moment().format( dateFormat )
								);
								this.setState( prevState => ( {
									filters: {
										...prevState.filters,
										startDate: getValidDate( 'startDate', '1970-01-01' ),
										endDate: getValidDate( 'endDate', moment().format( dateFormat ) ),
									},
								} ) );
							} }
						>
							{ e[ 0 ] }
						</Button>
					) ) }
					<FormControl
						type="date"
						id="startDate"
						max={ moment().format( dateFormat ) }
						onChange={ () => {
							const endDateElement = document.getElementById( 'endDate' );
							const minDate = getValidDate( 'startDate', '2021-10-01' );
							endDateElement.setAttribute( 'min', minDate );
							if (
								moment( endDateElement.value ).format( dateFormat ) <
								moment( minDate ).format( dateFormat )
							) {
								endDateElement.value = minDate;
							}
						} }
					/>
					<FormControl
						className=""
						type="date"
						id="endDate"
						max={ moment().format( 'YYYY-MM-DD' ) }
					/>
					<Button
						variant="dark"
						className="filter-btn"
						onClick={ () => {
							this.setState( prevState => ( {
								filters: {
									...prevState.filters,
									startDate: getValidDate( 'startDate', '1970-01-01' ),
									endDate: getValidDate( 'endDate', moment().format( dateFormat ) ),
								},
							} ) );
						} }
					>
						Apply
					</Button>
				</InputGroup>
			</div>
		);
	}

	setDatePickersValues( start, end ) {
		const startDate = document.getElementById( 'startDate' );
		const endDate = document.getElementById( 'endDate' );
		startDate.value = start;
		endDate.value = end;
	}
}
