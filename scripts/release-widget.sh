#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
DIST_DIR="$WEB_DIR/dist-widget"
RELEASE_DIR="$ROOT_DIR/release/widget"
MANIFEST_PATH="$RELEASE_DIR/manifest.json"
SOURCE_JS="$DIST_DIR/mbta-tracker-widget.js"

echo "Building widget bundle..."
cd "$ROOT_DIR"
npm --workspace apps/web run build:widget

if [ ! -f "$SOURCE_JS" ]; then
  echo "Error: expected widget bundle at $SOURCE_JS"
  exit 1
fi

mkdir -p "$RELEASE_DIR"

HASH="$(shasum -a 256 "$SOURCE_JS" | awk '{print $1}')"
SHORT_HASH="$(printf '%s' "$HASH" | cut -c1-12)"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
VERSIONED_NAME="mbta-tracker-widget.$SHORT_HASH.js"

cp "$SOURCE_JS" "$RELEASE_DIR/$VERSIONED_NAME"
cp "$SOURCE_JS" "$RELEASE_DIR/mbta-tracker-widget.latest.js"

cat > "$MANIFEST_PATH" <<EOF
{
  "generatedAt": "$STAMP",
  "algorithm": "sha256",
  "hash": "$HASH",
  "latest": "mbta-tracker-widget.latest.js",
  "versioned": "$VERSIONED_NAME"
}
EOF

echo "Widget release artifacts written:"
echo "- $RELEASE_DIR/mbta-tracker-widget.latest.js"
echo "- $RELEASE_DIR/$VERSIONED_NAME"
echo "- $MANIFEST_PATH"
