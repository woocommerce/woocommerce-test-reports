#!/usr/bin/env bash

SCRIPT_PATH=$(
  cd "$(dirname "${BASH_SOURCE[0]}")" || return
  pwd -P
)

aws s3 sync s3://a8c-woo-test-reports/data "$SCRIPT_PATH/../dist/data" --delete
