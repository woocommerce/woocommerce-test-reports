import React from 'react';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';
import { Tooltip } from 'recharts';
import moment from 'moment';
import TestResultsTooltip from '../TestResultsTooltip';

const TestRunsChart = React.memo( ( { data } ) => {
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
						unit="%"
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
						unit=" runs"
						dataKey="attempts"
						name="total"
						fill="rgba( 170, 170, 170, 0.73 )"
						legendType="circle"
						maxBarSize={ 20 }
					/>
					<Line
						unit="%"
						type="monotone"
						name="re-runs rate"
						yAxisId="reRunsRate"
						dataKey="reRunsRate"
						stroke="rgba(186, 110, 98, 0.71)"
						strokeWidth={ 2 }
						legendType="cross"
						dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 4 } }
						activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
					/>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
} );

TestRunsChart.displayName = 'TestRunsChart';

export default TestRunsChart;
