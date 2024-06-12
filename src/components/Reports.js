import React from 'react';
import configData from '../config.json';
import ReportsTable from './ReportsTable';

export default class Reports extends React.Component {
	constructor( props ) {
		super( props );
		this.state = {
			reports: [],
			pinnedReports: [],
			docsSize: undefined,
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
				const prReports = { reports: [] };
				const pinnedReports = { reports: [] };

				for ( const report of jsonData.reports ) {
					if ( configData.permanent.includes( report.name ) ) {
						pinnedReports.reports.push( report );
					} else {
						prReports.reports.push( report );
					}
				}

				this.setState( {
					reports: prReports.reports,
					pinnedReports: pinnedReports.reports,
					docsSize: jsonData.docsSize,
					reportsCount: jsonData.reportsCount,
					isDataFetched: true,
				} );
			} )
			.catch( console.log );
	}

	render() {
		if ( ! this.state.isDataFetched ) {
			return null;
		}
		return (
			<div>
				<div className={ 'reports-header' }>{ this.state.reportsCount } reports</div>
				<ReportsTable
					reports={ this.state.pinnedReports }
					options={ {
						reportCount: false,
						sortButtons: false,
					} }
				/>
				<ReportsTable
					reports={ this.state.reports }
					options={ {
						reportCount: false,
						sortButtons: true,
					} }
				/>
			</div>
		);
	}
}
