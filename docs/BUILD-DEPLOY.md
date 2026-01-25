# Build & Deploy Guide

How to build the Tennis Umpire app for Android and iOS distribution.

## Prerequisites

- Node.js 18+
- Expo account (free at [expo.dev](https://expo.dev))
- EAS CLI installed: `npm install -g eas-cli`

## Quick Build Commands

```bash
# Android APK (for sharing/testing)
eas build -p android --profile preview

# Android AAB (for Play Store)
eas build -p android --profile production

# iOS (requires Apple Developer account)
eas build -p ios --profile production
```

---

## Android Build

### Option 1: APK for Direct Install (Recommended for Testing)

APK files can be shared directly and installed on any Android device.

```bash
# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

**After build completes (~10-15 min):**
1. Download the APK from the link provided
2. Send to friends via email, WhatsApp, Google Drive, etc.
3. They install it (may need to enable "Install from unknown sources")

### Option 2: AAB for Play Store

```bash
eas build -p android --profile production
```

Then upload the `.aab` file to Google Play Console.

---

## iOS Build

Requires an Apple Developer account ($99/year).

### For TestFlight (Testing)

```bash
eas build -p ios --profile preview
```

Then upload to App Store Connect for TestFlight distribution.

### For App Store

```bash
eas build -p ios --profile production
```

---

## EAS Configuration

The project includes `eas.json` with build profiles:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## App Configuration

Key settings in `app.json`:

```json
{
  "expo": {
    "name": "Tennis Umpire",
    "slug": "tennis-umpire",
    "version": "1.0.0",
    "orientation": "default",
    "ios": {
      "bundleIdentifier": "com.yourname.tennisumpire"
    },
    "android": {
      "package": "com.yourname.tennisumpire",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundColor": "#050a08"
      }
    }
  }
}
```

---

## Development Builds

For testing on physical devices with hot reload:

```bash
# Create development build
eas build -p android --profile development

# Or for iOS
eas build -p ios --profile development
```

Then install and connect via Expo Go or the dev client.

---

## Local Development

```bash
# Start Metro bundler
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator
npx expo start --ios

# Run on device via Expo Go
# Scan QR code with Expo Go app
```

---

## Environment Setup

### API Keys

For development, create `.env`:

```bash
EXPO_PUBLIC_GOOGLE_TTS_API_KEY=your_key_here
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_key_here
```

For production, users enter API keys in the app settings.

### App Icons

Replace icon files in `/assets/images/`:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024x1024 | iOS app icon |
| `android-icon-foreground.png` | 1024x1024 | Android adaptive icon |
| `android-icon-background.png` | 1024x1024 | Android adaptive background |
| `splash-icon.png` | 1024x1024 | Splash screen icon |
| `favicon.png` | 48x48 | Web favicon |

---

## Troubleshooting

### Build Fails

```bash
# Clear caches and rebuild
eas build -p android --profile preview --clear-cache
```

### "EAS CLI not found"

```bash
npm install -g eas-cli
eas login
```

### Android Install Blocked

On Android, enable "Install from unknown sources":
- Settings → Security → Unknown sources
- Or when prompted, tap "Settings" and enable

### iOS "Untrusted Developer"

On iOS, trust the developer profile:
- Settings → General → VPN & Device Management
- Tap the developer profile and trust it

---

## Version Updates

Before building a new version:

1. Update version in `app.json`:
   ```json
   "version": "1.1.0"
   ```

2. For Android, also increment `versionCode`:
   ```json
   "android": {
     "versionCode": 2
   }
   ```

3. Build and distribute as usual.
