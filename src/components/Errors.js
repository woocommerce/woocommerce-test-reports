import React from 'react';
import BaseComponent from './BaseComponent';
import { getDataSourceUrl } from '../config';
import config from '../config.json';
import { FormControl } from 'react-bootstrap';
import moment from 'moment';

export default class Errors extends BaseComponent {
	rawData = {};
	data = {};
	state = {
		filters: { searchTerm: 'Timeout 20000ms exceeded' },
		isDataReady: false,
	};

	async componentDidMount() {
		await fetch( `${ getDataSourceUrl() }/data/errors.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.rawData = jsonData;
			} )
			.catch( console.error );

		this.filterAndSortData();

		this.setState( {
			isDataReady: true,
		} );
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( this.state.filters !== prevState.filters ) {
			this.filterAndSortData();
		}
	}

	filterAndSortData() {
		const { searchTerm } = this.state.filters;

		this.data.errors = this.rawData.errors.filter( e => {
			return (
				e.message.toLowerCase().includes( searchTerm.toLowerCase() ) ||
				e.trace.toLowerCase().includes( searchTerm.toLowerCase() )
			);
		} );

		this.data.count = this.data.errors.length;
		this.data.lastUpdate = this.rawData.lastUpdate;
		this.setState( { isDataReady: true } );
	}

	handleSearchChange = event => {
		this.setState( prevState => ( {
			filters: {
				...prevState.filters,
				searchTerm: event.target.value,
			},
		} ) );
	};

	renderFiltersColumn() {
		return (
			<div className={ 'filtersRow' }>
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
						></path>
					</svg>
					<FormControl
						className={ 'search-input search-errors' }
						type="text"
						onChange={ this.handleSearchChange }
						value={ this.state.filters.searchTerm }
					/>
				</div>
			</div>
		);
	}

	getReportUrl( error ) {
		return `${ config.reportDeepUrl }/${ error.path }/#testresult/${ error.source.replace(
			'.json',
			''
		) }`;
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		return (
			<div>
				<div className="row headerRow">
					<div className="col">
						<span>{ this.data.count } results</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.data.lastUpdate ).fromNow() }
						</span>
					</div>
					<div className="col filters right-align">{ this.renderFiltersColumn() }</div>
				</div>
				<ul className={ 'flowsList errorsList' }>
					{ this.data.errors.map( ( error, errorIndex ) => (
						<li key={errorIndex}>
							<a
								className={'flowLink'}
								href={this.getReportUrl(error)}
								target={'_blank'}
								rel={'noreferrer'}
							>
								{error.test}
							</a>{' '}
							<br/>
							<small className={'flowMetaData'}>{error.source}</small>
							<br/>
							<small className={'flowMetaData'}>{error.path}</small>
							<br/>
							<div className={'trace'}>{ error.trace }</div>
						</li>
					) ) }
				</ul>
			</div>
		);
	}
}
