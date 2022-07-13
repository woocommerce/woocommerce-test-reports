#!/usr/bin/env bash

MAX_ATTEMPTS=10
EXIT_CODE=0
WAIT_TIME=10

for ((i = 1; i <= $MAX_ATTEMPTS; i++)); do

    echo "Downloading $ARTIFACT_NAME to $DOWNLOAD_PATH (try #$i)..."
    gh run download $RUN_ID \
        --name $ARTIFACT_NAME \
        --dir $DOWNLOAD_PATH \
        --repo woocommerce/woocommerce

    EXIT_CODE=$(echo $?)

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Success! The following files were downloaded to $DOWNLOAD_PATH:"
        tree $DOWNLOAD_PATH
        break
    fi

    if [[ $i -lt $MAX_ATTEMPTS ]]; then
        echo "Retrying in $WAIT_TIME sec...\n\n"
        sleep $WAIT_TIME
    fi

done

exit $EXIT_CODE
