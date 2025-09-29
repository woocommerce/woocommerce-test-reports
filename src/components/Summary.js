import React, { useEffect } from 'react';
import moment from 'moment';
import { useTrunkFilter } from '../hooks/useTrunkFilter';
import { useSummaryData } from '../hooks/useSummaryData';
import FailureRatesChart from './charts/FailureRatesChart';
import TestResultsChart from './charts/TestResultsChart';
import TestRunsChart from './charts/TestRunsChart';
import TestsPerAttemptChart from './charts/TestsPerAttemptChart';
import StatsSummary from './StatsSummary';

const Summary = React.memo( () => {
	const { isTrunkOnly, getTrunkOnlyFilterButton } = useTrunkFilter( true );
	const summaryData = useSummaryData();

	useEffect( () => {
		summaryData.setIsTrunkOnly( isTrunkOnly );
	}, [ isTrunkOnly, summaryData.setIsTrunkOnly ] );

	if ( ! summaryData.isDataReady ) {
		return null;
	}

	return (
		<div>
			<div className="row">
				<div className="col-sm filters">{ getTrunkOnlyFilterButton() }</div>
			</div>
			<div className="row title-row">
				<div className="col-sm">
					<span className="inner-title">Failure rates</span>
					<br />
					<span className="caption">updated { moment( summaryData.lastUpdate ).fromNow() }</span>
				</div>
			</div>
			<FailureRatesChart data={ summaryData.failureRates } />
			<p className="caption center">Average 30 days failure rates, trunk vs total</p>
			<hr />

			<StatsSummary
				title="Tests"
				data={ summaryData.summary }
				lastUpdate={ summaryData.lastUpdate }
			/>
			<TestResultsChart data={ summaryData.days } />
			<p className="caption center">Daily test results</p>
			<hr />

			<StatsSummary
				title="Test runs"
				data={ summaryData.summary }
				lastUpdate={ summaryData.lastUpdate }
				isTestRuns={ true }
			/>
			<TestRunsChart data={ summaryData.days } />
			<p className="caption center">Daily test workflow runs</p>
			<TestsPerAttemptChart data={ summaryData.days } />
			<p className="caption center">Average tests per test workflow run attempt</p>
			<hr />
		</div>
	);
} );

Summary.displayName = 'Summary';

export default Summary;
