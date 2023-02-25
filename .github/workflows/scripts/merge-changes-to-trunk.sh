#!/usr/bin/env bash

cd "$GITHUB_WORKSPACE/repo"

# Configure name and email
git config user.name $GITHUB_USER
git config user.email $GITHUB_EMAIL

# Create new branch.
git checkout -b $BRANCH_NAME

# Commit changes
git add .
commit_result=$(git commit -m "$BOT_COMMIT_MESSAGE" -m "Workflow run: https://github.com/woocommerce/woocommerce/actions/runs/$RUN_ID")
commit_exit_code=$(echo $?)
echo $commit_result

# Gracefully exit when there's nothing to commit
if [[ $commit_result == *"nothing to commit"* && $commit_exit_code != 0 ]]
    then exit 0;
fi

# If there are changes, create PR and merge
git push --set-upstream origin $BRANCH_NAME
gh pr create --title "$BOT_COMMIT_MESSAGE" --body ""
gh pr merge --delete-branch --squash
