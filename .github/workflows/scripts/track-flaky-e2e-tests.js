const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');

const token = process.env.GITHUB_ISSUE_TOKEN;
const csvFile = process.env.E2E_TEST_REPORT_CSV;
const labels = ['team: Vortex', 'focus: e2e tests', 'metric: flaky e2e test'];

(async () => {
  // load the CSV with test run results
  try {
    const csvData = await fs.promises.readFile(csvFile, 'utf8');

    // parse the CSV
    const parsedData = Papa.parse(csvData, { header: true }).data;
    // filter out the failed tests
    const failedRows = parsedData.filter((row) => row.Status === 'failed');

     for await (const row of failedRows) {
      const issueData = {
        title: `[Flaky] ${row.Suite}`,
        body: `${row.Name} \r\n\r\nFailed on: https://github.com/woocommerce/woocommerce/actions/runs/${process.env.RUN_ID}`,
      };

      // query GitHub to see if a matching issue exists yet
      const repo = 'woocommerce';
      const searchString = issueData.title;
      // looking for matching open issues in the woocommerce repo
      const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(
        `repo:${repo}/${repo} ${searchString} in:title type:issue state:open`
      )}`;
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const issues = searchResponse.data.items;
      if (issues.length > 0) {
        // if a matching issue exists, post a comment.
        console.log('Matching issue found');
        console.log(issueData.title);
        const issue = issues[0]; // just in case multiple issues are returned
        const commentUrl = `https://api.github.com/repos/${repo}/${repo}/issues/${issue.number}/comments`;
        await axios.post(
          commentUrl,
          { body: issueData.body },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // if no matching issue is found, create a new issue.
        console.log('No matching issues found');
        console.log(issueData.title);
        const createIssueUrl = `https://api.github.com/repos/${repo}/${repo}/issues`;
        await axios.post(
          createIssueUrl,
          {
            title: issueData.title,
            body: issueData.body,
            labels: labels,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    }
    console.log('All operations completed successfully');
  } catch (error) {
    console.error('Error:', error.response.data);
  }
})();
