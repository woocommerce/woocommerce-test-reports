#!/usr/bin/env bash

set -eo pipefail

export ARTIFACT_NAME='core-e2e-tests'
export REPOSITORY='woocommerce/woocommerce'
export RUN_ID='9470404608'
export EVENT_NAME='daily-checks'
#export PR_NUMBER='20222'
export COMMIT_SHA='80f8sa'
export SUITE_NAME='Core e2e tests'
export REF_NAME='v9.0.0 beta/22'
export REPORT_TITLE='#Core e2e /=+!*tests'

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


if [[ "$EVENT_NAME" == "daily-checks" ]] || [[ "$EVENT_NAME" == "nightly-checks" ]]; then
    REPORT_GROUP=$(date +%Y%m%d)
    echo "Set REPORT_GROUP to $REPORT_GROUP"

    REPORT_NAME='latest'
    echo "Set REPORT_NAME to $REPORT_NAME"
fi

if [[ -z "$PR_NUMBER" ]]; then
   echo "PR_NUMBER is not defined"

   if [[ -z "$REF_NAME" ]]; then
     echo "::error:: PR_NUMBER or REF_NAME need to be defined"
     exit 1
   else
     echo "Setting REPORT_GROUP to $REF_NAME"
     REPORT_GROUP=$(echo "$REF_NAME" | tr ' /. ' '_')
   fi

   if [[ -z "$COMMIT_SHA" ]]; then
     echo "::error:: PR_NUMBER or COMMIT_SHA need to be defined"
     exit 1
   else
     echo "Setting REPORT_NAME to $COMMIT_SHA"
     REPORT_NAME=$COMMIT_SHA
   fi
 else
   echo "Setting REPORT_GROUP to $PR_NUMBER"
   REPORT_GROUP=$PR_NUMBER

   REPORT_NAME='latest'
   echo "Set REPORT_NAME to $REPORT_NAME"
 fi


SUITE_NAME=$(echo "$SUITE_NAME" | tr ' /. ' '_')

REPORT_ID="$EVENT_NAME-$REPORT_GROUP-$SUITE_NAME-$REPORT_NAME"
echo "Set REPORT_ID to $REPORT_ID"
echo "Set REPORT_TITLE to $REPORT_TITLE"
echo "REPORT_ID=$REPORT_ID" >> "$GITHUB_ENV"
echo "REPORT_GROUP=$REPORT_GROUP" >> "$GITHUB_ENV"
echo "REPORT_NAME=$REPORT_NAME" >> "$GITHUB_ENV"
echo "REPORT_TITLE=$REPORT_TITLE" >> "$GITHUB_ENV"



