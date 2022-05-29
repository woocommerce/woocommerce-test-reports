#!/usr/bin/env bash

MAX_ATTEMPTS=3

cd "$GITHUB_WORKSPACE/repo"

git config user.name $GITHUB_USER
git config user.email $GITHUB_EMAIL
git add .
git commit -m "$BOT_COMMIT_MESSAGE" -m "Workflow run: https://github.com/woocommerce/woocommerce/actions/runs/$RUN_ID"

for ((i = 1; i <= $MAX_ATTEMPTS; i++)); do
    echo "Attempting to push changes (try #$i)..."
    git pull --rebase
    git push "https://$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY"
    EXIT_CODE=$(echo $?)

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Push successful!"
        break
    fi

    if [[ $i -lt $MAX_ATTEMPTS ]]; then
        echo "Retrying in 5 sec..."
        sleep 5
    fi
done
