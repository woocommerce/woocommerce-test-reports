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

export default class Flows extends BaseComponent {
	data = {};
	state = {
		filters: { isTrunkOnly: true },
		isDataReady: false,
	};

	async componentDidMount() {
		await fetch( `${ getDataSourceUrl() }/data/flows-coverage-trunk.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.data = jsonData;
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
		// this.setState( { days: this.filterDataSet( this.rawData.dailyData ) } );
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		return (
			<div>
				<ul className={'list-unstyled'}>
					{Array.isArray(this.data.flows) &&
						this.data.flows.map((flow, index) => (
							<li className={ flow.skipped ? 'flowItem skipped-flow' : 'flowItem active-flow' } key={index}>
								<span className={ 'flowTitle' }>{flow.skipped ? 'SKIPPED ' : ''}{flow.title}</span>
								<br/>
								<small>{flow.file}:{flow.line}</small>
							</li>
						))}
				</ul>
			</div>
	);
	}
	}
