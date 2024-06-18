#!/usr/bin/env bash

set -eo pipefail

if [[ -z "$ARTIFACT_NAME" ]]; then
     echo "::error:: missing ARTIFACT_NAME environment variable"
     exit 1
fi

if [[ -z "$EVENT_NAME" ]]; then
     echo "::error:: missing EVENT_NAME environment variable"
     exit 1
fi

if [[ -z "$REPOSITORY" ]]; then
     echo "::error:: missing REPOSITORY environment variable"
     exit 1
fi

if [[ -z "$RUN_ID" ]]; then
     echo "::error:: missing RUN_ID environment variable"
     exit 1
fi

if [[ -z "$SUITE_NAME" ]]; then
     echo "::error:: missing SUITE_NAME environment variable"
     exit 1
fi

# Sanitize the input
for var in SUITE_NAME REF_NAME REPORT_TITLE; do
    val="${!var}"
    val=$(echo "$val" | tr -cd '[:alnum:] ')
    declare "$var=$val"
done

# Use short commit sha
COMMIT_SHA=$(echo "$COMMIT_SHA" | cut -c 1-7)

if [[ "$EVENT_NAME" == "daily-checks" ]] || [[ "$EVENT_NAME" == "daily-e2e" ]] || [[ "$EVENT_NAME" == "nightly-checks" ]]; then
    REPORT_GROUP="$(date +%Y%m%d)-$REF_NAME"
    REPORT_TITLE="Daily checks $(date +%Y-%m-%d)"
    REPORT_ID=$(echo "$SUITE_NAME" | tr ' /. ' '-')

elif [[ "$EVENT_NAME" == "push" ]] ; then
    REPORT_GROUP="$REF_NAME-$COMMIT_SHA"
    REPORT_GROUP=$(echo "$REPORT_GROUP" | tr ' /. ' '_')
elif [[ "$EVENT_NAME" == "pull_request" ]] || [[ "$EVENT_NAME" == "pr" ]]; then
    if [[ -z "$PR_NUMBER" ]]; then
        echo "::error:: PR_NUMBER is not defined"
        exit 1
    fi

    REPORT_GROUP=$PR_NUMBER
    REPORT_ID="$REPORT_GROUP-$SUITE_NAME"
else
  echo "Unknown event name: $EVENT_NAME"
fi

S3_REPORT_PATH="$EVENT_NAME/$REPORT_GROUP/$SUITE_NAME"
S3_REPORT_PATH=$(echo "$S3_REPORT_PATH" | tr ' ' '-')
S3_REPORT_PATH=$(echo "$S3_REPORT_PATH" | tr '[:upper:]' '[:lower:]')
REPORT_ID=$(echo "$S3_REPORT_PATH" | tr ' /. ' '-')
REPORT_ID=$(echo "$REPORT_ID" | tr '[:upper:]' '[:lower:]')

echo "Set REPORT_ID to $REPORT_ID"
echo "Set REPORT_TITLE to $REPORT_TITLE"
echo "Set REPORT_GROUP to $REPORT_GROUP"
echo "Set S3_REPORT_PATH to $S3_REPORT_PATH"

echo "REPORT_ID=$REPORT_ID" >> "$GITHUB_ENV"
echo "REPORT_GROUP=$REPORT_GROUP" >> "$GITHUB_ENV"
echo "REPORT_TITLE=$REPORT_TITLE" >> "$GITHUB_ENV"
echo "S3_REPORT_PATH=$S3_REPORT_PATH" >> "$GITHUB_ENV"



