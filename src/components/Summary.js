import React from 'react';
import { sortArray } from '../utils/sort';
import BaseComponent from './BaseComponent';
import TestResultsTooltip from './TestResultsTooltip';
import moment from 'moment';
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { getDataSourceUrl } from '../config';
import { prettyNumber } from '../utils/format';

export default class Summary extends BaseComponent {
	rawData = {
		dailyData: [],
		weeklyData: [],
		monthlyData: [],
		summaryData: {},
		failureRatesData: [],
	};
	state = {
		days: [],
		weeks: [],
		months: [],
		summary: {},
		failureRates: [],
		filters: { isTrunkOnly: true },
		isDataReady: false,
	};

	async componentDidMount() {
		await fetch( `${ getDataSourceUrl() }/data/summary.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.rawData.summaryData = jsonData;
			} )
			.catch( console.error );

		await fetch( `${ getDataSourceUrl() }/data/runs-daily.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.rawData.dailyData = jsonData;
			} )
			.catch( console.error );

		await fetch( `${ getDataSourceUrl() }/data/runs-weekly.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.rawData.weeklyData = jsonData;
			} )
			.catch( console.error );

		await fetch( `${ getDataSourceUrl() }/data/runs-monthly.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.rawData.monthlyData = jsonData;
			} )
			.catch( console.error );

		await fetch( `${ getDataSourceUrl() }/data/failure-rates.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.failureRatesData = jsonData;
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
		this.setState( { days: this.filterDataSet( this.rawData.dailyData ) } );
		this.setState( { weeks: this.filterDataSet( this.rawData.weeklyData ) } );
		this.setState( { months: this.filterDataSet( this.rawData.monthlyData ) } );
		this.setState( { summary: this.filterSummaryData() } );
		this.setState( { failureRates: this.processFailuresRatesData() } );
	}

	filterDataSet( rawData ) {
		let filteredEntries = [];

		if ( this.state.filters.isTrunkOnly ) {
			filteredEntries = rawData.map( entry => {
				return {
					...entry.trunk,
					date: entry.date,
				};
			} );
		} else {
			filteredEntries = rawData.map( entry => {
				return {
					...entry.total,
					date: entry.date,
				};
			} );
		}

		sortArray( filteredEntries, 'date', false );
		return filteredEntries;
	}

	filterSummaryData() {
		const summaryData = {};

		if ( this.state.filters.isTrunkOnly ) {
			Object.keys( this.rawData.summaryData.stats ).forEach( key => {
				summaryData[ key ] = this.rawData.summaryData.stats[ key ].trunk;
			} );
		} else {
			Object.keys( this.rawData.summaryData.stats ).forEach( key => {
				summaryData[ key ] = this.rawData.summaryData.stats[ key ].total;
			} );
		}

		return summaryData;
	}

	processFailuresRatesData() {
		this.failureRatesData.sort( ( a, b ) => a.date.localeCompare( b.date ) );
		return this.failureRatesData;
	}

	getDefaultCartesianGrid() {
		return <CartesianGrid stroke="#454c54" strokeDasharray="2 2" />;
	}

	getDefaultLegend() {
		return (
			<Legend verticalAlign="top" align="right" height={ 40 } wrapperStyle={ { right: '55px' } } />
		);
	}

	getDateXAxis() {
		return (
			<XAxis
				dataKey="date"
				axisLine={ false }
				interval="preserveStartEnd"
				tickFormatter={ tickItem => moment( tickItem ).format( 'DD MMM YY' ) }
				tick={ { fontSize: '0.8rem' } }
			></XAxis>
		);
	}

	off = data => {
		const dataMax = Math.max( ...data.map( i => i.delta ) );
		const dataMin = Math.min( ...data.map( i => i.delta ) );

		if ( dataMax <= 0 ) {
			return 0;
		}
		if ( dataMin >= 0 ) {
			return 1;
		}

		return dataMax / ( dataMax - dataMin );
	};

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		const axisTickStyle = { fontSize: '0.8rem' };

		return (
			<div>
				<div className="row">
					<div className="col-sm filters">{ this.getTrunkOnlyFilterButton() }</div>
				</div>
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Failure rates</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.rawData.summaryData.lastUpdate ).fromNow() }
						</span>
					</div>
				</div>
				<div className={ 'chartContainer' }>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={ this.state.failureRates }>
							{ this.getDefaultCartesianGrid() }
							{ this.getDateXAxis() }
							<YAxis yAxisId="failureRate" axisLine={ false } unit={ '%' } tick={ axisTickStyle } />
							<Tooltip />;{ /*{this.getDefaultLegend()}*/ }
							<Line
								unit="%"
								type="monotone"
								name="trunk failure rate"
								yAxisId="failureRate"
								dataKey="avgTrunk"
								stroke="rgba(186, 110, 98, 0.71)"
								strokeWidth={ 0 }
								legendType="circle"
								dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 0 } }
								activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
							/>
							/>
							<Line
								unit="%"
								type="monotone"
								name="total failure rate"
								yAxisId="failureRate"
								dataKey="avgTotal"
								stroke="rgba(186, 110, 98, 0.71)"
								strokeWidth={ 0 }
								legendType="circle"
								dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 0 } }
								activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
							/>
							/>
							<defs>
								<linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset={ this.off( this.state.failureRates ) }
										stopColor="rgba( 115, 151, 75, 0.73 )"
										stopOpacity={ 1 }
									/>
									<stop
										offset={ this.off( this.state.failureRates ) }
										stopColor="rgba(186, 110, 98, 0.71)"
										stopOpacity={ 1 }
									/>
								</linearGradient>
							</defs>
							<Area
								type="monotone"
								yAxisId="failureRate"
								dataKey="avgDelta"
								name="delta"
								unit="%"
								fill="url(#splitColor)"
								strokeWidth={ 0 }
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<p className={ 'caption center' }>Average 7 days failure rates, trunk vs total</p>
				<hr />
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Tests</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.rawData.summaryData.lastUpdate ).fromNow() }
						</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '24h' ].testsTotal }>
								{ prettyNumber( this.state.summary[ '24h' ].testsTotal ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '24h' ].testsFailedRate }% failed</small>
							</span>
							<br />
							<span className="stat-description">24h</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '7d' ].testsTotal }>
								{ prettyNumber( this.state.summary[ '7d' ].testsTotal ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '7d' ].testsFailedRate }% failed</small>
							</span>
							<br />
							<span className="stat-description">7d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '14d' ].testsTotal }>
								{ prettyNumber( this.state.summary[ '14d' ].testsTotal ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '14d' ].testsFailedRate }% failed</small>
							</span>
							<br />
							<span className="stat-description">14d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '30d' ].testsTotal }>
								{ prettyNumber( this.state.summary[ '30d' ].testsTotal ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '30d' ].testsFailedRate }% failed</small>
							</span>
							<br />
							<span className="stat-description">30d</span>
						</div>
					</div>
				</div>
				<div className={ 'chartContainer' }>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={ this.state.days }>
							{ this.getDefaultCartesianGrid() }
							{ this.getDateXAxis() }
							<YAxis yAxisId="testCount" type="number" axisLine={ false } tick={ axisTickStyle } />
							<YAxis
								yAxisId="failureRate"
								orientation="right"
								axisLine={ false }
								unit={ '%' }
								tick={ axisTickStyle }
							/>
							<Tooltip content={ <TestResultsTooltip /> } />;{ this.getDefaultLegend() }
							<Bar
								unit=" tests"
								dataKey="testsPassed"
								name="passed"
								yAxisId="testCount"
								fill="rgba( 115, 151, 75, 0.73 )"
								stackId="a"
								legendType="circle"
								maxBarSize={ 20 }
							/>
							<Bar
								unit=" tests"
								dataKey="testsFailed"
								name="failed"
								yAxisId="testCount"
								fill="rgba( 253, 90, 62, 0.71 )"
								stackId="a"
								legendType="circle"
								maxBarSize={ 20 }
							/>
							<Bar
								unit=" tests"
								dataKey="testsSkipped"
								name="skipped"
								yAxisId="testCount"
								fill="rgba( 170, 170, 170, 0.73 )"
								stackId="a"
								legendType="circle"
								maxBarSize={ 20 }
							/>
							<Line
								unit="%"
								type="monotone"
								name="failure rate"
								yAxisId="failureRate"
								dataKey="testsFailedRate"
								stroke="rgba(186, 110, 98, 0.71)"
								strokeWidth={ 2 }
								legendType="cross"
								dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 4 } }
								activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
							/>
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<p className={ 'caption center' }>Daily test results</p>
				<hr />
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Test runs</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.rawData.summaryData.lastUpdate ).fromNow() }
						</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '24h' ].attempts }>
								{ prettyNumber( this.state.summary[ '24h' ].attempts ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '24h' ].reRunsRate }% reruns</small>
							</span>
							<br />
							<span className="stat-description">24h</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '7d' ].attempts }>
								{ prettyNumber( this.state.summary[ '7d' ].attempts ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '7d' ].reRunsRate }% reruns</small>
							</span>
							<br />
							<span className="stat-description">7d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '14d' ].attempts }>
								{ prettyNumber( this.state.summary[ '14d' ].attempts ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '14d' ].reRunsRate }% reruns</small>
							</span>
							<br />
							<span className="stat-description">14d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number" title={ this.state.summary[ '30d' ].attempts }>
								{ prettyNumber( this.state.summary[ '30d' ].attempts ) }
							</span>
							<br />
							<span className="stat-number-sub">
								<small>{ this.state.summary[ '30d' ].reRunsRate }% reruns</small>
							</span>
							<br />
							<span className="stat-description">30d</span>
						</div>
					</div>
				</div>
				<div className={ 'chartContainer' }>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={ this.state.days }>
							{ this.getDefaultCartesianGrid() }
							{ this.getDateXAxis() }
							<YAxis type="number" axisLine={ false } tick={ axisTickStyle } />
							<YAxis
								yAxisId="reRunsRate"
								orientation="right"
								axisLine={ false }
								unit={ '%' }
								tick={ axisTickStyle }
							/>
							{ this.getDefaultLegend() }
							<Tooltip content={ <TestResultsTooltip /> } />;
							<Bar
								unit=" runs"
								dataKey="attempts"
								name="total"
								fill="rgba( 170, 170, 170, 0.73 )"
								legendType="circle"
								maxBarSize={ 20 }
							/>
							<Line
								unit="%"
								type="monotone"
								name="re-runs rate"
								yAxisId="reRunsRate"
								dataKey="reRunsRate"
								stroke="rgba(186, 110, 98, 0.71)"
								strokeWidth={ 2 }
								legendType="cross"
								dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 4 } }
								activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
							/>
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<p className={ 'caption center' }>Daily test workflow runs</p>
				<div className={ 'chartContainer' }>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={ this.state.days }>
							{ this.getDefaultCartesianGrid() }
							{ this.getDateXAxis() }
							<YAxis type="number" axisLine={ false } tick={ axisTickStyle } />
							<YAxis
								yAxisId="reRunsRate"
								orientation="right"
								axisLine={ false }
								tick={ axisTickStyle }
							/>
							{ this.getDefaultLegend() }
							<Tooltip content={ <TestResultsTooltip /> } />;
							<Bar
								dataKey="testsPerAttempt"
								name="tests per run attempt"
								fill="rgba( 170, 170, 170, 0.73 )"
								legendType="circle"
								maxBarSize={ 20 }
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<p className={ 'caption center' }>Average tests per test workflow run attempt</p>
				<hr />
			</div>
		);
	}
}
