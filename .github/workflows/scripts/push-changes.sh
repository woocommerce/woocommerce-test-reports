#!/usr/bin/env bash

#
# Pushes the newly generated report to the repo.
#

BOTWOO_COMMIT_MESSAGE=""
EXIT_CODE=0
MAX_ATTEMPTS=10

set_commit_message() {

    case $TEST_WORKFLOW in
    "daily")
        BOTWOO_COMMIT_MESSAGE="Add test report - Daily smoke test"
        ;;
    "pr")
        BOTWOO_COMMIT_MESSAGE="Add test report - PR #$PR_NUMBER - $COMMIT_MESSAGE"
        ;;
    "release")
        BOTWOO_COMMIT_MESSAGE="Add test report - Release"
        ;;
    esac
}

push_to_repo() {
    cd $REPO_PATH
    git branch
    git config user.name $GH_USER
    git config user.email $GH_EMAIL
    git add .
    git commit -m "$BOTWOO_COMMIT_MESSAGE" -m "Workflow run: https://github.com/woocommerce/woocommerce/actions/runs/$RUN_ID"

    # Retry pushing changes up to 10 times when race conditions occur,
    # like when multiple workflows are trying to push to the repo at the same time.
    for ((i = 1; i <= $MAX_ATTEMPTS; i++)); do
        echo "Attempting to push changes (try #$i)..."
        git pull --rebase
        git push "https://$GH_TOKEN@github.com/$GITHUB_REPOSITORY"
        EXIT_CODE=$(echo $?)

        if [[ $EXIT_CODE -eq 0 ]]; then
            break
        fi

        if [[ $i -lt $MAX_ATTEMPTS ]]; then
            echo "Retrying in 5 sec..."
            sleep 5
        fi
    done
}

set_commit_message

push_to_repo

exit $EXIT_CODE
