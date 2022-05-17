#!/usr/bin/env bash

#
# Retrieves the commit message based on the given commit SHA,
# and then saves it as an environment variable for later use by succeeding steps
#

# Get the commit message using GitHub CLI
COMMIT_MESSAGE=$(gh pr view $PR_NUMBER \
    --repo $WOO_REPO \
    --json commits \
    --jq ".commits[] | select(.oid == \"$COMMIT_SHA\") | .messageHeadline")

# Display value of COMMIT_MESSAGE
echo "Retrieved value of COMMIT_MESSAGE: $COMMIT_MESSAGE"

# Save it as an environment variable
echo "COMMIT_MESSAGE=$COMMIT_MESSAGE" >>$GITHUB_ENV
