import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getDataSourceUrl } from '../config';
import config from '../config.json';
import { FormControl } from 'react-bootstrap';
import moment from 'moment';

const Errors = React.memo( () => {
	const [ rawData, setRawData ] = useState( {} );
	const [ searchTerm, setSearchTerm ] = useState( 'Timed out \\d+ms' );
	const [ isDataReady, setIsDataReady ] = useState( false );
	const [ errorMessage, setErrorMessage ] = useState( '' );

	useEffect( () => {
		const fetchData = async () => {
			try {
				const response = await fetch( `${ getDataSourceUrl() }/data/errors.json`, {
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				} );
				const jsonData = await response.json();
				setRawData( jsonData );
				setIsDataReady( true );
			} catch ( error ) {
				console.error( error );
			}
		};

		fetchData();
	}, [] );

	const filteredData = useMemo( () => {
		if ( ! rawData.errors || ! isDataReady ) {
			return { errors: [], count: 0, lastUpdate: null };
		}

		let regex;
		let errors = [];

		try {
			regex = new RegExp( searchTerm, 'i' );
			errors = rawData.errors.filter( e => {
				return regex.test( e.trace ) || regex.test( e.test ) || regex.test( e.path );
			} );
			setErrorMessage( '' );
		} catch ( e ) {
			console.error( `Invalid regex pattern: ${ searchTerm }`, e );
			setErrorMessage( 'Invalid regex pattern' );
			errors = [];
		}

		return {
			errors,
			count: errors.length,
			lastUpdate: rawData.lastUpdate,
		};
	}, [ rawData, searchTerm, isDataReady ] );

	const handleSearchChange = useCallback( event => {
		setSearchTerm( event.target.value );
		setErrorMessage( '' );
	}, [] );

	const getReportUrl = useCallback( error => {
		return `${ config.reportDeepUrl }/${ error.path }/#testresult/${ error.source.replace(
			'.json',
			''
		) }`;
	}, [] );

	const renderFiltersColumn = useCallback( () => {
		return (
			<div className="filtersRow">
				<div className="search-input-container">
					<svg
						aria-hidden="true"
						height="16"
						viewBox="0 0 16 16"
						version="1.1"
						width="16"
						data-view-component="true"
						className="search-icon"
					>
						<path
							fillRule="evenodd"
							d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
						/>
					</svg>
					<FormControl
						className="search-input search-errors"
						type="text"
						onChange={ handleSearchChange }
						value={ searchTerm }
					/>
				</div>
			</div>
		);
	}, [ handleSearchChange, searchTerm ] );

	if ( ! isDataReady ) {
		return null;
	}

	return (
		<div>
			<div className="row headerRow">
				<div className="col">
					<span>{ filteredData.count } results</span>
					<br />
					<span className="caption">updated { moment( filteredData.lastUpdate ).fromNow() }</span>
				</div>
				<div className="col filters right-align">{ renderFiltersColumn() }</div>
			</div>
			<p className="error">{ errorMessage }</p>
			<ul className="flowsList errorsList">
				{ filteredData.errors.map( ( error, errorIndex ) => (
					<li key={ errorIndex }>
						<a className="flowLink" href={ getReportUrl( error ) } target="_blank" rel="noreferrer">
							{ error.test }
						</a>{ ' ' }
						<br />
						<small className="flowMetaData">{ error.path }</small>
						<br />
						<div className="trace">
							{ error.trace.length > 1000
								? `${ error.trace.substring( 0, 1000 ) }...`
								: error.trace }
						</div>
					</li>
				) ) }
			</ul>
		</div>
	);
} );

Errors.displayName = 'Errors';

export default Errors;
