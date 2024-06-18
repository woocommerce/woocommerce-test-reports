# Scripts

The reports and other statistics are generated using a set of scripts, triggered by a `workflow_dispatch` event sent by the Woocommerce monorepo after a test run is completed.

The information required to successfully create a report and other statistics following a test run:
- build artifacts in the GitHub job that triggered the report (allure results)
  - `allure-results` folder, contains the test results in json format and other attachments
  - information about the test run, like the ref name, PR number, repository, run id, etc. You can check the report.yml workflow for the required inputs.

## Used scripts

- [generate-report-s3.sh](generate-report-s3.sh) - generates a report for a given test run. Triggered by a `workflow_dispatch` event, for each test run in the monorepo.
- [update-reports-list.js](update-reports-list.js) - updates the reports data file. Triggered after a report is created.
- [update-runs-data.js](update-runs-data.js) - updates the runs data files. Triggered after a report is created.
- [update-stats.js](update-stats.js) - updates the stats data files. Triggered on a schedule.
- [cleanup-reports.js](cleanup-reports.js) - deletes old reports and test results from storage and cleans up the reports data file. Triggered by a schedule event.
