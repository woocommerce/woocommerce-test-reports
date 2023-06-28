#
# Create or recreate the index.md file in PR test reports. 
#
#!/usr/bin/env bash

INDEX_DIR=$GITHUB_WORKSPACE/repo/docs/pr/$PR_NUMBER/$TEST_TYPE
INDEX_PATH=$INDEX_DIR/index.md
LAST_PUBLISHED=$(date +'%Y-%m-%d %T %z')
PR_TITLE_ENCODED=$(gh pr view $PR_NUMBER --repo woocommerce/woocommerce --json title --jq '.title|@uri')
BRANCH_NAME=$(
    gh pr view $PR_NUMBER --repo woocommerce/woocommerce --json headRefName --jq ".headRefName"
)

# Clear the directory of the index.md file.
echo "Clearing $INDEX_DIR..."
rm -rf $INDEX_DIR
mkdir -p $INDEX_DIR

# Write the contents (which is a Jekyll front matter) of the index.md file.
echo "Writing contents to $INDEX_PATH..."
echo "---" >$INDEX_PATH
echo "layout: redirect" >>$INDEX_PATH
echo "redirect_to: $S3_WEB_ENDPOINT/$S3_ROOT/pr/$PR_NUMBER/$TEST_TYPE/index.html" >>$INDEX_PATH
echo "pr_number: $PR_NUMBER" >>$INDEX_PATH
echo "pr_title_encoded: \"$PR_TITLE_ENCODED\"" >>$INDEX_PATH
echo "pr_test_type: $TEST_TYPE" >>$INDEX_PATH
echo "last_published: \"$LAST_PUBLISHED\"" >>$INDEX_PATH
echo "commit_sha: $COMMIT_SHA" >>$INDEX_PATH
echo "commit_message: \"$COMMIT_MESSAGE\"" >>$INDEX_PATH
echo "branch_name: $BRANCH_NAME" >>$INDEX_PATH
echo "passed: $PASSED" >>"$INDEX_PATH"
echo "---" >>$INDEX_PATH
echo "Done!"
