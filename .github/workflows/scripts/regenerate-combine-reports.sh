#!/usr/bin/env bash

if [[ -d "$REPO_ALLURE_REPORT_PATH" ]]; then

    # The test has previous report.
    # Combine it with newly downloaded one to create history trend.
    mkdir -p $REPO_ALLURE_RESULTS_PATH/history
    cp -r $REPO_ALLURE_REPORT_PATH/history/* $REPO_ALLURE_RESULTS_PATH/history
    cp -r $DOWNLOAD_ALLURE_RESULTS_PATH/* $REPO_ALLURE_RESULTS_PATH

    # Regenerate the report.
    allure generate --clean $REPO_ALLURE_RESULTS_PATH --output $REPO_ALLURE_REPORT_PATH

else

    # Create the first report by copying the downloaded one.
    cp -r $DOWNLOAD_ALLURE_REPORT_PATH $REPO_ALLURE_REPORT_PATH
    cp -r $DOWNLOAD_ALLURE_RESULTS_PATH $REPO_ALLURE_RESULTS_PATH

fi
