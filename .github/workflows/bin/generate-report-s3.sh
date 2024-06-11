#!/usr/bin/env bash

# This script generates a report from the Allure results in the RESULTS_PATH directory and uploads it to S3.
# Required:
# - RESULTS_PATH: Path to the test output directory
# - REPORTS_PATH: The local path where the reports will be generated. Multiple reports can be generated in this directory, e.g. 'reports/atomic', 'reports/jetpack-production'

set -eo pipefail

# Test Allure installation
allure --version

# Check that Allure results directory exists
if [[ -z "$RESULTS_PATH" ]]; then
  echo "::error::RESULTS_PATH must be set"
  exit 1
elif [[ ! -d "$RESULTS_PATH" ]]; then
  echo "::error::'RESULTS_PATH' does not exist or is not a directory"
  exit 1
fi

if [[ -z "$LOCAL_REPORTS_PATH" ]]; then
  echo "::error::'LOCAL_REPORTS_PATH' is not defined"
  exit 1
fi

SCRIPT_PATH=$(
  cd "$(dirname "${BASH_SOURCE[0]}")" || return
  pwd -P
)

echo
echo "----------------------------------------"

for d in "$RESULTS_PATH"/*; do
  echo "Checking for report metadata in $d"
  REPORT_ID=$(jq -r '.suite' "$d/report-metadata.json")
  echo "Found report id: $REPORT_ID"
  RESULTS_DIR="$LOCAL_REPORTS_PATH/$REPORT_ID/results"
  echo "Creating '$RESULTS_DIR' results dir if it doesn't already exist"
  mkdir -p "$RESULTS_DIR"
  echo "Copy results from '$d/allure-results' to '$RESULTS_DIR'"
  cp -R "$d/allure-results/." "$RESULTS_DIR" || true
  echo
done

s3_reports_path="s3://a8c-jetpack-e2e-reports/reports"
REPORTS_BASE_URL=$(jq -r '.reportDeepUrl' "$SCRIPT_PATH/../src/config.json")

echo "----------------------------------------"

for d in "$LOCAL_REPORTS_PATH"/*; do
  REPORT_ID=$(basename "$d")
  echo "Creating report '$REPORT_ID'"
  RESULTS_PATH="$d/results"
  REPORT_PATH="$d/report"

  echo "Getting history from existing report in S3"
  aws s3 cp --only-show-errors --recursive "$s3_reports_path/$REPORT_ID/report/history" "$RESULTS_PATH/history" || true

  echo "Creating executor.json"
  jq -n --arg url "$REPORTS_BASE_URL" \
    --arg reportUrl "$REPORTS_BASE_URL/$REPORT_ID/report" \
    --arg buildName "run #$RUN_ID" \
    '{"type":"github", "buildName":$buildName, "url":$url,"reportUrl":$reportUrl}' \
    >"$RESULTS_PATH/executor.json"
  cat "$RESULTS_PATH/executor.json"

  echo "Overwriting categories.json"
  cp "$SCRIPT_PATH/categories.json" "$RESULTS_PATH/categories.json"

  echo "Generating new report"
  allure generate --clean "$RESULTS_PATH" --output "$REPORT_PATH"

  echo "Updating report title"
  # shellcheck disable=SC2002
  cat "$REPORT_PATH/widgets/summary.json" | jq --arg name "Test results for '$REPORT_ID'" '.reportName|=$name' >"$REPORT_PATH/widgets/summary.tmp"
  mv "$REPORT_PATH/widgets/summary.tmp" "$REPORT_PATH/widgets/summary.json"
  cat "$REPORT_PATH/widgets/summary.json"

  echo "Cleaning up: remove results dir $RESULTS_PATH"
  rm -rf "$RESULTS_PATH"

  echo "Writing metadata to file"

  if [ "$CLIENT_PAYLOAD" == "" ]; then
    CLIENT_PAYLOAD={}
  fi

  echo "$CLIENT_PAYLOAD" | jq --arg updateDate "$(date +"%Y-%m-%dT%H:%M:%S%z")" '. + {"updated_on":$updateDate}' >"$d/metadata.json"
  cat "$d/metadata.json"

  echo "Minifying JSON files"
  while IFS= read -r -d '' file
  do
    jq -c . < "$file" > "$file.min" && mv "$file.min" "$file"
  done <   <(find "$REPORT_PATH" -name '*.json' -print0)

  echo "Copying report to S3"
  aws s3 cp "$d" "$s3_reports_path/$REPORT_ID" --recursive --only-show-errors

  echo
done

echo "----------------------------------------"
