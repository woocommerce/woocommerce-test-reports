#!/usr/bin/env bash

COMMENT_BODY=""
COMMENT_ID=""

set_comment_body() {
    COMMENT_BODY=$(cat templates/COMMENT_TEMPLATE.md)
    COMMENT_BODY=${COMMENT_BODY//COMMIT_SHA/$COMMIT_SHA}
    COMMENT_BODY=${COMMENT_BODY//COMMIT_MESSAGE/$COMMIT_MESSAGE}
    COMMENT_BODY=${COMMENT_BODY//PR_NUMBER/$PR_NUMBER}

    echo "Comment to be posted on pull request #$PR_NUMBER:"
    echo "$COMMENT_BODY"
}

get_comment_id() {

    # This command will look for existing PR comments by botwoo, and whose body contains:
    # "Test reports for ... have been published"
    # And will return an array of comment id's.
    # The first id in the array will be saved as COMMENT_ID.
    COMMENT_ID=$(gh api repos/$WOO_REPO/issues/$PR_NUMBER/comments \
        --jq "[.[] | select((.user.login == \"$REPORTS_USER\") and (.body | test(\".*Test reports for .* have been published\"))) | .id][0]")
}

add_comment() {
    gh pr comment $PR_NUMBER --repo=$WOO_REPO --body "$COMMENT_BODY"
}

update_comment() {
    gh api -X PATCH repos/$WOO_REPO/issues/comments/$COMMENT_ID -f body="$COMMENT_BODY"
}

set_comment_body

get_comment_id

if [[ -z "$COMMENT_ID" ]]; then
    add_comment
else
    update_comment
fi
