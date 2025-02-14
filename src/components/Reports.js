import React from 'react';
import { Table } from 'react-bootstrap';
import moment from 'moment';
import branchSVG from '../assets/branch.svg';
import commitSVG from '../assets/commit.svg';
import prSVG from '../assets/pr.svg';
import passedSVG from '../assets/passed.svg';
import failedSVG from '../assets/failed.svg';
import unknownSVG from '../assets/unknown.svg';
import recoveredSVG from '../assets/recovered.svg';
import { getDataSourceUrl } from '../config';
import withRouter from './withRouter';

class Reports extends React.Component {
	constructor( props ) {
		super( props );
		this.state = {
			event: this.props.event,
			groupKey: this.props.params.groupKey,
			location: this.props.location.pathname,
			groups: {},
			reportsCount: undefined,
			isDataFetched: false,
			errorMessage: '',
		};
	}

	componentDidMount() {
		fetch( `${ getDataSourceUrl() }/data/reports.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				const events = this.props.event.split( ',' );
				let groups = {};

				for ( const event of events ) {
					if ( jsonData[ event ] ) {
						groups = {
							...jsonData[ event ],
						};
					}
				}

				if ( this.props.params.groupKey ) {
					console.log( 'Filtering by group key', this.props.params.groupKey );

					if ( groups[ this.props.params.groupKey ] ) {
						groups = {
							[ this.props.params.groupKey ]: groups[ this.props.params.groupKey ],
						};
					} else {
						this.setState( {
							errorMessage: `Reports for key ${ this.props.params.groupKey } not found`,
						} );
					}
				}

				this.setState( {
					groups: this.sortByDate( groups ),
					reportsCount: jsonData.reportsCount,
					isDataFetched: true,
				} );

				this.sortByDate( groups );
			} )
			.catch( console.log );
	}

	sortByDate( groups ) {
		const keys = Object.keys( groups );

		keys.sort( ( a, b ) => {
			return Date.parse( groups[ b ].lastUpdate ) - Date.parse( groups[ a ].lastUpdate );
		} );

		const sortedGroups = {};
		for ( const key of keys ) {
			sortedGroups[ `_${ key }_` ] = groups[ key ];
		}

		return sortedGroups;
	}

	groupReportHref( group ) {
		return `${ window.location.href }/${ group.replace( /^_|_$/g, '' ) }`;
	}

	getGroupTable( group, id ) {
		//       "lastUpdate": "2024-06-14T11:36:44.433Z",
		const { pr_number, report_title, ref_name, repository, sha, status } =
			this.state.groups[ group ];
		const repo = repository ? repository : 'woocommerce/woocommerce';
		const branchUrl = `https://github.com/${ repo }/tree/${ ref_name }`;
		const prUrl = `https://github.com/${ repo }/pull/${ pr_number }`;
		const shaUrl = `https://github.com/${ repo }/commit/${ sha }`;

		const displayStatus = status ? status.toUpperCase() : '';
		return (
			<Table
				key={ id }
				responsive="sm"
				variant="dark"
				borderless
				hover
				className={ 'reportsTable' }
			>
				<thead>
					<tr>
						<th colSpan={ 3 } onClick={ () => this.toggleVisibility( id ) }>
							<ul className={ 'list-unstyled' } style={ { display: 'inline-block' } }>
								<li className={ 'groupTitle' }>
									{ this.getStatusIcon( displayStatus, 20, 20 ) }{ ' ' }
									<a
										href={
											this.props.params.groupKey
												? window.location.href
												: this.groupReportHref( group )
										}
										className={ 'report-link' }
										rel="noreferrer"
									>
										{ report_title }
									</a>
								</li>
								<li>
									<small>
										<img src={ branchSVG } alt={ 'branch' } width={ 16 } height={ 16 } />{ ' ' }
										<a
											href={ branchUrl }
											target={ '_blank' }
											className={ 'report-link' }
											rel="noreferrer"
										>
											{ ref_name.length > 50 ? ref_name.substring( 0, 50 ) + '...' : ref_name }
										</a>
										{ pr_number && (
											<span>
												&nbsp;&nbsp;&nbsp;&nbsp;
												<a
													href={ prUrl }
													target={ '_blank' }
													className={ 'report-link' }
													rel={ 'noreferrer' }
												>
													<img src={ prSVG } alt={ 'branch' } width={ 16 } height={ 16 } /> PR{ ' ' }
													{ pr_number }
												</a>
											</span>
										) }
										{ ! pr_number && (
											<span>
												&nbsp;&nbsp;&nbsp;&nbsp;
												<a
													href={ shaUrl }
													target={ '_blank' }
													className={ 'report-link' }
													rel={ 'noreferrer' }
												>
													<img src={ commitSVG } alt={ 'branch' } width={ 16 } height={ 16 } />{ ' ' }
													commit { sha.substring( 0, 6 ) }
												</a>
											</span>
										) }
									</small>
								</li>
							</ul>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="32"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								className={ 'collapse-indicator' }
								id={ `btn-${ id }` }
							>
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</th>
					</tr>
				</thead>
				<tbody>
					{ this.state.groups[ group ].reports.map( ( report, idx ) => {
						return this.getReportRow( report, idx );
					} ) }
				</tbody>
			</Table>
		);
	}

	getReportRow( report, id ) {
		return (
			<tr key={ id } className={ 'collapsed' }>
				<td className={ 'reportNameCell' }>{ this.getReportLinkCell( report ) }</td>
				<td>
					{ this.getTestResultsCell( report.results ) }{ ' ' }
					{ this.getTestResultsHistoryCell( report.history ) }
				</td>
				<td>{ this.getMetadataCell( report ) }</td>
			</tr>
		);
	}

	getReportLinkCell( report ) {
		const { results, path, suite } = report;
		const linkUrl = `${ getDataSourceUrl() }/reports/${ path }/index.html`;
		let status = '';
		if ( results.total > 0 ) {
			status = results.total !== results.passed + results.skipped ? 'F' : 'P';
		}

		return (
			<ul className={ 'list-unstyled' }>
				<li>
					{ this.getStatusIcon( status, 16, 16 ) }
					&nbsp;&nbsp;
					<a href={ linkUrl } className="report-link" target="_blank" rel="noreferrer">
						{ suite }
						<br />
					</a>
				</li>
			</ul>
		);
	}

	getTestResultsCell( results ) {
		const counts = [ 'failed', 'passed', 'skipped', 'total' ].map( ( label, id ) => {
			const count = results[ label ];
			if ( count === 0 ) {
				return null;
			}
			return (
				<span key={ id } className={ `label label-status-${ label }` }>
					{ label } { count }
				</span>
			);
		} );

		return <div>{ counts }</div>;
	}

	getTestResultsHistoryCell( history ) {
		const formattedHistory = history
			.slice( -10 )
			.split( '' )
			.map( ( item, id ) => {
				const statusClass = item === 'F' ? 'failed' : 'passed';
				return (
					<span key={ id } className={ `label label-status-${ statusClass }` }>
						{ item }
					</span>
				);
			} );
		return <div>{ formattedHistory }</div>;
	}

	getMetadataCell( report ) {
		const repo = report.repository ? report.repository : 'woocommerce/woocommerce';
		const runUrl = `https://github.com/${ repo }/actions/runs/${ report.run_id }`;
		return (
			<ul className={ 'list-unstyled' }>
				<li>
					<small>last update: { moment( report.updated_on ).fromNow() }</small>
				</li>
				<li>
					<small>
						last run id:{ ' ' }
						<a href={ runUrl } target={ '_blank' } className={ 'report-link' } rel="noreferrer">
							{ report.run_id }
						</a>
					</small>
				</li>
			</ul>
		);
	}

	getStatusIcon( status, height, width ) {
		let svg;
		switch ( status ) {
			case 'F':
				svg = failedSVG;
				break;
			case 'P':
				svg = passedSVG;
				break;
			case 'R':
				svg = recoveredSVG;
				break;
			default:
				svg = unknownSVG;
				break;
		}
		return (
			<img
				src={ svg }
				className={ 'status-icon' }
				alt={ 'status icon' }
				width={ width }
				height={ height }
			/>
		);
	}

	getGroupsHistory() {
		const { groups } = this.state;
		return Object.keys( groups )
			.reverse()
			.map( ( groupKey, idx ) => {
				const status = groups[ groupKey ].status ? groups[ groupKey ].status.toUpperCase() : '';

				let statusClass;
				switch ( status ) {
					case 'F':
						statusClass = 'failed';
						break;
					case 'P':
						statusClass = 'passed';
						break;
					case 'R':
						statusClass = 'broken';
						break;
					default:
						statusClass = 'neutral';
						break;
				}

				return (
					<span
						key={ idx }
						role="button"
						tabIndex={ 0 }
						className={ `pill label-status-${ statusClass }` }
						onClick={ () =>
							window.open(
								this.props.params.groupKey
									? window.location.href
									: this.groupReportHref( groupKey ),
								'_blank'
							)
						}
						onKeyDown={ e => {
							if ( e.key === 'Enter' || e.key === ' ' ) {
								window.open(
									this.props.params.groupKey
										? window.location.href
										: this.groupReportHref( groupKey ),
									'_blank'
								);
							}
						} }
						style={ { cursor: 'pointer' } }
					/>
				);
			} );
	}

	toggleVisibility = groupIndex => {
		const rows = document.querySelectorAll( `#group-${ groupIndex } tbody tr` );
		for ( const row of rows ) {
			row.classList.toggle( 'collapsed' );
		}
		const collapseBtnElement = document.getElementById( `btn-${ groupIndex }` );
		collapseBtnElement.classList.toggle( 'collapsed' );
	};

	render() {
		if ( ! this.state.isDataFetched ) {
			return null;
		}
		return (
			<div>
				<p>
					<small>
						{ Object.keys( this.state.groups ).length }{ ' ' }
						{ this.state.event === 'pull_request' ? 'pull requests' : 'runs' }
					</small>
					,{ ' ' }
					<small>
						{ Object.values( this.state.groups ).reduce(
							( total, group ) => total + group.reports.length,
							0
						) }{ ' ' }
						reports
					</small>
				</p>
				<p>{ this.getGroupsHistory() }</p>
				<p className={ 'error' }>{ this.state.errorMessage }</p>
				{ Object.keys( this.state.groups ).map( ( k, idx ) => (
					<div key={ idx } id={ `group-${ idx }` }>
						{ this.getGroupTable( k, idx ) }
					</div>
				) ) }
			</div>
		);
	}
}

export default withRouter( Reports );
