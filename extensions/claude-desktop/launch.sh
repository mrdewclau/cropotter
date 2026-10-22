#!/bin/sh
set -eu
if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "CropOtter: choose a label workspace folder in extension settings." >&2
  exit 1
fi
BUNDLE_DIR=$(CDPATH= cd -- "${0%/*}/.." && pwd -P)
OS_VERSION=$(/usr/bin/sw_vers -productVersion)
OS_MAJOR=${OS_VERSION%%.*}
OS_REST=${OS_VERSION#*.}
OS_MINOR=${OS_REST%%.*}
if [ "$OS_MAJOR" -lt 13 ] || { [ "$OS_MAJOR" -eq 13 ] && [ "$OS_MINOR" -lt 5 ]; }; then
  echo "CropOtter: this bundle requires macOS 13.5 or newer." >&2
  exit 1
fi
case "$1" in
  /*) ;;
  *) echo "CropOtter: the workspace must be an absolute local folder." >&2; exit 1 ;;
esac
case "$(/usr/bin/uname -m)" in
  arm64) RUNTIME="darwin-arm64" ;;
  x86_64) RUNTIME="darwin-x64" ;;
  *) echo "CropOtter: this bundle supports Apple Silicon and Intel Macs." >&2; exit 1 ;;
esac
# Use the bundled, checksum-verified runtime rather than an inherited Node setup.
unset NODE_OPTIONS NODE_PATH ELECTRON_RUN_AS_NODE
exec "$BUNDLE_DIR/runtime/$RUNTIME/node" "$BUNDLE_DIR/node_modules/cropotter-local/dist/mcp.mjs" --workspace "$1"
