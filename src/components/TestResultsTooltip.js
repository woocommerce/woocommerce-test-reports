import React from 'react';
import moment from 'moment';

const TestResultsTooltip = React.memo(({ active, payload, label }) => {
	if (!active || !payload || !payload.length) {
		return null;
	}

	return (
		<div
			className="custom-tooltip"
			style={{ backgroundColor: '#212529', border: '1px solid #454c54', padding: '10px' }}
		>
			<p className="label">{moment(label).format('DD MMMM YYYY')}</p>
			<hr />
			{payload.map((item, index) => (
				<div key={index}>
					<p className="label" style={{ color: item.color }}>
						{`${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`}
					</p>
				</div>
			))}
		</div>
	);
});

TestResultsTooltip.displayName = 'TestResultsTooltip';

export default TestResultsTooltip;
