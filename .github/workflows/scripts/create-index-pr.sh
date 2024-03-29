#!/usr/bin/env bash

# Configure git username and email
cd $GITHUB_WORKSPACE
git config user.name $GITHUB_USER
git config user.email $GITHUB_EMAIL

# Create index.md
mkdir -p $LOCAL_DIR
cd $LOCAL_DIR
LAST_PUBLISHED=$(date +'%Y-%m-%d %T %z')
PR_TITLE_ENCODED=$(gh pr view $PR_NUMBER --repo woocommerce/woocommerce --json title --jq '.title|@uri')
echo "---" > index.md
echo "layout: redirect" >> index.md
echo "redirect_to: $S3_WEB_DIR/index.html" >> index.md
echo "pr_number: $PR_NUMBER" >> index.md
echo "pr_title_encoded: \"$PR_TITLE_ENCODED\"" >> index.md
echo "pr_test_type: $TEST_TYPE" >> index.md
echo "last_published: \"$LAST_PUBLISHED\"" >> index.md
echo "---" >> index.md
echo "" >> index.md

# Commit changes to new branch
BRANCH="add/pr-$PR_NUMBER-$TEST_TYPE-run-$GITHUB_RUN_ID"
BOT_COMMIT_MESSAGE="Add: pr/$PR_NUMBER/$TEST_TYPE run-$GITHUB_RUN_ID"
cd $GITHUB_WORKSPACE
git checkout -b $BRANCH
git add .
git commit -m "$BOT_COMMIT_MESSAGE"

# Create PR and merge
git push --set-upstream origin $BRANCH
gh pr create --title "$BOT_COMMIT_MESSAGE" --body ""
gh pr merge --delete-branch --squash

# Echo exit code to GitHub action
exit_code=$(echo $?)
exit $exit_code