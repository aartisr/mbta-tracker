#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release/widget"
MANIFEST_PATH="$RELEASE_DIR/manifest.json"

require_env() {
  var_name="$1"
  eval "value=\${$var_name-}"
  if [ -z "$value" ]; then
    echo "Error: missing required env var $var_name"
    exit 1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' is not installed"
    exit 1
  fi
}

json_value() {
  key="$1"
  sed -n "s/.*\"$key\": \"\([^\"]*\)\".*/\1/p" "$MANIFEST_PATH" | head -n 1
}

require_cmd npm
require_cmd aws

require_env WIDGET_BUCKET
require_env WIDGET_CDN_BASE_URL

WIDGET_PREFIX="${WIDGET_PREFIX:-mbta-tracker}"
WIDGET_ENDPOINT_URL="${WIDGET_ENDPOINT_URL:-}"

echo "Packaging widget release artifacts..."
cd "$ROOT_DIR"
npm run release:widget

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Error: manifest not found at $MANIFEST_PATH"
  exit 1
fi

LATEST_FILE="$(json_value latest)"
VERSIONED_FILE="$(json_value versioned)"

if [ -z "$LATEST_FILE" ] || [ -z "$VERSIONED_FILE" ]; then
  echo "Error: failed to parse manifest fields"
  exit 1
fi

for artifact in "$LATEST_FILE" "$VERSIONED_FILE" "manifest.json"; do
  if [ ! -f "$RELEASE_DIR/$artifact" ]; then
    echo "Error: expected artifact missing: $RELEASE_DIR/$artifact"
    exit 1
  fi
done

S3_BASE="s3://$WIDGET_BUCKET/$WIDGET_PREFIX"
AWS_ARGS=""
if [ -n "$WIDGET_ENDPOINT_URL" ]; then
  AWS_ARGS="--endpoint-url $WIDGET_ENDPOINT_URL"
fi

echo "Uploading widget artifacts to $S3_BASE"
# Versioned artifact: long-lived immutable cache
if [ -n "$AWS_ARGS" ]; then
  aws s3 cp "$RELEASE_DIR/$VERSIONED_FILE" "$S3_BASE/$VERSIONED_FILE" $AWS_ARGS --cache-control "public,max-age=31536000,immutable" --content-type "application/javascript"
  aws s3 cp "$RELEASE_DIR/$LATEST_FILE" "$S3_BASE/$LATEST_FILE" $AWS_ARGS --cache-control "public,max-age=300" --content-type "application/javascript"
  aws s3 cp "$MANIFEST_PATH" "$S3_BASE/manifest.json" $AWS_ARGS --cache-control "public,max-age=60" --content-type "application/json"
else
  aws s3 cp "$RELEASE_DIR/$VERSIONED_FILE" "$S3_BASE/$VERSIONED_FILE" --cache-control "public,max-age=31536000,immutable" --content-type "application/javascript"
  aws s3 cp "$RELEASE_DIR/$LATEST_FILE" "$S3_BASE/$LATEST_FILE" --cache-control "public,max-age=300" --content-type "application/javascript"
  aws s3 cp "$MANIFEST_PATH" "$S3_BASE/manifest.json" --cache-control "public,max-age=60" --content-type "application/json"
fi

BASE_URL="${WIDGET_CDN_BASE_URL%/}"
PUBLIC_PREFIX="$BASE_URL/$WIDGET_PREFIX"

echo "Deploy complete"
echo "Public URLs:"
echo "- $PUBLIC_PREFIX/$LATEST_FILE"
echo "- $PUBLIC_PREFIX/$VERSIONED_FILE"
echo "- $PUBLIC_PREFIX/manifest.json"
echo
echo "Ready-to-paste embed snippets:"
sh "$ROOT_DIR/scripts/widget-embed-snippet.sh"
