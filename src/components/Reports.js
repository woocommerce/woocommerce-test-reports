import React from 'react';
import configData from '../config.json';
import { Table } from 'react-bootstrap';
import moment from 'moment';
import branchSVG from '../assets/branch.svg';
import commitSVG from '../assets/commit.svg';
import prSVG from '../assets/pr.svg';
import passedSVG from '../assets/passed.svg';
import failedSVG from '../assets/failed.svg';
import unknownSVG from '../assets/unknown.svg';

export default class Reports extends React.Component {
	constructor( props ) {
		super( props );
		this.state = {
			event: this.props.event,
			groupKey: this.props.groupKey,
			groups: [],
			reportsCount: undefined,
			isDataFetched: false,
		};
	}

	componentDidMount() {
		fetch( `${ configData.dataSourceURL }/data/reports.json`, {
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

				this.setState( {
					groups,
					reportsCount: jsonData.reportsCount,
					isDataFetched: true,
				} );
			} )
			.catch( console.log );
		this.sortByDate( false );
	}

	sortByDate( isSortAsc ) {
		return this.state.groups.sort( ( r1, r2 ) => {
			if ( isSortAsc ) {
				return Date.parse( r1.lastUpdate ) - Date.parse( r2.lastUpdate );
			}
			return Date.parse( r2.lastUpdate ) - Date.parse( r1.lastUpdate );
		} );
	}

	getGroupTable( group, id ) {
		//       "lastUpdate": "2024-06-14T11:36:44.433Z",
		const { pr_number, report_title, ref_name, repository, sha } = this.state.groups[ group ];
		const repo = repository ? repository : 'woocommerce/woocommerce';
		const branchUrl = `https://github.com/${ repo }/tree/${ ref_name }`;
		const prUrl = `https://github.com/${ repo }/pull/${ pr_number }`;
		const shaUrl = `https://github.com/${ repo }/commit/${ sha }`;

		return (
			<Table id={ id } responsive="sm" variant="dark" borderless hover className={ 'reportsTable' }>
				<thead>
					<tr>
						<th colSpan={ 3 }>
							<ul className={ 'list-unstyled' }>
								<li className={ 'groupTitle' }>{ report_title }</li>
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
			<tr key={ id }>
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
		const isFailed = results.total !== results.passed + results.skipped;
		const linkUrl = `${ configData.dataSourceURL }/reports/${ path }/index.html`;
		let statusIcon = <img src={ unknownSVG } alt={ 'status icon' } width={ 16 } height={ 16 } />;
		if ( results.total > 0 ) {
			statusIcon = isFailed ? (
				<img src={ failedSVG } alt={ 'status icon' } width={ 16 } height={ 16 } />
			) : (
				<img src={ passedSVG } alt={ 'status icon' } width={ 16 } height={ 16 } />
			);
		}

		return (
			<ul className={ 'list-unstyled' }>
				<li>
					{ statusIcon }
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
				{ Object.keys( this.state.groups ).map( ( k, idx ) => {
					return this.getGroupTable( k, idx );
				} ) }
			</div>
		);
	}
}
