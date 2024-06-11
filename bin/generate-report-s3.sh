#!/usr/bin/env bash

# This script generates a report from the Allure results in the RESULTS_PATH directory and uploads it to S3.
# Required:
# - RESULTS_PATH: Path to the test results directory
# - REPORT_PATH: The path where the report will be generated

set -eo pipefail

# Test Allure installation
echo "Checking Allure installation"
allure --version

SCRIPT_PATH=$(
  cd "$(dirname "${BASH_SOURCE[0]}")" || return
  pwd -P
)

# Check that Allure results directory exists
if [[ -z "$RESULTS_PATH" ]]; then
  echo "::error::RESULTS_PATH must be set"
  exit 1
fi

ALLURE_RESULTS_PATH=$(realpath "$RESULTS_PATH"/allure-results)

if [[ ! -d "$ALLURE_RESULTS_PATH" ]]; then
  echo "::error::'$ALLURE_RESULTS_PATH' does not exist or is not a directory"
  exit 1
else
  echo "Found Allure results path: $ALLURE_RESULTS_PATH"
fi

if [[ -z "$EVENT_NAME" ]]; then
     echo "::error:: missing EVENT_NAME environment variable"
     exit 1
fi

if [[ -z "$REPORT_GROUP" ]]; then
     echo "::error:: missing REPORT_GROUP environment variable"
     exit 1
fi

if [[ -z "$REPORT_NAME" ]]; then
     echo "::error:: missing REPORT_NAME environment variable"
     exit 1
fi

s3_reports_path="s3://a8c-woo-test-reports/reports"
REPORTS_BASE_URL=$(jq -r '.reportDeepUrl' "$SCRIPT_PATH/../src/config.json")

echo "----------------------------------------"

echo "Creating report '$REPORT_ID'"

echo "Getting history from existing report in S3"
aws s3 cp --only-show-errors --recursive "$s3_reports_path/$REPORT_ID/report/history" "$ALLURE_RESULTS_PATH/history" || true

S3_REPORT_PATH="$EVENT_NAME/$REPORT_GROUP/$REPORT_NAME"
echo "Creating executor.json"
jq -n --arg url "$REPORTS_BASE_URL" \
  --arg reportUrl "$REPORTS_BASE_URL/$S3_REPORT_PATH" \
  --arg buildName "run #$RUN_ID" \
    '{"type":"github", "buildName":$buildName, "url":$url,"reportUrl":$reportUrl}' \
  >"$ALLURE_RESULTS_PATH/executor.json"
cat "$ALLURE_RESULTS_PATH/executor.json"

echo "Generating new report"
allure generate --clean "$ALLURE_RESULTS_PATH" --output "$REPORT_PATH"

echo "Updating report title"
# shellcheck disable=SC2002
cat "$REPORT_PATH/widgets/summary.json" | jq --arg name "$SUITE_NAME - $REPORT_TITLE" '.reportName|=$name' >"$REPORT_PATH/widgets/summary.tmp"
mv "$REPORT_PATH/widgets/summary.tmp" "$REPORT_PATH/widgets/summary.json"
cat "$REPORT_PATH/widgets/summary.json"

echo "Writing metadata to file"

if [[ ! -f "$REPORT_PATH/metadata.json" ]]; then
    echo "metadata.json not found"
    touch "$REPORT_PATH/metadata.json"
fi

METADATA="{
  \"suite\": \"$SUITE_NAME\",
  \"ref_name\": \"$REF_NAME\",
  \"run_id\": \"$RUN_ID\",
  \"event_name\": \"$EVENT_NAME\",
  \"report_title\": \"$REPORT_TITLE\",
  \"pr_number\": \"$PR_NUMBER\",
  \"sha\": \"$COMMIT_SHA\"
}"

echo "$METADATA" | jq --arg updateDate "$(date +"%Y-%m-%dT%H:%M:%S%z")" '. + {"updated_on":$updateDate}' >"$REPORT_PATH/metadata.json"
cat "$REPORT_PATH/metadata.json"

echo "Minifying JSON files"
while IFS= read -r -d '' file
do
  jq -c . < "$file" > "$file.min" && mv "$file.min" "$file"
done <   <(find "$REPORT_PATH" -name '*.json' -print0)

echo "Copying report to S3"
aws s3 cp "$REPORT_PATH" "$s3_reports_path/$S3_REPORT_PATH" --recursive --only-show-errors

#echo "Cleaning up: remove results dir $RESULTS_PATH"
#rm -rf "$RESULTS_PATH"

echo
echo "----------------------------------------"
