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
			reports: [],
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
				const reports =  jsonData.reports.filter( report => report.metadata.event_name === this.state.event );

				this.setState( {
					reports,
					reportsCount: jsonData.reportsCount,
					isDataFetched: true,
				} );
			} )
			.catch( console.log );
		this.sortByDate( false )
	}

	sortByDate( isSortAsc ) {
		return this.state.reports.sort( ( r1, r2 ) => {
			if ( isSortAsc ) {
				return Date.parse( r1.lastUpdate ) - Date.parse( r2.lastUpdate );
			}
			return Date.parse( r2.lastUpdate ) - Date.parse( r1.lastUpdate );
		} );
	}

	getReportRow( report, id ) {
		const { statistic, metadata, history } = report;
		const isFailed = statistic.total !== statistic.passed + statistic.skipped;
		return (
			<tr key={ id }>
				<td className={ 'reportNameCell' }>
					{ this.getReportLinkCell( report, metadata, isFailed, statistic.total ) }
				</td>
				<td>{ this.getTestResultsCell( statistic ) } { this.getTestResultsHistoryCell( history ) }</td>
				<td>{ this.getMetadataCell( report ) }</td>
			</tr>
		);
	}

	getReportLinkCell( report, metadata, isFailed, totalTests ) {
		const linkUrl = `${ configData.dataSourceURL }/reports/${ report.metadata.path }/index.html`;

		const reportKey = report.id;
		let reportTitle = report.id;

		if ( metadata.pr_title ) {
			const prNumber = `(#${ metadata.pr_number })`;
			reportTitle = `${ metadata.pr_title } ${ prNumber }`;
		}

		const branchUrl = `https://github.com/${ metadata.repository }/tree/${ metadata.branch }`;
		const prUrl = `https://github.com/${ metadata.repository }/pull/${ metadata.pr_number }`;

		let statusIcon = faQuestion;
		let statusClassName = 'warning';
		if ( totalTests > 0 ) {
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
						{ reportTitle }
						<br />
					</a>
				</li>
				<li>
					<small>
						#{ reportKey } { ' • ' }
						<FontAwesomeIcon icon={ faCodeBranch } />{ ' ' }
						<a href={ branchUrl } target={ '_blank' } className={ 'report-link' } rel="noreferrer">
							{ metadata.branch }
						</a>
						{ metadata.pr_number ? ' • ' : '' }
						{ metadata.pr_number && (
							<a
								href={ prUrl }
								target={ '_blank' }
								className={ 'report-link' }
								rel={ 'noreferrer' }
							>
								PR { metadata.pr_number }
							</a>
						) }
					</small>
				</li>
			</ul>
		);
	}

	getTestResultsCell( statistic ) {
		const counts = [ 'failed', 'passed', 'total' ].map( ( label, id ) => {
			const count = label === 'failed' ? statistic[ label ] + statistic.broken : statistic[ label ];
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
		const runUrl = `https://github.com/Automattic/jetpack/actions/runs/${ report.metadata.run_id }`;
		return (
			<ul className={ 'list-unstyled' }>
				<li>
					<small>last update: { moment( report.lastUpdate ).fromNow() }</small>
				</li>
				<li>
					<small>
						last run id:{ ' ' }
						<a href={ runUrl } target={ '_blank' } className={ 'report-link' } rel="noreferrer">
							{ report.metadata.run_id }
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
			<Table size="sm" responsive="sm" borderless className="reportsTable">
				<thead>
				<tr className={'headerRow'}>
					<td colSpan="3" className={'sort-buttons'}>
						<div className={'d-flex justify-content-between'}>
							<div>{this.state.reports.length} reports</div>
						</div>
					</td>
				</tr>
				</thead>
				<tbody>
				{this.state.reports.map((report, id) => this.getReportRow(report, id))}
				</tbody>
				<tfoot>
				<tr>
					<td colSpan={3}>Total reports: {this.state.reportsCount}</td>
				</tr>
				</tfoot>
			</Table>
		);
	}
}
