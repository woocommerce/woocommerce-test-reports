#!/usr/bin/env bash

SCRIPT_PATH=$(
  cd "$(dirname "${BASH_SOURCE[0]}")" || return
  pwd -P
)

aws s3 sync "$SCRIPT_PATH/../build" s3://a8c-woo-test-reports/dashboard --delete
