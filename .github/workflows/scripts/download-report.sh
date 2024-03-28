#!/usr/bin/env bash

#
# Script for downloading an artifact based on the given RUN_ID and ARTIFACT_NAME.
# Artifacts will be saved on the given DOWNLOAD_PATH.
# GitHub CLI is used to perform the download. Therefore, you'll need to set a GITHUB_TOKEN environment variable as mentioned in https://docs.github.com/en/actions/using-workflows/using-github-cli-in-workflows
# 
# To use this script, you should first set these environment variables:
# - RUN_ID
# - ARTIFACT_NAME
# - DOWNLOAD_PATH
# - GITHUB_TOKEN
#

# Attempt download this many times
MAX_ATTEMPTS=12

# Wait time between each download attempt
WAIT_TIME=10

EXIT_CODE=0

for ((i = 1; i <= $MAX_ATTEMPTS; i++)); do

    echo "Downloading \"$ARTIFACT_NAME\" to $DOWNLOAD_PATH (try #$i)..."
    gh run download "$RUN_ID" \
        --name "$ARTIFACT_NAME" \
        --dir "$DOWNLOAD_PATH" \
        --repo woocommerce/woocommerce

    EXIT_CODE=$(echo $?)

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Success! The following files were downloaded to $DOWNLOAD_PATH:"
        tree "$DOWNLOAD_PATH"
        break
    fi

    if [[ $i -lt $MAX_ATTEMPTS ]]; then
        echo "Download attempt FAILED. Retrying in $WAIT_TIME sec...\n\n"
        sleep $WAIT_TIME
    fi

done

exit $EXIT_CODE
