import React from 'react';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';
import { Tooltip } from 'recharts';
import moment from 'moment';
import TestResultsTooltip from '../TestResultsTooltip';

const TestsPerAttemptChart = React.memo( ( { data } ) => {
	const axisTickStyle = { fontSize: '0.8rem' };

	return (
		<div className="chartContainer">
			<ResponsiveContainer width="100%" height="100%">
				<ComposedChart data={ data }>
					<CartesianGrid stroke="#454c54" strokeDasharray="2 2" />
					<XAxis
						dataKey="date"
						axisLine={ false }
						interval="preserveStartEnd"
						tickFormatter={ tickItem => moment( tickItem ).format( 'DD MMM YY' ) }
						tick={ { fontSize: '0.8rem' } }
					/>
					<YAxis type="number" axisLine={ false } tick={ axisTickStyle } />
					<YAxis
						yAxisId="reRunsRate"
						orientation="right"
						axisLine={ false }
						tick={ axisTickStyle }
					/>
					<Legend
						verticalAlign="top"
						align="right"
						height={ 40 }
						wrapperStyle={ { right: '55px' } }
					/>
					<Tooltip />
					<Bar
						dataKey="testsPerAttempt"
						name="tests per run attempt"
						fill="rgba( 170, 170, 170, 0.73 )"
						legendType="circle"
						maxBarSize={ 20 }
					/>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
} );

TestsPerAttemptChart.displayName = 'TestsPerAttemptChart';

export default TestsPerAttemptChart;
