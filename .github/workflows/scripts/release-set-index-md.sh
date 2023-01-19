#
# Create or recreate the index.md file in PR test reports. 
#
#!/usr/bin/env bash

INDEX_DIR="$GITHUB_WORKSPACE/repo/docs/release/$RELEASE_TAG/$ENV_DESCRIPTION/$TEST_TYPE"
INDEX_PATH="$INDEX_DIR/index.md"

# Clear the directory of the index.md file.
echo "Clearing \"$INDEX_DIR\"..."
rm -rf "$INDEX_DIR"
mkdir -p "$INDEX_DIR"

# Write the contents (which is a Jekyll front matter) of the index.md file.
echo "Writing contents to \"$INDEX_PATH\"..."
echo "---" >"$INDEX_PATH"
echo "layout: redirect" >>"$INDEX_PATH"
echo "redirect_to: $S3_WEB_ENDPOINT/$S3_PATH/$TEST_TYPE/index.html" >>"$INDEX_PATH"
echo "test_type: $TEST_TYPE" >>"$INDEX_PATH"
echo "release_tag: $RELEASE_TAG" >>"$INDEX_PATH"
echo "env_description: \"$ENV_DESCRIPTION\"" >>"$INDEX_PATH"
echo "created_at: \"$CREATED_AT\"" >>"$INDEX_PATH"
echo "---" >>"$INDEX_PATH"
echo "Done!"
echo "Contents of \"$INDEX_PATH\" is:"
cat "$INDEX_PATH"
