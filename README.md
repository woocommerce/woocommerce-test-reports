[![Reports status](https://img.shields.io/website?down_color=grey&down_message=Dashboard%20offline&style=for-the-badge&label=E2E%20TEST%20REPORTS&up_color=green&up_message=see%20dashboard&url=https%3A%2F%2Fwoocommerce.github.io%2Fwoocommerce-test-reports%2F%23%2F)](https://woocommerce.github.io/woocommerce-test-reports)

# Woocommerce test reports

This repo contains a suite of scripts used to generate Allure reports for test runs, some data files with test results stats and the code for a dashboard to display the data from those files.

## Accessing reports

You can find all the available reports and stats by checking the [reports list](https://woocommerce.github.io/woocommerce-test-reports).

## How it works

All the reports are stored in an Amazon S3 bucket.

The tests run in [Woocommerce monorepo](https://github.com/woocommerce/woocommerce) CI. The monorepo job sends a workflow call event to this repo with all the required information about the test run, triggering the report workflow.

The reports are generated using [Allure](http://allure.qatools.ru) framework. Allure results in json format are being created by the tests and are stored as artefacts in GitHub after each test run. The workflow in this repo will download the artefacts, use the results to generate a new report and then push the results and the newly generated report in the configured S3 bucket.

## Stats

After each report gets generated the report details and all tests results are also pushed in json data files. 
These data files are used by the dashboard to display data.
Once a day, a GitHub action runs and (re)generates some stats based on the stored results.

All data files are stored in the `data` folder in the S3 bucket.

You can refer to the [scripts docs](bin/README.md) for more information.

## Cleanup

A cleanup job runs on a schedule, deleting:

- reports for pull requests that are closed
- reports that were not updated in the last `n` days, depending on the type of report. Some are kept for 30 days, others for longer. Check the `bin/cleanup-reports.js` script for details on this configuration.

## Dashboard app

The dashboard app is deployed automatically to GitHub Pages when code is pushed to the repo.
