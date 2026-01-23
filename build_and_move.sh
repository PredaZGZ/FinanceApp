#!/bin/bash
set -e

# Definir directorios
APP_IMAGES_DIR="$HOME/AppImages"
mkdir -p "$APP_IMAGES_DIR"

# 1. Construir todo con Turbo
echo "Construyendo todo (Web, API, Desktop)..."
pnpm turbo build

# 2. Mover el binario
echo "Buscando AppImage..."

# Ruta ajustada basada en tu log exitoso:
# Buscamos dentro de la carpeta apps/tauri-desktop/...
APP_IMAGE_PATH=$(find apps/tauri-desktop/src-tauri/target/release/bundle/appimage -name "*.AppImage" -type f | head -n 1)

if [ -z "$APP_IMAGE_PATH" ]; then
    echo "Error: No se encontró el AppImage."
    echo "Verifica que apps/tauri-desktop/package.json tenga 'NO_STRIP=true' en el script de build."
    exit 1
fi

mv "$APP_IMAGE_PATH" "$APP_IMAGES_DIR/"
FILENAME=$(basename "$APP_IMAGE_PATH")

echo "Build Completado!"
echo "AppImage movido a: $APP_IMAGES_DIR/$FILENAME"