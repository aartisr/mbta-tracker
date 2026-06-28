#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/release/widget/manifest.json"

require_env() {
  var_name="$1"
  eval "value=\${$var_name-}"
  if [ -z "$value" ]; then
    echo "Error: missing required env var $var_name"
    exit 1
  fi
}

json_value() {
  key="$1"
  sed -n "s/.*\"$key\": \"\([^\"]*\)\".*/\1/p" "$MANIFEST_PATH" | head -n 1
}

require_env WIDGET_CDN_BASE_URL

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Error: manifest not found at $MANIFEST_PATH"
  echo "Run: npm run release:widget"
  exit 1
fi

WIDGET_PREFIX="${WIDGET_PREFIX:-mbta-tracker}"
WIDGET_WS_URL="${WIDGET_WS_URL:-}"
WIDGET_TITLE="${WIDGET_TITLE:-MBTA Live}"

LATEST_FILE="$(json_value latest)"
VERSIONED_FILE="$(json_value versioned)"

if [ -z "$LATEST_FILE" ] || [ -z "$VERSIONED_FILE" ]; then
  echo "Error: failed to parse manifest fields"
  exit 1
fi

BASE_URL="${WIDGET_CDN_BASE_URL%/}"
PREFIX="${WIDGET_PREFIX#/}"

LATEST_URL="$BASE_URL/$PREFIX/$LATEST_FILE"
VERSIONED_URL="$BASE_URL/$PREFIX/$VERSIONED_FILE"

WS_ATTR=""
if [ -n "$WIDGET_WS_URL" ]; then
  WS_ATTR=" data-ws-url=\"$WIDGET_WS_URL\""
fi

echo "Embed URLs:"
echo "- latest: $LATEST_URL"
echo "- pinned: $VERSIONED_URL"
echo
echo "Script Tag (latest):"
echo "<script src=\"$LATEST_URL\"$WS_ATTR data-title=\"$WIDGET_TITLE\"></script>"
echo
echo "Script Tag (pinned):"
echo "<script src=\"$VERSIONED_URL\"$WS_ATTR data-title=\"$WIDGET_TITLE\"></script>"
