import React from 'react';
import configData from '../config.json';
import {Table} from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCodeBranch, faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';

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
					groups = {
						...jsonData[ event ]
					}
				}

				console.log(groups);

				this.setState( {
					groups,
					reportsCount: jsonData.reportsCount,
					isDataFetched: true,
				} );
			} )
			.catch( console.log );
		this.sortByDate( false )
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
		//       "pr_number": "46466",
		//       "report_title": "Product Collection Track block instances and feature usage",
		//       "ref_name": "add/collection-instances-telemetry",
		//       "sha": "d0362a2e48109f208df49d9b29ea9acc4fdae92d",
		const { pr_number, report_title, ref_name, repository } = this.state.groups[group];
		const repo = repository ? repository : 'woocommerce/woocommerce';
		const branchUrl = `https://github.com/${ repo }/tree/${ ref_name }`;
		const prUrl = `https://github.com/${ repo }/pull/${ pr_number }`;

		return (
			<Table id={id} size="sm" variant="dark" responsive className={'reportsTable'}>
				<thead>
				<tr>
					<th colSpan={3}>
						<ul className={'list-unstyled'}>
							<li>{report_title}</li>
							<li>
								<small>
									<FontAwesomeIcon icon={faCodeBranch}/>{' '}
									<a href={branchUrl} target={'_blank'} className={'report-link'} rel="noreferrer">
										{ref_name}
									</a>
									{pr_number ? ' • ' : ''}
									{pr_number && (
										<a
											href={prUrl}
											target={'_blank'}
											className={'report-link'}
											rel={'noreferrer'}
										>
											PR {pr_number}
										</a>
									)}
								</small>
							</li>
						</ul>
					</th>
				</tr>
				</thead>
					<tbody>
						{ this.state.groups[group].reports.map( ( report, idx ) => {
								return this.getReportRow( report, idx );
						} ) }
					</tbody>
			</Table>
		);
	}

	getReportRow( report, id ) {
		return (
			<tr key={ id }>
				<td className={ 'reportNameCell' }>
					{ this.getReportLinkCell( report ) }
				</td>
				<td>
					{ this.getTestResultsCell( report.results ) } { this.getTestResultsHistoryCell( report.history ) }
				</td>
				<td>
					{ this.getMetadataCell( report ) }
				</td>
			</tr>
		);
	}

	getReportLinkCell( report ) {
		const { results, path, suite } = report;
		const isFailed = results.total !== results.passed + results.skipped;
		const linkUrl = `${ configData.dataSourceURL }/reports/${ path }/index.html`;
		let statusIcon = faQuestion;
		let statusClassName = 'warning';
		if ( results.total > 0 ) {
			statusIcon = isFailed ? faTimes : faCheck;
			statusClassName = isFailed ? 'failed' : 'passed';
		}

		return (
			<ul className={ 'list-unstyled' }>
				<li>
					<FontAwesomeIcon className={ statusClassName } icon={ statusIcon } />
					&nbsp;
					<a
						href={ linkUrl }
						className="report-link"
						target="_blank"
						rel="noreferrer"
					>
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
		const formattedHistory = history.slice(-10).split('').map( ( item, id ) => {
			const statusClass = item === 'F' ? 'failed' : 'passed';
			return (<span key={ id } className={ `label label-status-${statusClass}` }>{ item }</span>)
		});
		return <div>{ formattedHistory }</div>;
	}

	getMetadataCell( report ) {
		const repo = report.repository ? report.repository : 'woocommerce/woocommerce';
		const runUrl = `https://github.com/${repo}/actions/runs/${ report.run_id }`;
		return (
			<ul className={ 'list-unstyled' }>
				<li>
					<small>last update: { moment( report.lastUpdate ).fromNow() }</small>
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
				<small>{Object.keys(this.state.groups).length} report groups</small>
				{Object.keys(this.state.groups).map((k, idx) => {
					return this.getGroupTable(k, idx);
				})
				}
				<small>Total reports for all events: {this.state.reportsCount}</small>
			</div>
		);
	}
}
