import { Table, Button } from 'react-bootstrap';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCodeBranch, faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import configData from '../config.json';

export default class ReportsTable extends React.Component {
	state = {
		reports: this.props.reports,
		sort: { by: 'lastUpdate', isAsc: false },
	};

	componentDidMount() {
		this.sortTable( this.state.sort.by, this.state.sort.isAsc );
	}

	sortTable( by, isAsc ) {
		this.setState( { sort: { by, isAsc } } );

		switch ( by ) {
			case 'name':
				return this.sortByName( isAsc );
			case 'lastUpdate':
				return this.sortByDate( isAsc );
			case 'statistic':
				return this.sortByStatus( isAsc );
		}
	}

	sortByDate( isSortAsc ) {
		return this.state.reports.sort( ( r1, r2 ) => {
			if ( isSortAsc ) {
				return Date.parse( r1.lastUpdate ) - Date.parse( r2.lastUpdate );
			}
			return Date.parse( r2.lastUpdate ) - Date.parse( r1.lastUpdate );
		} );
	}

	sortByName( isSortAsc ) {
		return this.state.reports.sort( ( r1, r2 ) =>
			isSortAsc ? r1.name - r2.name : r2.name - r1.name
		);
	}

	sortByStatus( isSortAsc ) {
		return this.state.reports.sort( ( r1, r2 ) => {
			if ( isSortAsc ) {
				return (
					r1.statistic.failed + r1.statistic.broken - ( r2.statistic.failed + r2.statistic.broken )
				);
			}
			return (
				r2.statistic.failed + r2.statistic.broken - ( r1.statistic.failed + r1.statistic.broken )
			);
		} );
	}

	getTableHeader() {
		const head = {
			name: 'report id',
			statistic: 'no of failures',
			lastUpdate: 'most recent',
		};

		const klass = this.state.sort.isAsc ? 'sort-by-asc' : 'sort-by-desc';
		let sortButtons;

		if ( this.props.options.sortButtons ) {
			sortButtons = Object.keys( head ).map( ( key, index ) => {
				return (
					<Button
						variant="dark"
						className="filter-btn"
						key={ index }
						onClick={ () => {
							this.sortTable( key, ! this.state.sort.isAsc );
						} }
					>
						{ head[ key ].toUpperCase() }
						{ <span className={ this.state.sort.by === key ? klass : '' } /> }
					</Button>
				);
			} );
		}

		let reportCount;
		if ( this.props.reportCount ) {
			reportCount = `${ this.state.reports.length } reports`;
		}

		return (
			<thead>
				<tr className={ 'headerRow' }>
					<td colSpan="3" className={ 'sort-buttons' }>
						<div className={ 'd-flex justify-content-between' }>
							<div>{ reportCount }</div>
							<div>{ sortButtons }</div>
						</div>
					</td>
				</tr>
			</thead>
		);
	}

	getReportRow( report, id ) {
		const { statistic, metadata, history } = report; //destructuring
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
		const linkUrl = `${ configData.dataSourceURL }/reports/${ report.name }/report/index.html`;

		const reportKey = report.name;
		let reportTitle = report.name;

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
		return (
			<Table size="sm" responsive="sm" borderless className="reportsTable">
				{ this.getTableHeader() }
				<tbody>
					{ this.state.reports.map( ( report, id ) => this.getReportRow( report, id ) ) }
				</tbody>
				<tfoot>
					<tr>
						<td colSpan={ 3 } />
					</tr>
				</tfoot>
			</Table>
		);
	}
}
