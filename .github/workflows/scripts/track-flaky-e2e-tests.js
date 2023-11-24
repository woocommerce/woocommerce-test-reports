const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');

const token = process.env.GITHUB_ISSUE_TOKEN;
const csvFile = process.env.E2E_TEST_REPORT_CSV;
const labels = [ 'team: Solaris', 'focus: e2e tests', 'metric: flaky e2e test' ];

// load the CSV with test run results
fs.readFile(csvFile, 'utf8', (error, csvData) => {
  if (error) {
    console.error('Error reading CSV file:', error);
    return;
  }
	
	// parse the CSV
	const parsedData = Papa.parse(csvData, { header: true }).data;
	// filter out the failed tests
	const failedRows = parsedData.filter(row => row.Status === 'failed');
	// construct the request body we'll be sending to GitHub
	failedRows.forEach( row => {
		const issueData = {
			title: `[Flaky] ${ row.Suite }`,
			body: `${ row.Name } \r\n\r\nFailed on: https://github.com/woocommerce/woocommerce/actions/runs/${ process.env.RUN_ID }`
		};
		
		// query GitHub to see if a matching issue exists yet
		const repo = 'woocommerce';
		const searchString = issueData.title;
		// looking for matching open issues in the woocommerce repo
		const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${ repo }/${ repo } ${ searchString } in:title type:issue state:open`)}`;
		axios.get(searchUrl)
			.then( response => {
				const issues = response.data.items;
				if ( issues.length > 0 ) {
					// if a matching issue exists, post a comment.
					console.log( 'Matching issue found' );
					const issue = issues[ 0 ]; // just in case multiple issues are returned
					const commentUrl = `https://api.github.com/repos/${ repo }/${ repo }/issues/${ issue.number }/comments`;
					return axios.post( commentUrl, { body: issueData.body }, {
						headers: {
							Authorization: `Bearer ${ token }`,
						},
					} );
				} else {
					// if no matching issue is found, create a new issue.
					console.log( 'No matching issues found' );
					const createIssueUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
					return axios.post( createIssueUrl, { 
						title: issueData.title, 
						body: issueData.body,
						labels: labels,
					}, {
						headers: {
							Authorization: `Bearer ${ token }`,
						},
					} );
				}
			} )
			.then(response => {
				console.log( 'Operation successful:', response.data );
			})
			.catch(error => {
				console.error( 'Error: ', error.response.data );
			} );
	} );
});
