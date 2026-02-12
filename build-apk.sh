#!/bin/bash
# Build Tennis Umpire APK for sharing
set -e

cd "$(dirname "$0")"

# Load nvm so Gradle finds the right Node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1

export NODE_ENV=production

# Create builds directory
mkdir -p builds

# Timestamped filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
FILENAME="TennisUmpire_${TIMESTAMP}.apk"

echo "🎾 Building Tennis Umpire APK..."
echo "   Node: $(node -v) at $(which node)"
echo "   Output: builds/${FILENAME}"
echo ""

cd android
./gradlew assembleRelease --quiet

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  DEST="../builds/${FILENAME}"
  cp "$APK_PATH" "$DEST"
  echo ""
  echo "✅ Build complete! ($SIZE)"
  echo "📱 APK: builds/${FILENAME}"
  echo ""
  echo "Send it to your friend via WhatsApp/email!"
else
  echo "❌ Build failed — APK not found"
  exit 1
fi
