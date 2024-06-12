import React from 'react';
import Reports from "./Reports";

export default class DailyReports extends React.Component {
	render() {
		return (
				<Reports event='daily-e2e, daily-checks, nightly-checks' />
		);
	}
}
