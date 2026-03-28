#!/usr/bin/env bash
set -e

PUBLISHER="felipezarco"
NAME="monokai-deuteranopia-colorblind"
VERSION="3.0.0"
REPO="felipezarco/monokai-deuteranopia-colorblind"
VSIX_FILE="${NAME}-${VERSION}.vsix"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${VSIX_FILE}"
DEST_DIR="${HOME}/.cursor/extensions/${PUBLISHER}.${NAME}-${VERSION}"

echo "Installing ${NAME} v${VERSION} for Cursor..."

# Download VSIX if not present locally
if [ ! -f "${VSIX_FILE}" ]; then
  echo "Downloading ${VSIX_FILE}..."
  curl -fsSL -o "${VSIX_FILE}" "${DOWNLOAD_URL}"
fi

# Remove previous installation if exists
if [ -d "${DEST_DIR}" ]; then
  echo "Removing previous installation..."
  rm -rf "${DEST_DIR}"
fi

mkdir -p "${DEST_DIR}"

# Extract the extension/ folder from the VSIX (which is a ZIP)
unzip -q "${VSIX_FILE}" "extension/*" -d "${DEST_DIR}_tmp"
mv "${DEST_DIR}_tmp/extension/"* "${DEST_DIR}/"
rm -rf "${DEST_DIR}_tmp"

echo ""
echo "Done! Theme installed at:"
echo "  ${DEST_DIR}"
echo ""
echo "Restart Cursor and select 'Monokai Deuteranopia Colorblind' via:"
echo "  Ctrl+K Ctrl+T  (or Cmd+K Cmd+T on Mac)"
