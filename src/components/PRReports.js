import React from 'react';
import Reports from "./Reports";

export default class PRReports extends React.Component {
	render() {
		return (
				<Reports event='pull_request' groupKey='pr_number' />
		);
	}
}
