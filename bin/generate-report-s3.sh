#!/usr/bin/env bash

# This script generates a report from the Allure results in the RESULTS_PATH directory and uploads it to S3.
# Required:
# - RESULTS_PATH: Path to the test results directory

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

# Validate RESULTS_PATH doesn't contain command injection characters
if [[ "$RESULTS_PATH" =~ [\;\&\|\$\`] ]]; then
  echo "::error::RESULTS_PATH contains invalid characters"
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

if [[ -z "$S3_REPORT_PATH" ]]; then
     echo "::error:: missing S3_REPORT_PATH environment variable"
     exit 1
fi

# Validate S3_REPORT_PATH and REPORT_PATH don't contain command injection characters
if [[ "$S3_REPORT_PATH" =~ [\;\&\|\$\`] ]]; then
     echo "::error::S3_REPORT_PATH contains invalid characters"
     exit 1
fi

if [[ "$REPORT_PATH" =~ [\;\&\|\$\`] ]]; then
     echo "::error::REPORT_PATH contains invalid characters"
     exit 1
fi

s3_reports_path="s3://a8c-woo-test-reports/reports"
REPORTS_BASE_URL=$(jq -r '.reportDeepUrl' "$SCRIPT_PATH/../src/config.json")

echo "----------------------------------------"

echo "Creating report '$REPORT_ID'"

echo "Getting history from existing report in S3"
aws s3 cp --only-show-errors --recursive "$s3_reports_path/$S3_REPORT_PATH/history" "$ALLURE_RESULTS_PATH/history" || true

echo "Creating executor.json"
jq -n --arg url "$REPORTS_BASE_URL" \
  --arg reportUrl "$REPORTS_BASE_URL/$S3_REPORT_PATH" \
  --arg buildName "run #$RUN_ID" \
  --arg reportName "$SUITE_NAME - $REPORT_TITLE" \
    '{"type":"github", "buildName":$buildName, "url":$url,"reportUrl":$reportUrl,"reportName":$reportName}' \
  >"$ALLURE_RESULTS_PATH/executor.json"
cat "$ALLURE_RESULTS_PATH/executor.json"

echo "Generating new report"
allure generate --clean "$ALLURE_RESULTS_PATH" --output "$REPORT_PATH"

echo "Writing metadata to file"

if [[ ! -f "$REPORT_PATH/metadata.json" ]]; then
    echo "metadata.json not found"
    touch "$REPORT_PATH/metadata.json"
fi

METADATA="{
  \"report_id\": \"$REPORT_ID\",
  \"suite\": \"$SUITE_NAME\",
  \"group\": \"$REPORT_GROUP\",
  \"ref_name\": \"$REF_NAME\",
  \"run_id\": \"$RUN_ID\",
  \"run_attempt\": \"$RUN_ATTEMPT\",
  \"event_name\": \"$EVENT_NAME\",
  \"report_title\": \"$REPORT_TITLE\",
  \"pr_number\": \"$PR_NUMBER\",
  \"sha\": \"$COMMIT_SHA\",
  \"path\": \"$S3_REPORT_PATH\"
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

# Check for results.xml and upload to S3 with timestamp
echo "Checking for results.xml in $RESULTS_PATH"
if [[ -f "$RESULTS_PATH/results.xml" ]]; then
  echo "Found results.xml, uploading to S3 with timestamp"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  RESULTS_XML_NAME="results_${TIMESTAMP}.xml"
  DESTINATION_PATH="$s3_reports_path/junit/queue/$RESULTS_XML_NAME"
  echo "Uploading $RESULTS_PATH/results.xml to $DESTINATION_PATH"
  aws s3 cp "$RESULTS_PATH/results.xml" "$DESTINATION_PATH"
  echo "Upload complete: $RESULTS_XML_NAME"
else
  echo "No results.xml found in $RESULTS_PATH"
fi

# Check for CTRF reports and upload to S3 with timestamp
echo "Checking for CTRF reports in $RESULTS_PATH"
CTRF_FILES=$(find "$RESULTS_PATH" -maxdepth 1 -name "ctrf-report-*.json" -print)
if [[ -n "$CTRF_FILES" ]]; then
  echo "Found CTRF reports, uploading to S3"
  while IFS= read -r ctrf_file; do
    if [[ -f "$ctrf_file" ]]; then
      CTRF_FILENAME=$(basename "$ctrf_file")
      DESTINATION_PATH="$s3_reports_path/ctrf/$CTRF_FILENAME"
      echo "Uploading $ctrf_file to $DESTINATION_PATH"
      aws s3 cp "$ctrf_file" "$DESTINATION_PATH"
      echo "Upload complete: $CTRF_FILENAME"
    fi
  done <<< "$CTRF_FILES"
else
  echo "No CTRF reports found in $RESULTS_PATH"
fi

#echo "Cleaning up: remove results dir $RESULTS_PATH"
#rm -rf "$RESULTS_PATH"

echo
echo "----------------------------------------"
