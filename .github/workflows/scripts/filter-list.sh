#!/usr/bin/env bash

touch $FILTERED_LIST_PATH

for PR in $(cat $PR_LIST_PATH); do
    PR_STATUS=$(gh pr view --repo woocommerce/woocommerce --json state --jq .state $PR)

    if [[ $PR_STATUS == 'CLOSED' || $PR_STATUS == 'MERGED' ]]; then
        echo $PR >>$FILTERED_LIST_PATH
    fi
done
