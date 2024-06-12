import React from 'react';
import ReactGA from 'react-ga';
import moment from 'moment';
import { fetchJsonData } from '../utils/fetch';
import config from '../config.json';
import BaseComponent from './BaseComponent';

export default class Tests extends BaseComponent {
	state = {
		rawData: {
			testsData: {},
		},
		tests: {
			list: [],
			distinctTests: 0,
			totalTestResults: 0,
			failedResults: 0,
			failedRate: 0,
		},
		filters: {
			isTrunkOnly: false,
			startDate: moment().subtract( 14, 'd' ).format( 'YYYY-MM-DD' ),
			endDate: moment().format( 'YYYY-MM-DD' ),
		},
		sort: { by: 'failedRate', isAsc: false },
		isDataReady: false,
	};

	async componentDidMount() {
		this.setState( {
			rawData: {
				testsData: await fetchJsonData( `${ config.dataSourceURL }/data/tests.json` ),
			},
		} );

		this.setTestsData();

		this.setState( {
			isDataReady: true,
		} );

		this.setDatePickersValues( this.state.filters.startDate, this.state.filters.endDate );
		ReactGA.pageview( '/tests' );
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( this.state.filters !== prevState.filters ) {
			console.log( this.state.filters );
			this.setTestsData();
		}

		if ( this.state.tests.list !== prevState.tests.list ) {
			this.sortData( this.state.sort.by, this.state.sort.isAsc );
		}
	}

	setTestsData() {
		// make a copy of raw data object to process
		// wwe don't modify the original data
		let tests = JSON.parse( JSON.stringify( this.state.rawData.testsData.tests ) );

		if ( this.state.filters.startDate && this.state.filters.endDate ) {
			tests.forEach( t => {
				t.results = t.results.filter( r =>
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
			tests.forEach( t => {
				t.results = t.results.filter( r => config.trunkRuns.includes( r.report ) );
			} );
		}

		// filter out tests with 0 results
		tests = tests.filter( e => e.results.length > 0 );

		for ( const test of tests ) {
			test.total = 0;
			for ( const status of [ 'passed', 'failed', 'skipped' ] ) {
				test[ status ] = test.results.filter( t => t.status === status ).length;
				test.total += test[ status ];
			}
			test.failedRate = ( ( test.failed / test.total ) * 100 ).toFixed( 2 );

			test.results.sort( ( a, b ) => {
				return a.time - b.time;
			} );
		}

		let totalTestResults = 0;
		let failedResults = 0;
		tests.forEach( t => {
			totalTestResults += t.total;
			failedResults += t.failed;
		} );
		const failedRate = ( ( failedResults / totalTestResults ) * 100 ).toFixed( 2 );

		this.setState( {
			tests: {
				list: tests,
				distinctTests: tests.length,
				totalTestResults,
				failedResults,
				failedRate,
			},
		} );
	}

	sortData( by, isAsc ) {
		this.state.tests.list.sort( ( a, b ) => ( isAsc ? a[ by ] - b[ by ] : b[ by ] - a[ by ] ) );

		this.setState( {
			sort: { by, isAsc },
		} );
	}

	getTotalsBadges( test ) {
		const badges = [ 'failed', 'passed', 'skipped', 'total' ].map( ( label, id ) => {
			const count = test[ label ];

			// hide statuses with no results
			const classHide = count === 0 ? 'hide' : '';

			let rate = (
				( count / ( test.total - ( label === 'skipped' ? 0 : test.skipped ) ) ) *
				100
			).toFixed( 1 );

			if ( label === 'total' ) {
				rate = '';
			} else {
				rate = isNaN( rate ) ? '' : `${ rate }%`;
			}

			return (
				<li key={ id }>
					<span key={ id } className={ `label label-fill label-status-${ label } ${ classHide }` }>
						{ count } { label }
						<span className={ `badge-pill stat-pill` }>{ rate }</span>
					</span>
				</li>
			);
		} );

		return <ul className="list-unstyled">{ badges }</ul>;
	}

	getResultsLine( test ) {
		const badges = test.results.slice( -150 ).map( ( result, id ) => {
			let classHasSource = 'no-source';
			let url;

			if ( result.source ) {
				classHasSource = '';
				url = `${ config.reportDeepUrl }/${
					result.report
				}/report/#testresult/${ result.source.replace( /.json/, '' ) }`;
			}

			return (
				<span
					key={ id }
					onClick={ () => {
						if ( url ) {
							window.open( url, '_blank' );
						}
					} }
					className={ `has-tooltip label label-small label-status-${ result.status } ${ classHasSource }` }
					aria-hidden="true"
				>
					&nbsp;
					<span className="tooltip-content">
						{ moment( result.time ).format( 'MMM Do, h:mm a' ) }
						<br />
						{ result.source }
					</span>
				</span>
			);
		} );
		return <div>{ badges }</div>;
	}

	getTestContent( test, id ) {
		return (
			<div key={ id } className="test-container">
				<div className="row">
					<div className="col-sm-auto">
						<h1>{ test.name }</h1>
					</div>
				</div>
				<div className="row">
					<div className="col-sm-auto">{ this.getTotalsBadges( test ) }</div>
					<div className="col">{ this.getResultsLine( test ) }</div>
				</div>
			</div>
		);
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		return (
			<div>
				<div className="row align-items-center">{ this.getFilterByDateFields() }</div>
				<hr />
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.tests.distinctTests }</span>
							<br />
							<span className="stat-description">tests</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.tests.totalTestResults }</span>
							<br />
							<span className="stat-description">results</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.tests.failedResults }</span>
							<br />
							<span className="stat-description">failures</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.tests.failedRate }%</span>
							<br />
							<span className="stat-description">failure rate</span>
						</div>
					</div>
				</div>
				<hr />
				<div className="row">
					<div className="col-sm filters">{ this.getTrunkOnlyFilterButton() }</div>
					<div className="col-md sort-buttons">
						{ this.getSortButtons(
							{
								total: 'runs',
								failedRate: 'failure rate',
							},
							this.state.sort.by,
							this.state.sort.isAsc
						) }
					</div>
				</div>
				<hr />
				<div>{ this.state.tests.list.map( ( test, id ) => this.getTestContent( test, id ) ) }</div>
			</div>
		);
	}
}
