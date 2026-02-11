#!/bin/bash
# Build Tennis Umpire APK for sharing
set -e

cd "$(dirname "$0")"

# Load nvm so Gradle finds the right Node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1

export NODE_ENV=production

echo "🎾 Building Tennis Umpire APK..."
echo "   Node: $(node -v) at $(which node)"
echo ""

cd android
./gradlew assembleRelease --quiet

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  DEST="$HOME/Desktop/TennisUmpire.apk"
  cp "$APK_PATH" "$DEST"
  echo "✅ Build complete! ($SIZE)"
  echo "📱 APK copied to: $DEST"
  echo ""
  echo "Send it to your friend via WhatsApp/email!"
else
  echo "❌ Build failed — APK not found"
  exit 1
fi
