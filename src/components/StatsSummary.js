import React from 'react';
import moment from 'moment';
import { prettyNumber } from '../utils/format';

const StatsSummary = React.memo(
	( { title, data, lastUpdate, isTestRuns = false, periods = [ '24h', '7d', '14d', '30d' ] } ) => {
		const renderStatBox = period => {
			const stats = data[ period ];
			if ( ! stats ) return null;

			return (
				<div key={ period } className="col-sm">
					<div className="stat-box">
						<span className="stat-number" title={ isTestRuns ? stats.attempts : stats.testsTotal }>
							{ prettyNumber( isTestRuns ? stats.attempts : stats.testsTotal ) }
						</span>
						<br />
						<span className="stat-number-sub">
							<small>
								{ isTestRuns
									? `${ stats.reRunsRate }% reruns`
									: `${ stats.testsFailedRate }% failed` }
							</small>
						</span>
						<br />
						<span className="stat-description">{ period }</span>
					</div>
				</div>
			);
		};

		return (
			<>
				<div className="row title-row">
					<div className="col-sm">
						<span className="inner-title">{ title }</span>
						{ lastUpdate && (
							<>
								<br />
								<span className="caption">updated { moment( lastUpdate ).fromNow() }</span>
							</>
						) }
					</div>
				</div>
				<div className="row text-center">{ periods.map( renderStatBox ) }</div>
			</>
		);
	}
);

StatsSummary.displayName = 'StatsSummary';

export default StatsSummary;
