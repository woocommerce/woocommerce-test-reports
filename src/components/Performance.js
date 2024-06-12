import React from 'react';
import ReactGA from 'react-ga';
import { Container, Row, Col } from 'react-bootstrap';
import config from '../config.json';
import ReactEcharts from 'echarts-for-react';

export default class Performance extends React.Component {
	constructor( props ) {
		super( props );
		this.state = {
			selected: 'type',
			rawData: [],
			isDataFetched: false,
			metrics: [
				'serverResponse',
				'firstPaint',
				'domContentLoaded',
				'loaded',
				'firstContentfulPaint',
				'firstBlock',
				'type',
				'focus',
				'listViewOpen',
				'inserterOpen',
				'inserterHover',
				'inserterSearch',
			],
		};
	}

	calcPercent( base, comp ) {
		return Math.round( ( comp / base - 1 ) * 100 * 100 ) / 100;
	}

	prettyTitle( title ) {
		return title.replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toUpperCase();
	}

	prepareChartData( jsonData ) {
		const result = {};
		const metrics = Object.keys( jsonData[ jsonData.length - 1 ].baseAvg );

		jsonData.forEach( obj => {
			metrics.forEach( metric => {
				if ( ! result[ metric ] ) {
					result[ metric ] = [];
				}
				let date = new Date( obj.date );
				date = date.toISOString().split( 'T' )[ 0 ];
				result[ metric ].push( {
					base: obj.baseAvg[ metric ],
					jetpack: obj.jetpackAvg[ metric ],
					date,
				} );
			} );
		} );

		const out = {};

		metrics.forEach( metric => {
			const dates = [ ...new Set( result[ metric ].map( entry => entry.date ) ) ];
			const entries = dates.reduce( ( acc, date ) => {
				const byDate = result[ metric ].filter( e => e.date === date );

				acc.push( {
					base: Math.round( byDate.reduce( ( a, e ) => ( a += e.base ), 0 ) / byDate.length ),
					jetpack: Math.round( byDate.reduce( ( a, e ) => ( a += e.jetpack ), 0 ) / byDate.length ),
					date,
				} );

				return acc;
			}, [] );

			out[ metric ] = entries;
		} );

		return out;
	}

	async componentDidMount() {
		await fetch( `${ config.dataSourceURL }/data/perf-metrics.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.setState( {
					rawData: jsonData,
					isDataFetched: true,
				} );
			} )
			.catch( console.log );

		ReactGA.pageview( 'performance' );
	}

	renderChart( type, chartData ) {
		const chartOptions = {
			grid: {
				left: 60,
				right: 0,
			},
			title: {
				text: this.prettyTitle( type ),
				textStyle: {
					color: '#cccccc',
					fontSize: '0.9rem',
				},
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'cross',
				},
			},
			xAxis: [
				{
					type: 'category',
					data: chartData.map( function ( e ) {
						return e.date;
					} ),
				},
			],
			yAxis: [
				{
					type: 'value',
					splitLine: {
						lineStyle: {
							type: 'dotted',
							color: '#6b6d76',
						},
					},
				},
				{
					type: 'value',
					splitLine: {
						lineStyle: {
							type: 'dashed',
							color: 'rgba(107,109,118,0.47)',
						},
					},
					min: 0,
					axisLabel: {
						formatter: '{value} %',
					},
				},
			],
			dataZoom: [
				{
					type: 'inside',
				},
				{
					start: 50,
					end: 100,
				},
			],
			series: [
				{
					name: 'base',
					type: 'line',
					emphasis: {
						focus: 'series',
					},
					color: 'rgb(99,100,138)',
					data: chartData.map( function ( e ) {
						return e.base;
					} ),
				},
				{
					name: 'jetpack',
					type: 'line',
					emphasis: {
						focus: 'series',
					},
					color: 'rgb(99,150,138)',
					data: chartData.map( function ( e ) {
						return e.jetpack;
					} ),
				},
			],
		};

		return <ReactEcharts option={ chartOptions } style={ { height: '400px', width: '100%' } } />;
	}

	onSelect( type ) {
		this.setState( { selected: type } );
	}

	renderTypeInfo( type, last, prev ) {
		const diffPercent = this.calcPercent( prev, last );

		return (
			<Row style={ { justifyContent: 'space-between' } }>
				<div style={ { display: 'flex' } }>
					<h5>
						{ type }: { last } ms.
					</h5>
					&nbsp;from: { prev }ms.
				</div>
				<span>&nbsp;VS previous: { diffPercent }ms.</span>
			</Row>
		);
	}

	renderContainer( type, data ) {
		const last = data.at( -1 );
		const prev = data.at( -2 );

		return (
			<Container className="perf-button" onClick={ () => this.onSelect( type ) }>
				<Row>
					<h4>
						{ this.state.selected === type ? (
							<u>{ this.prettyTitle( type ) }</u>
						) : (
							this.prettyTitle( type )
						) }
					</h4>
				</Row>
				<Row>&nbsp;</Row>
				{ this.renderTypeInfo( 'Base', last.base, prev.base ) }
				{ this.renderTypeInfo( 'Jetpack', last.jetpack, prev.jetpack ) }
			</Container>
		);
	}

	renderButtons( chartData ) {
		return (
			<Container fluid>
				<Row>
					<Col sm>{ this.renderContainer( 'type', chartData.type ) }</Col>
					<Col sm>{ this.renderContainer( 'loaded', chartData.loaded ) }</Col>
					<Col sm>{ this.renderContainer( 'focus', chartData.focus ) }</Col>
				</Row>
				<Row>
					<Col sm>{ this.renderContainer( 'inserterOpen', chartData.inserterOpen ) }</Col>
					<Col sm>{ this.renderContainer( 'inserterHover', chartData.inserterHover ) }</Col>
					<Col sm>{ this.renderContainer( 'inserterSearch', chartData.inserterSearch ) }</Col>
				</Row>
			</Container>
		);
	}

	render() {
		if ( ! this.state.isDataFetched ) {
			return null;
		}

		const chartData = this.prepareChartData( this.state.rawData );

		const type = this.state.selected;
		return (
			<div>
				<h4>Editor Performance Metrics</h4>
				<p>
					This examines block editor performance with and without Jetpack using the Gutenberg
					performance tests.
				</p>
				{ this.renderButtons( chartData ) }
				{ this.renderChart( type, chartData[ type ] ) }
			</div>
		);
	}
}
