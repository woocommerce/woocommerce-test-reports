import React from 'react';
import BaseComponent from './BaseComponent';
import { getDataSourceUrl } from '../config';
import { Button, FormControl } from 'react-bootstrap';
import checkSquare from '../assets/check-square.svg';
import square from '../assets/square.svg';
import moment from 'moment';

export default class Flows extends BaseComponent {
	rawData = {};
	data = {};
	state = {
		filters: { skipped: true, active: true, searchTerm: '' },
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
		const { skipped, active, searchTerm } = this.state.filters;
		let count = 0;

		this.data.flows = Object.keys( this.rawData.flows ).reduce( ( acc, suite ) => {
			const filteredSuiteFlows = this.rawData.flows[ suite ].filter( flow => {
				const suiteMatch = suite.toLowerCase().includes( searchTerm.toLowerCase() );
				const titleMatch = flow.title.toLowerCase().includes( searchTerm.toLowerCase() );
				const fileNameMatch = flow.file.toLowerCase().includes( searchTerm.toLowerCase() );
				const tagsMatch =
					flow.tags &&
					flow.tags.some( tag => tag.toLowerCase().includes( searchTerm.toLowerCase() ) );

				return (
					( suiteMatch || titleMatch || fileNameMatch || tagsMatch ) &&
					( ( skipped && active ) || ( skipped && flow.skipped ) || ( active && ! flow.skipped ) )
				);
			} );

			if ( filteredSuiteFlows.length > 0 ) {
				acc[ suite ] = filteredSuiteFlows;
				count += filteredSuiteFlows.length;
			}

			return acc;
		}, {} );

		this.data.count = count;
		this.data.sha = this.rawData.sha;
		this.data.ref = this.rawData.ref;
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

	renderFiltersColum() {
		return (
			<div className={ 'filtersRow' }>
				<FormControl
					className={ 'search-input' }
					type="text"
					placeholder="search"
					value={ this.state.searchTerm }
					onChange={ this.handleSearchChange }
				/>
				<Button
					variant="dark"
					className="filter-btn"
					onClick={ () => {
						this.setState( prevState => ( {
							filters: {
								...prevState.filters,
								active: ! this.state.filters.active,
							},
						} ) );
					} }
				>
					<img
						src={ this.state.filters.active ? checkSquare : square }
						width={ 16 }
						height={ 16 }
						alt={ 'checkbox' }
					/>{ ' ' }
					active
				</Button>
				<Button
					variant="dark"
					className="filter-btn"
					onClick={ () => {
						this.setState( prevState => ( {
							filters: {
								...prevState.filters,
								skipped: ! this.state.filters.skipped,
							},
						} ) );
					} }
				>
					<img
						src={ this.state.filters.skipped ? checkSquare : square }
						width={ 16 }
						height={ 16 }
						alt={ 'checkbox' }
					/>{ ' ' }
					skipped
				</Button>
			</div>
		);
	}

	renderTags( tags ) {
		tags = tags || [];
		return tags.map( ( tag, index ) => (
			<span key={ index } className={ `label label-status-neutral` }>
				{ tag }
			</span>
		) );
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

		const fileUrl = `https://github.com/woocommerce/woocommerce/blob/${ this.data.sha }/plugins/woocommerce/tests/e2e-pw/tests/`;
		const skippedPill = <span className={ `label label-status-skipped` }>SKIPPED</span>;
		return (
			<div>
				<div className="row headerRow">
					<div className="col">
						<span>{ this.data.count } flows</span>
						<br />
						<span className={ 'caption' }>
							commit { this.data.sha.substring( 0, 6 ) }, updated{ ' ' }
							{ moment( this.data.lastUpdate ).fromNow() }
						</span>
					</div>
					<div className="col filters right-align">{ this.renderFiltersColum() }</div>
				</div>
				<ul className={ 'suitesList' }>
					{ Object.keys( this.data.flows ).map( ( suite, suiteIndex ) => (
						<li key={ suiteIndex } className={ 'groupTitle suiteElement' }>
							<span className={ 'suiteTitle' }>{ suite }</span>
							<ul className={ 'flowsList' }>
								{ this.data.flows[ suite ].map( ( flow, flowIndex ) => (
									<li className={ flow.skipped ? 'skipped-flow' : '' } key={ flowIndex }>
										<a
											className={ 'flowLink' }
											href={ fileUrl + flow.file + '#L' + flow.line }
											target={ '_blank' }
											rel={ 'noreferrer' }
										>
											{ flow.skipped ? skippedPill : '' } { flow.title }
										</a>{ ' ' }
										{ this.renderTags( flow.tags ) }
										<br />
										<small className={ 'flowMetaData' }>
											{ flow.file }:{ flow.line }
										</small>
									</li>
								) ) }
							</ul>
						</li>
					) ) }
				</ul>
			</div>
		);
	}
}
