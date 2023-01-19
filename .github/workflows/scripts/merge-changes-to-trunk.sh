#!/usr/bin/env bash

BRANCH_NAME="add/release-$RELEASE_TAG-${ENV_DESCRIPTION/' '/'-'}"

cd "$GITHUB_WORKSPACE/repo"

# Configure name and email
git config user.name $GITHUB_USER
git config user.email $GITHUB_EMAIL

# Create new branch.
git checkout -b $BRANCH_NAME

# Commit & push changes
git add .
git commit -m "$BOT_COMMIT_MESSAGE" -m "Workflow run: https://github.com/woocommerce/woocommerce/actions/runs/$RUN_ID"
git push --set-upstream origin $BRANCH_NAME

# Create PR and merge
gh pr create --title "$BOT_COMMIT_MESSAGE"
gh pr merge --delete-branch --squash
