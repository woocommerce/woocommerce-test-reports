import React from 'react';
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import moment from 'moment';

const FailureRatesChart = React.memo( ( { data } ) => {
	const off = chartData => {
		const dataMax = Math.max( ...chartData.map( i => i.avgDelta ) );
		if ( dataMax <= 0 ) {
			return 0;
		}

		const dataMin = Math.min( ...chartData.map( i => i.avgDelta ) );
		if ( dataMin >= 0 ) {
			return 1;
		}

		return dataMax / ( dataMax - dataMin );
	};

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
					<YAxis yAxisId="failureRate" axisLine={ false } unit="%" tick={ axisTickStyle } />
					<Tooltip />
					<Line
						unit="%"
						type="monotone"
						name="trunk failure rate"
						yAxisId="failureRate"
						dataKey="avgTrunk"
						stroke="rgba(186, 110, 98, 0.71)"
						strokeWidth={ 0 }
						legendType="circle"
						dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 0 } }
						activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
					/>
					<Line
						unit="%"
						type="monotone"
						name="total failure rate"
						yAxisId="failureRate"
						dataKey="avgTotal"
						stroke="rgba(186, 110, 98, 0.71)"
						strokeWidth={ 0 }
						legendType="circle"
						dot={ { fill: 'rgba(186, 110, 98, 0.71)', r: 0 } }
						activeDot={ { stroke: 'rgba(186, 110, 98, 0.71)', r: 8 } }
					/>
					<defs>
						<linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset={ off( data ) }
								stopColor="rgba( 115, 151, 75, 0.73 )"
								stopOpacity={ 1 }
							/>
							<stop offset={ off( data ) } stopColor="rgba(186, 110, 98, 0.71)" stopOpacity={ 1 } />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						yAxisId="failureRate"
						dataKey="avgDelta"
						name="delta"
						unit="%"
						fill="url(#splitColor)"
						strokeWidth={ 0 }
					/>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
} );

FailureRatesChart.displayName = 'FailureRatesChart';

export default FailureRatesChart;
