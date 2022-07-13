#
# This script combines a previous Allure report with a new one to create history trend.
#
# The following environment variables must be set in order to use this script:
# - OLD_ALLURE_REPORT_PATH
# - NEW_ALLURE_RESULTS_PATH
# - OUTPUT_PATH
#
#!/usr/bin/env bash

mkdir -p $NEW_ALLURE_RESULTS_PATH/history

cp -r $OLD_ALLURE_REPORT_PATH/history/* $NEW_ALLURE_RESULTS_PATH/history

allure generate --clean $NEW_ALLURE_RESULTS_PATH --output $OUTPUT_PATH
