# Tennis Umpire 🎾

A professional tennis umpire app with AI-powered voice announcements. Built with React Native / Expo.

## Features

- **Professional Voice Announcements** - Google Cloud TTS, ElevenLabs, or Native TTS
- **SSML Styling** - Dramatic announcements for match points, calm for changeovers
- **Full Match Scoring** - Standard tennis scoring with tiebreaks
- **Coin Flip** - Animated coin toss for serve selection
- **Multi-language** - English, Spanish, French, Italian
- **Offline Support** - Works without internet (with Native TTS)

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npx expo start
```

## Documentation

| Doc | Description |
|-----|-------------|
| [Voice Setup](docs/VOICE-SETUP.md) | Configure Google Cloud, ElevenLabs, or Native TTS |
| [SSML Styling](docs/SSML-STYLING.md) | How voice announcements are styled |
| [Build & Deploy](docs/BUILD-DEPLOY.md) | Create APK/IPA for distribution |
| [Architecture](docs/ARCHITECTURE.md) | Codebase structure and key files |
| [Refactoring Plan](docs/REFACTORING_PLAN.md) | Codebase improvement roadmap |

## Tech Stack

- **Framework**: React Native with Expo (SDK 52)
- **Router**: Expo Router (file-based)
- **State**: Zustand with AsyncStorage persistence
- **Audio**: Expo AV + Expo Speech
- **Styling**: StyleSheet (Wimbledon-inspired dark theme)

## Voice Engines Comparison

| Engine | Quality | Cost | Offline |
|--------|---------|------|---------|
| Google Cloud TTS | ⭐⭐⭐⭐⭐ | ~€0.08/match (1M free/mo) | ❌ |
| ElevenLabs | ⭐⭐⭐⭐⭐ | ~€0.80/match | ❌ |
| Native TTS | ⭐⭐⭐ | Free | ✅ |

## Project Structure

```
tennis-umpire/
├── app/                 # Screens (Expo Router - file-based routing)
│   ├── (tabs)/          # Tab screens
│   │   └── index.tsx    # Main scoreboard
│   └── settings.tsx     # Settings screen
├── components/          # Reusable UI components
├── constants/           # App constants (colors, config)
├── lib/                 # Core business logic
│   ├── speech.ts        # TTS engine + SSML
│   ├── scoring.ts       # Tennis scoring rules
│   ├── voiceStore.ts    # Voice settings (Zustand)
│   ├── useMatch.ts      # Match state hook
│   └── translations.ts  # i18n strings
├── assets/              # Images, fonts
├── docs/                # Documentation
├── app.json             # Expo config
└── package.json
```

## License

MIT
