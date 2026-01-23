# Tennis Umpire 🎾

A portable tennis scoring system with wireless clickers, audio announcements, and optional league integration.

## The Problem

Score disputes are common in amateur tennis. Players lose track mid-game, especially during long rallies or when tired. Existing solutions (like ScorePadel) don't work well for outdoor tennis courts due to sun glare, weatherproofing, and mounting challenges.

## The Solution

A simple, portable system where each player carries a small button clicker. Press it when you win a point, and the score is tracked automatically with audio announcements - like having your own personal umpire.

## Architecture

```
[Player A Clicker] ──┐
                     ├── Bluetooth ──► [Phone App] ──► [Speaker]
[Player B Clicker] ──┘                      │
                                            │ WiFi (optional)
                                            ▼
                                   [Tenis del Parque API]
```

## Features

- **Offline-first**: Works without internet, syncs when available
- **Audio announcements**: Hear the score after each point
- **Full tennis scoring**: Handles deuce, advantage, tiebreaks, sets
- **Undo support**: Fix mistakes easily
- **League integration**: Optional sync with Tenis del Parque for live scores

## Hardware

### Phase 1: Prototype
- 2x Flic buttons (~€55-60 total) - [flic.io](https://flic.io)
- Any Bluetooth speaker
- Phone/tablet running the app

### Phase 2: Custom (Future)
- Custom ESP32-C3 clickers (~€10 each)
- Branded enclosures
- Optional e-ink display

## Tech Stack

- **App**: React Native with react-native-ble-plx
- **Audio**: Native text-to-speech
- **Backend**: Optional API integration with Tenis del Parque

## Project Structure

```
tennis-umpire/
├── docs/
│   └── PROJECT_SPEC.md    # Full project specification
├── app/                    # React Native app (coming soon)
├── api/                    # Backend endpoints (coming soon)
└── README.md
```

## Development Phases

1. **Validate** - Test with Flic buttons + simple app
2. **Improve** - Build proper React Native app with BLE
3. **Integrate** - Connect to Tenis del Parque
4. **Scale** - Custom hardware, club installations

## Related Projects

- [Tenis del Parque](https://github.com/morhendos/tenis-del-parque) - Tennis league platform (potential integration)

## Status

🚧 **Planning phase** - Awaiting Flic button purchase for prototyping

---

*Created January 2025*
