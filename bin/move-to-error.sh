#!/usr/bin/env bash

set -eo pipefail

if [[ -z "$1" ]]; then
  echo "Error: File name required"
  echo "Usage: $0 <filename>"
  exit 1
fi

FILENAME="$1"
SOURCE="s3://a8c-woo-test-reports/reports/junit/processed/${FILENAME}"
DEST="s3://a8c-woo-test-reports/reports/junit/error/${FILENAME}"

echo "Moving ${FILENAME} from processed to error"
aws s3 mv "${SOURCE}" "${DEST}"
echo "Move complete"
