#!/usr/bin/env bash

#
# This script adds the new test results to this repo.
# This will create history trend if previous reports exist.
#

# Root directory of all reports (files in allure-report folder).
REPORT_ROOT="$REPO_PATH/docs"

# Root directory of all data files (files in the allure-results folder).
DATA_ROOT="$REPO_PATH/data"

# Folder in the repo where the new report (containing history trend) will be generated.
REPORT_PATH=""

# Folder that contains all previous data.
# Contents of newly downloaded "allure-results" folder will be placed here.
DATA_PATH=""

# Set the report and data paths
set_paths() {

    if [[ $TEST_WORKFLOW == "pr" ]]; then
        REPORT_PATH="$REPORT_ROOT/$TEST_WORKFLOW/$PR_NUMBER/$TEST_TYPE"
        DATA_PATH="$DATA_ROOT/$TEST_WORKFLOW/$PR_NUMBER/$TEST_TYPE"
    else
        REPORT_PATH="$REPORT_ROOT/$TEST_WORKFLOW/$TEST_TYPE"
        DATA_PATH="$DATA_ROOT/$TEST_WORKFLOW/$TEST_TYPE"
    fi
}

# Provides an appropriate title, instead of the default "Allure Report".
set_report_title() {

    REPORT_TITLE=""

    case $TEST_TYPE in
    "e2e")
        REPORT_TITLE="WooCommerce E2E Test Report"
        ;;
    "api")
        REPORT_TITLE="WooCommerce REST API Test Report"
        ;;
    esac

    case $TEST_WORKFLOW in
    "daily")
        REPORT_TITLE="$REPORT_TITLE - Daily smoke test"
        ;;
    "pr")
        REPORT_TITLE="$REPORT_TITLE - PR #$PR_NUMBER - $COMMIT_MESSAGE"
        ;;
    "release")
        REPORT_TITLE="$REPORT_TITLE - Release"
        ;;
    esac

    # HTML Title
    node $REPO_PATH/.github/workflows/scripts/replace-string-in-file.js \
        "$REPORT_PATH/index.html" \
        "<title>Allure Report</title>" \
        "<title>$REPORT_TITLE</title>"

    # Overview page header
    node $REPO_PATH/.github/workflows/scripts/replace-string-in-file.js \
        "$REPORT_PATH/widgets/summary.json" \
        "Allure Report" \
        "$REPORT_TITLE"
}

combine_new_report_with_existing() {
    if [[ -f "$REPORT_PATH/index.html" ]]; then

        # The test has previous report.
        # Combine it with newly downloaded one to create history trend.
        mkdir -p $DATA_PATH/history
        cp -r $REPORT_PATH/history/* $DATA_PATH/history
        cp -r $DOWNLOAD_PATH/allure-results/* $DATA_PATH

    else

        # Create the first report.
        mkdir -p $REPORT_PATH
        mkdir -p $DATA_PATH
        cp -r $DOWNLOAD_PATH/allure-results/* $DATA_PATH

    fi
}

# Add front matter to index.html.
# Otherwise, Jekyll will not recognize it as a page, but rather as a static asset only.
# A consequence is that if it's a test report from a PR, it will not show up on the "Pull requests" section in the homepage.
set_jekyll_front_matter() {

    if [[ $TEST_WORKFLOW == "pr" ]]; then

        # Set page variables specific to PR reports.

        # Get the URL-encoded PR title.
        # URL encoding ensures special characters in PR titles will not cause any trouble when processed by Jekyll.
        PR_TITLE_ENCODED=$(gh pr view $PR_NUMBER --repo $WOO_REPO --json title --jq '.title|@uri')

        # Variable to be used as basis for sorting the "Pull requests" list in homepage.
        LAST_PUBLISHED=$(date +'%Y-%m-%d %T %z')

        # Add front matter to index.html.
        sed -i "1s/^/---\npr_number: $PR_NUMBER\npr_title_encoded: \"$PR_TITLE_ENCODED\"\npr_test_type: $TEST_TYPE\nlast_published: \"$LAST_PUBLISHED\"\n---\n/" "$REPORT_PATH/index.html"

    else

        # Just set an empty front matter for now.
        sed -i "1s/^/---\n---\n/" "$REPORT_PATH/index.html"
    fi

}

set_paths

combine_new_report_with_existing

# Regenerate the report.
allure generate --clean $DATA_PATH --output $REPORT_PATH

set_jekyll_front_matter

set_report_title
