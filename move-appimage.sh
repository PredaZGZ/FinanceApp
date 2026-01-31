#!/bin/bash

# Configuration
# Change this path to your desired output directory
OUTPUT_DIR="${HOME}/AppImages/"

# Ensure output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Creating output directory: $OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"
fi

# Find the AppImage file
# We look for the most recently modified AppImage to be safe.
APPIMAGE=$(find apps/electron-desktop/dist -name "*.AppImage" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$APPIMAGE" ]; then
  echo "Error: No .AppImage file found in apps/electron-desktop/dist"
  exit 1
fi

echo "Found AppImage: $APPIMAGE"
echo "Moving to: $OUTPUT_DIR"

# Move the file
mv "$APPIMAGE" "$OUTPUT_DIR/"

if [ $? -eq 0 ]; then
  echo "Successfully moved AppImage to $OUTPUT_DIR"
else
  echo "Failed to move AppImage."
  exit 1
fi
