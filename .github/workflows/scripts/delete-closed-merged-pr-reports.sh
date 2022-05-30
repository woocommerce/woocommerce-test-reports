#!/usr/bin/env bash

for PR in $(cat $FILTERED_LIST_PATH); do
    rm -rf $GITHUB_WORKSPACE/repo/data/pr/$PR
    rm -rf $GITHUB_WORKSPACE/repo/docs/pr/$PR
done
