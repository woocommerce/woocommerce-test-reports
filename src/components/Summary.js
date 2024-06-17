import React from 'react';
import { sortArray } from '../utils/sort';
import BaseComponent from './BaseComponent';
import config from '../config.json';
import moment from 'moment';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts";

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
		await fetch( `${ config.dataSourceURL }/data/summary.json`, {
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
					}
				})
			} )
			.catch( console.error );

		await fetch( `${ config.dataSourceURL }/data/runs-daily.json`, {
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
					}
				})
			} )
			.catch( console.error );

		await fetch( `${ config.dataSourceURL }/data/runs-weekly.json`, {
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
					}
				})
			} )
			.catch( console.error );

		await fetch( `${ config.dataSourceURL }/data/runs-monthly.json`, {
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
					}
				})
			} )
			.catch( console.error );

		// this.setState( {
		// 	rawData: {
		// 		summaryData: await fetchJsonData( `${ config.dataSourceURL }/data/summary.json` ),
		// 		dailyData: await fetchJsonData( `${ config.dataSourceURL }/data/runs-daily.json` ),
		// 		weeklyData: await fetchJsonData( `${ config.dataSourceURL }/data/runs-weekly.json` ),
		// 		monthlyData: await fetchJsonData( `${ config.dataSourceURL }/data/runs-monthly.json` ),
		// 	},
		// } );

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
		// make a copy of raw data object
		// we don't modify the original data
		// let entries = JSON.parse( JSON.stringify( rawData ) );
		let filteredEntries = [];

		console.log(`rawData: ${JSON.stringify( rawData )}`)
		console.log(`isTrunkOnly: ${this.state.filters.isTrunkOnly}`);
		if ( this.state.filters.isTrunkOnly ) {
			filteredEntries = rawData.map( entry => {
				console.log(`trunk entry ${JSON.stringify(entry.trunk)}`);
				return {
					...entry.trunk,
					date: entry.date,
				};
			} );
		} else {
			filteredEntries = rawData.map( entry => {
				console.log(`total entry ${JSON.stringify(entry.total)}`);
				return {
					...entry.total,
					date: entry.date,
				};
			} );
		}

		console.log(`filtered entries: ${JSON.stringify( filteredEntries )}`)

		filteredEntries.forEach( date => {
			date.failedRate = ( ( date.testsFailed / date.testsTotal ) * 100 ).toFixed( 1 );
		} );

		sortArray( filteredEntries, 'date', false );

		console.log(`final filtered entries: ${JSON.stringify( filteredEntries )}`)

		console.log(filteredEntries)
		return filteredEntries;
	}

	filterSummaryData() {
		// make a copy of raw data object
		// we don't modify the original data
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

		Object.keys( summaryData ).forEach( key => {
			summaryData[ key ].failureRate = (
				( summaryData[ key ].testsFailed / summaryData[ key ].testsTotal ) *
				100
			).toFixed( 1 );
		} );

		Object.keys( summaryData ).forEach( key => {
			summaryData[ key ].reRunRate = (
				( summaryData[ key ].reRuns / summaryData[ key ].attempts ) *
				100
			).toFixed( 1 );
		} );

		return summaryData;
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		return (
			<div>
				<div className="row">
					<div className="col-sm filters">{this.getTrunkOnlyFilterButton()}</div>
				</div>
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Tests</span>
						<br/>
						<span className={'caption'}>updated {moment(this.state.rawData.summaryData.lastUpdate).fromNow()}</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['24h'].testsTotal}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['24h'].failureRate}% failed</small>
							</span>
							<br/>
							<span className="stat-description">24h</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['7d'].testsTotal}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['7d'].failureRate}% failed</small>
							</span>
							<br/>
							<span className="stat-description">7d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['14d'].testsTotal}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['14d'].failureRate}% failed</small>
							</span>
							<br/>
							<span className="stat-description">14d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['30d'].testsTotal}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['30d'].failureRate}% failed</small>
							</span>
							<br/>
							<span className="stat-description">30d</span>
						</div>
					</div>
				</div>
				<div className={'chartContainer'}>
					<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
					  width={500}
					  height={400}
					  data={this.state.days}
					  margin={{
						top: 20,
						right: 20,
						bottom: 20,
						left: 20,
					  }}
					>
					  <CartesianGrid stroke="#454c54" strokeDasharray="2 2" />
					  <XAxis dataKey="date" type="number" angle={-45} interval="preserveStartEnd" scale="utc" />
					  <YAxis />
					  <Tooltip />
					  <Legend />
					  <Bar dataKey="testsPassed"  barSize={20}  fill="rgba( 115, 151, 75, 0.73 )" stackId="a" />
					  <Bar dataKey="testsFailed" fill="rgba( 253, 90, 62, 0.71 )" stackId="a" />
					  <Bar dataKey="testsSkipped" fill="rgba( 170, 170, 170, 0.73 )" stackId="a" />
					  <Line type="monotone" dataKey="failedRate" stroke="rgba(186, 110, 98, 0.71)" />
					</ComposedChart>
				</ResponsiveContainer>
				</div>
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">Test runs</span>
						<br/>
						<span className={'caption'}>updated {moment(this.state.rawData.summaryData.lastUpdate).fromNow()}</span>
					</div>
				</div>
				<div className="row text-center">
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['24h'].attempts}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['24h'].reRunRate}% reruns</small>
							</span>
							<br/>
							<span className="stat-description">24h</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['7d'].runs}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['7d'].reRunRate}% reruns</small>
							</span>
							<br/>
							<span className="stat-description">7d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['14d'].runs}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['14d'].reRunRate}% reruns</small>
							</span>
							<br/>
							<span className="stat-description">14d</span>
						</div>
					</div>
					<div className="col-sm">
						<div className="stat-box">
							<span className="stat-number">
								{this.state.summary['30d'].runs}
							</span>
							<br/>
							<span className="stat-number-sub">
								<small>{this.state.summary['30d'].reRunRate}% reruns</small>
							</span>
							<br/>
							<span className="stat-description">30d</span>
						</div>
					</div>
				</div>
				<hr/>
				{/*<ReactEcharts option={ this.dailyChartOptions() } />*/}
				<hr/>
				{/*<ReactEcharts option={ this.dailyHeatMapOptions() } />*/}
				<hr/>
				{/*<ReactEcharts option={ this.weeklyChartOptions() } />*/}
				<hr/>
				{/*<ReactEcharts option={ this.monthlyChartOptions() } />*/}
				<hr/>
			</div>
		);
	}
}
