#!/bin/bash
# Install the latest Tennis Umpire APK to a connected Android device
set -e

cd "$(dirname "$0")"

ADB="$HOME/Library/Android/sdk/platform-tools/adb"

if [ ! -f "$ADB" ]; then
  echo "❌ adb not found at $ADB"
  exit 1
fi

# Find the latest APK in builds/
APK=$(ls -t builds/TennisUmpire_*.apk 2>/dev/null | head -1)

if [ -z "$APK" ]; then
  echo "❌ No APK found in builds/"
  echo "   Run ./build-apk.sh first"
  exit 1
fi

SIZE=$(du -h "$APK" | cut -f1)
echo "🎾 Tennis Umpire Installer"
echo "   APK: $APK ($SIZE)"
echo ""

# Check device
DEVICE=$("$ADB" devices | grep -w device | head -1 | cut -f1)
if [ -z "$DEVICE" ]; then
  echo "❌ No Android device found"
  echo ""
  echo "Make sure:"
  echo "  1. Phone is connected via USB"
  echo "  2. USB debugging is enabled"
  echo "  3. You've accepted the USB debugging prompt on the phone"
  exit 1
fi

MODEL=$("$ADB" -s "$DEVICE" shell getprop ro.product.model 2>/dev/null || echo "$DEVICE")
echo "📱 Device: $MODEL"
echo "⏳ Installing..."
echo ""

"$ADB" -s "$DEVICE" install -r "$APK"

echo ""
echo "✅ Installed! Look for Tennis Umpire on your phone."
