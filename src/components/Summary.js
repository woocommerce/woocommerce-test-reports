import React from 'react';
import { sortArray } from '../utils/sort';
import BaseComponent from './BaseComponent';
import TestResultsTooltip from './TestResultsTooltip';
import moment from 'moment';
import {
	Bar,
	CartesianGrid,
	ComposedChart, Label,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { getDataSourceUrl } from '../config';

export default class Summary extends BaseComponent {
	state = {
		rawData: {
			dailyData: [],
			weeklyData: [],
			monthlyData: [],
			summaryData: {},
		},
		days: [],
		weeks: [],
		months: [],
		summary: {},
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
				this.setState( {
					rawData: {
						...this.state.rawData,
						summaryData: jsonData,
					},
				} );
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
				this.setState( {
					rawData: {
						...this.state.rawData,
						dailyData: jsonData,
					},
				} );
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
				this.setState( {
					rawData: {
						...this.state.rawData,
						weeklyData: jsonData,
					},
				} );
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
				this.setState( {
					rawData: {
						...this.state.rawData,
						monthlyData: jsonData,
					},
				} );
			} )
			.catch( console.error );

		this.filterData();

		this.setState( {
			isDataReady: true,
		} );
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( this.state.filters !== prevState.filters ) {
			this.filterData();
		}
	}

	filterData() {
		this.setState( { days: this.filterDataSet( this.state.rawData.dailyData ) } );
		this.setState( { weeks: this.filterDataSet( this.state.rawData.weeklyData ) } );
		this.setState( { months: this.filterDataSet( this.state.rawData.monthlyData ) } );
		this.setState( { summary: this.filterSummaryData() } );
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
			Object.keys( this.state.rawData.summaryData.stats ).forEach( key => {
				summaryData[ key ] = this.state.rawData.summaryData.stats[ key ].trunk;
			} );
		} else {
			Object.keys( this.state.rawData.summaryData.stats ).forEach( key => {
				summaryData[ key ] = this.state.rawData.summaryData.stats[ key ].total;
			} );
		}

		return summaryData;
	}

	getDefaultCartesianGrid() {
		return <CartesianGrid stroke="#454c54" strokeDasharray="2 2" />;
	}

	getDefaultLegend() {
		return <Legend verticalAlign="top" align="right" height={ 40 } />;
	}

	getDateXAxis() {
		return  <XAxis
			  dataKey="date"
			  axisLine={false}
			  interval="preserveStartEnd"
			  tickFormatter={(tickItem) => moment(tickItem).format('DD MMM YY')}
		><Label offset={0} position="insideBottom" formatter={(value) => moment(value).format('DD MMM YY')}  /></XAxis>
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		return (
			<div>
				<div className="row">
					<div className="col-sm filters">{ this.getTrunkOnlyFilterButton() }</div>
				</div>
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Tests</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.state.rawData.summaryData.lastUpdate ).fromNow() }
						</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.summary[ '24h' ].testsTotal }</span>
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
							<span className="stat-number">{ this.state.summary[ '7d' ].testsTotal }</span>
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
							<span className="stat-number">{ this.state.summary[ '14d' ].testsTotal }</span>
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
							<span className="stat-number">{ this.state.summary[ '30d' ].testsTotal }</span>
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
							<YAxis yAxisId="testCount" type="number" axisLine={ false } />
							<YAxis yAxisId="failureRate" orientation="right" axisLine={ false } />
							<Tooltip content={<TestResultsTooltip/>} />;
							{ this.getDefaultLegend() }
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
								legendType="cross"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<hr />
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Test runs</span>
						<br />
						<span className={ 'caption' }>
							updated { moment( this.state.rawData.summaryData.lastUpdate ).fromNow() }
						</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">{ this.state.summary[ '24h' ].attempts }</span>
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
							<span className="stat-number">{ this.state.summary[ '7d' ].attempts }</span>
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
							<span className="stat-number">{ this.state.summary[ '14d' ].attempts }</span>
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
							<span className="stat-number">{ this.state.summary[ '30d' ].attempts }</span>
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
							<YAxis type="number" axisLine={ false } />
							<YAxis yAxisId="reRunsRate" orientation="right" axisLine={ false } />
							{ this.getDefaultLegend() }
							<Tooltip content={<TestResultsTooltip/>} />;
							<Bar
								unit=" runs"
								dataKey="attempts"
								name="total"
								fill="rgba( 115, 151, 75, 0.73 )"
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
								legendType="cross"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
				<hr />
			</div>
		);
	}
}
