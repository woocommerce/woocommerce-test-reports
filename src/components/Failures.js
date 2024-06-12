import React from 'react';
import ReactGA from 'react-ga';
import moment from 'moment';
import { fetchJsonData } from '../utils/fetch';
import config from '../config.json';
import BaseComponent from './BaseComponent';

export default class Failures extends BaseComponent {
	state = {
		rawData: {
			errorsData: {},
		},
		errors: {
			list: [],
			totalErrors: 0,
			distinctErrors: 0,
		},
		filters: {
			isTrunkOnly: false,
			startDate: moment().subtract( 14, 'd' ).format( 'YYYY-MM-DD' ),
			endDate: moment().format( 'YYYY-MM-DD' ),
		},
		sort: { by: 'common', isAsc: false },
		isDataReady: false,
	};

	async componentDidMount() {
		this.setState( {
			rawData: {
				errorsData: await fetchJsonData( `${ config.dataSourceURL }/data/errors.json` ),
			},
		} );

		this.setErrorsData();

		this.setState( {
			isDataReady: true,
		} );
		this.setDatePickersValues( this.state.filters.startDate, this.state.filters.endDate );
		ReactGA.pageview( '/failures' );
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( this.state.filters !== prevState.filters ) {
			this.setErrorsData();
		}

		if ( this.state.errors.list !== prevState.errors.list ) {
			this.sortData( this.state.sort.by, this.state.sort.isAsc );
		}
	}

	setErrorsData() {
		// make a copy of raw data errors object to process
		// wwe don't modify the original data
		let errors = JSON.parse( JSON.stringify( this.state.rawData.errorsData.errors ) );

		if ( this.state.filters.startDate && this.state.filters.endDate ) {
			errors.forEach( e => {
				e.results = e.results.filter( r =>
					moment( r.time ).isBetween(
						moment( this.state.filters.startDate, 'YYYY-MM-DD' ),
						moment( this.state.filters.endDate, 'YYYY-MM-DD' ),
						'd',
						'[]'
					)
				);
			} );
		}

		if ( this.state.filters.isTrunkOnly ) {
			errors.forEach( e => {
				e.results = e.results.filter( r => config.trunkRuns.includes( r.report ) );
			} );
		}

		// filter out errors with 0 occurrences
		errors = errors.filter( e => e.results.length > 0 );

		// calculate some stats for each error
		for ( const error of errors ) {
			error.total = error.results.length;
			const times = error.results.map( r => r.time );
			error.newest = Math.max( ...times );
			error.oldest = Math.min( ...times );

			const testsNames = [ ...new Set( error.results.map( r => r.test ) ) ];

			error.tests = [];

			for ( const testName of testsNames ) {
				const resultsForTest = error.results.filter( r => r.test === testName );

				error.tests.push( {
					name: testName,
					times: resultsForTest.map( r => r.time ),
				} );
			}
		}

		const allErrors = errors.map( e => e.results ).flat();

		this.setState( {
			errors: {
				list: errors,
				distinctErrors: errors.length,
				totalErrors: allErrors.length,
			},
		} );
	}

	sortData( by, isAsc ) {
		switch ( by ) {
			case 'recent':
				this.state.errors.list.sort( ( a, b ) =>
					isAsc ? a.newest - b.newest : b.newest - a.newest
				);
				break;
			case 'common':
				this.state.errors.list.sort( ( a, b ) =>
					isAsc ? a.results.length - b.results.length : b.results.length - a.results.length
				);
				break;
		}

		this.setState( {
			sort: { by, isAsc },
		} );
	}

	getListOfTests( tests ) {
		return (
			<div>
				{ tests.map( ( test, id ) => {
					return (
						<span key={ id } className="label label-status-skipped">
							{ test.name } <span className={ `badge-pill stat-pill` }>{ test.times.length }</span>
						</span>
					);
				} ) }
			</div>
		);
	}

	getListOfFailures( results ) {
		return (
			<div>
				{
					results.sort( ( a, b ) => b.time - a.time ).map( ( result, id ) => {
					let badge = moment( result.time ).format( 'MMM Do, h:mm a' );

					let className = 'no-source';

					if ( result.source ) {
						const url = `${ config.reportDeepUrl }/${
							result.report
						}/report/#testresult/${ result.source.replace( /.json/, '' ) }`;
						badge = (
							<a href={ url } target="_blank" rel="noreferrer" className="report-link">
								{ badge }
							</a>
						);

						className = '';
					} else {
						// don't display results with no source,
						// because it looks bad for some common errors that have a lot of results
						return '';
					}

					return (
						<span key={ id } className={ `failure-link ${ className }` }>
							{ badge }
						</span>
					);
				} ) }
			</div>
		);
	}

	getErrorContent( error, id ) {
		let details = `${ error.total } times, since ${ moment(
			error.oldest
		).fromNow() }. Last failed ${ moment( error.newest ).fromNow() }`;

		if ( error.total === 1 ) {
			details = `once, ${ moment( error.oldest ).fromNow() }`;
		}

		return (
			<div className="error-container" key={ id }>
				<div className="row">
					<pre className="error-container-trace">{ error.trace }</pre>
					<div>{ details }</div>
				</div>
				<div className="row">{ this.getListOfTests( error.tests ) }</div>
				<div className="row">{ this.getListOfFailures( error.results ) }</div>
			</div>
		);
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		const lastUpdate = moment( this.state.rawData.errorsData.lastUpdate ).fromNow();

		return (
			<div>
				<hr />
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.errors.totalErrors }</span>
							<br />
							<span className="stat-description">total errors</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.errors.distinctErrors }</span>
							<br />
							<span className="stat-description">distinct errors</span>
						</div>
					</div>
				</div>
				<hr />
				<div className="row">{ this.getFilterByDateFields() }</div>
				<div className="row">
					<div className="col-sm filters">{ this.getTrunkOnlyFilterButton() }</div>
					<div className="col-md sort-buttons">
						{ this.getSortButtons(
							{
								recent: 'most recent',
								common: 'most common',
							},
							this.state.sort.by,
							this.state.sort.isAsc
						) }
					</div>
				</div>
				<hr />
				<div>
					{ this.state.errors.list.map( ( error, id ) => this.getErrorContent( error, id ) ) }
				</div>
				<div className="row">
					<div className="text-right col small">updated { lastUpdate }</div>
				</div>
			</div>
		);
	}
}
