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

		const filteredFlows = Object.keys( this.rawData.flows ).reduce( ( acc, suite ) => {
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

		this.data.flows = this.groupFlowsByNestedSuites( filteredFlows );

		this.data.count = count;
		this.data.sha = this.rawData.sha;
		this.data.ref = this.rawData.ref;
		this.data.lastUpdate = this.rawData.lastUpdate;
		this.setState( { isDataReady: true } );
	}

	groupFlowsByNestedSuites(flowsGroupedByUniqueSuite) {
		const flows = [];
		const suiteCounts = {};

		// Push all flows from each suite into the flows array
		Object.values(flowsGroupedByUniqueSuite).forEach(suiteFlows => {
			flows.push(...suiteFlows);
		});

		// First pass: collect all flow counts for each suite
		flows.forEach(flow => {
			// Convert suites to lowercase
			flow.suites = flow.suites.map(suite => suite.toLowerCase());

			flow.suites.forEach((suite, index) => {
				const suitePath = flow.suites.slice(0, index + 1).join('|');
				suiteCounts[suitePath] = (suiteCounts[suitePath] || 0) + 1;
			});
		});

		// Second pass: build the nested structure with counts
		return flows.reduce((acc, flow) => {
			flow.suites.reduce((suiteAcc, suite, index) => {
				const suitePath = flow.suites.slice(0, index + 1).join('|');
				const suiteWithCount = `${suite} (${suiteCounts[suitePath]})`;

				if (!suiteAcc[suiteWithCount]) {
					if (index === flow.suites.length - 1) {
						suiteAcc[suiteWithCount] = {
							flows: [flow],
						};
					} else {
						suiteAcc[suiteWithCount] = {};
					}
				} else if (index === flow.suites.length - 1) {
					if (!suiteAcc[suiteWithCount].flows) {
						suiteAcc[suiteWithCount].flows = [];
					}
					suiteAcc[suiteWithCount].flows.push(flow);
				}
				return suiteAcc[suiteWithCount];
			}, acc);

			return acc;
		}, {});
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
						className={ 'search-input' }
						type="text"
						value={ this.state.searchTerm }
						onChange={ this.handleSearchChange }
					/>
				</div>
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

	toggleVisibility = suiteIndex => {
		const collapsible = document.querySelector( `#suite-${ suiteIndex }` );
		collapsible.classList.toggle( 'collapsed' );
		const collapseBtnElement = document.getElementById( `btn-${ suiteIndex }` );
		collapseBtnElement.classList.toggle( 'collapsed' );
	};

	toggleAll = shouldExpand => {
		const suiteElements = document.querySelectorAll( '[id^="suite-"]' );
		const buttons = document.querySelectorAll( '[id^="btn-"]' );

		suiteElements.forEach( element => {
			if ( shouldExpand ) {
				element.classList.remove( 'collapsed' );
			} else {
				element.classList.add( 'collapsed' );
			}
		} );

		buttons.forEach( button => {
			if ( shouldExpand ) {
				button.classList.remove( 'collapsed' );
			} else {
				button.classList.add( 'collapsed' );
			}
		} );
	};

	renderExpandCollapseButtons() {
		return (
			<div className="expand-collapse-buttons">
				<Button variant="dark" className="filter-btn" onClick={ () => this.toggleAll( true ) }>
					Expand all
				</Button>
				<Button variant="dark" className="filter-btn" onClick={ () => this.toggleAll( false ) }>
					Collapse all
				</Button>
			</div>
		);
	}

	renderFlowsList( flows ) {
		const fileUrl = `https://github.com/woocommerce/woocommerce/blob/${ this.data.sha }/plugins/woocommerce/tests/e2e-pw/tests/`;
		const skippedPill = <span className={ `label label-status-skipped` }>SKIPPED</span>;

		return (
			<ul className={ 'flowsList' }>
				{ flows.map( ( flow, flowIndex ) => (
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
		);
	}

	renderSuites( suites, parentIndex = '' ) {
		return (
			<ul className={ 'suitesList' }>
				{ Object.entries( suites ).map( ( [ suiteName, suiteData ], index ) => {
					const suiteIndex = `${ parentIndex }${ index }`;

					return (
						<li key={ suiteIndex } className={ 'groupTitle suiteElement' }>
							<div
								className={ 'suiteTitleContainer' }
								onClick={ () => this.toggleVisibility( suiteIndex ) }
							>
								<span className={ 'suiteTitle' }>{ suiteName }</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									className={ 'collapse-indicator collapsed' }
									id={ `btn-${ suiteIndex }` }
								>
									<polyline points="9 6 15 12 9 18"></polyline>
								</svg>
							</div>
							<div id={ `suite-${ suiteIndex }` }>
								{ suiteData.flows
									? this.renderFlowsList( suiteData.flows )
									: this.renderSuites( suiteData, `${ suiteIndex }-` ) }
							</div>
						</li>
					);
				} ) }
			</ul>
		);
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}

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
					<div className="col filters right-align">{ this.renderFiltersColumn() }</div>
				</div>
				{ this.renderExpandCollapseButtons() }
				{ this.renderSuites( this.data.flows ) }
			</div>
		);
	}
}
