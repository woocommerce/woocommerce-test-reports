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

# Sanitize inputs - remove dangerous characters and limit length
SUITE_NAME=$(echo "$SUITE_NAME" | tr -cd '[:alnum:]._ -' | head -c 200)
REF_NAME=$(echo "$REF_NAME" | tr -cd '[:alnum:]._ -' | head -c 200)
REPORT_TITLE=$(echo "$REPORT_TITLE" | tr -cd '[:alnum:]._ -' | head -c 200)

# Validate RUN_ID is numeric
if ! [[ "$RUN_ID" =~ ^[0-9]+$ ]]; then
    echo "::error::RUN_ID must be numeric"
    exit 1
fi

# Use short commit sha and validate format
COMMIT_SHA=$(echo "$COMMIT_SHA" | cut -c 1-7)
if [[ -n "$COMMIT_SHA" ]] && ! [[ "$COMMIT_SHA" =~ ^[a-f0-9]{1,7}$ ]]; then
    echo "::error::COMMIT_SHA has invalid format"
    exit 1
fi

if [[ "$EVENT_NAME" == "daily-checks" ]] || [[ "$EVENT_NAME" == "daily-e2e" ]]; then
    EVENT_NAME="daily-checks"
    REPORT_GROUP="$(date +%Y%m%d)-$REF_NAME"
    REPORT_TITLE="Daily checks $(date +%Y-%m-%d)"
elif [[ "$EVENT_NAME" == "nightly-checks" ]]; then
    EVENT_NAME="daily-checks"
    REPORT_GROUP="$(date +%Y%m%d)-$REF_NAME"
    REPORT_TITLE="Nightly tag checks $(date +%Y-%m-%d)"
elif [[ "$EVENT_NAME" == "release-checks" ]] || [[ "$EVENT_NAME" == "release" ]]; then
    if [[ "$REF_NAME" == "nightly" ]]; then
        EVENT_NAME="daily-checks"
        REPORT_GROUP="$(date +%Y%m%d)-$REF_NAME"
        REPORT_TITLE="Nightly tag checks $(date +%Y-%m-%d)"
    else
        EVENT_NAME="release-checks"
        REPORT_GROUP="$REF_NAME"
        REPORT_TITLE="Release checks $REF_NAME"
    fi
elif [[ "$EVENT_NAME" == "pre-release" ]]; then
    EVENT_NAME="release-checks"
    REPORT_GROUP="$REF_NAME"
    REPORT_TITLE="Pre-release checks $REF_NAME"
elif [[ "$EVENT_NAME" == "push" ]] ; then
    REPORT_GROUP="$REF_NAME-$COMMIT_SHA"
    REPORT_GROUP=$(echo "$REPORT_GROUP" | tr ' /. ' '_')
elif [[ "$EVENT_NAME" == "pull_request" ]] || [[ "$EVENT_NAME" == "pr" ]]; then
    if [[ -z "$PR_NUMBER" ]]; then
        echo "::error:: PR_NUMBER is not defined"
        exit 1
    fi

    REPORT_GROUP=$PR_NUMBER
elif [[ "$EVENT_NAME" == "on-demand" ]] ; then
    EVENT_NAME="other"
    REPORT_TITLE="On demand $REF_NAME-$COMMIT_SHA"
    REPORT_GROUP=$(echo "$REPORT_TITLE" | tr ' /. ' '_')
else
  echo "Unknown event name: $EVENT_NAME"
  exit 1
fi

# If the event is a push to a release branch, we want to treat it as a release-checks event
if [[ "$EVENT_NAME" == "push" && "$REF_NAME" == release* ]]; then
    EVENT_NAME="release-checks"
fi

S3_REPORT_PATH="$EVENT_NAME/$REPORT_GROUP/$SUITE_NAME"
S3_REPORT_PATH=$(echo "$S3_REPORT_PATH" | tr ' ' '-')
S3_REPORT_PATH=$(echo "$S3_REPORT_PATH" | tr '[:upper:]' '[:lower:]')
REPORT_ID=$(echo "$S3_REPORT_PATH" | tr ' /. ' '-')
REPORT_ID=$(echo "$REPORT_ID" | tr '[:upper:]' '[:lower:]')

echo "Set EVENT_NAME to $EVENT_NAME"
echo "Set REPORT_ID to $REPORT_ID"
echo "Set REPORT_TITLE to $REPORT_TITLE"
echo "Set REPORT_GROUP to $REPORT_GROUP"
echo "Set S3_REPORT_PATH to $S3_REPORT_PATH"

echo "EVENT_NAME=$EVENT_NAME" >> "$GITHUB_ENV"
echo "REPORT_ID=$REPORT_ID" >> "$GITHUB_ENV"
echo "REPORT_GROUP=$REPORT_GROUP" >> "$GITHUB_ENV"
echo "REPORT_TITLE=$REPORT_TITLE" >> "$GITHUB_ENV"
echo "S3_REPORT_PATH=$S3_REPORT_PATH" >> "$GITHUB_ENV"
