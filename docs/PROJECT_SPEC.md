# Tennis Scoreboard Project

A physical scoreboard system for amateur tennis matches, eliminating score disputes and enabling live score tracking integration with Tenis del Parque.

## Problem Statement

Score disputes are common in amateur tennis. Players lose track mid-game, especially during long rallies or when tired. A simple, objective score tracker would:

- Eliminate disagreements about the current score
- Allow spectators to follow matches
- Enable live score integration with the league platform
- Provide point-by-point data for player analytics

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    COURTSIDE                            │
│                                                         │
│   [Player A Clicker] ───┐                              │
│      (in pocket)        │     Bluetooth BLE            │
│                         ├────────────►  [Tablet/Phone] │
│   [Player B Clicker] ───┘               running        │
│      (in pocket)                        scoring app    │
│                                              │         │
└──────────────────────────────────────────────┼─────────┘
                                               │ WiFi (optional)
                                               ▼
                                      [Tenis del Parque API]
                                      (live scores on match pages)
```

## Hardware Options

### Option 1: Flic Buttons (Recommended for Prototype)

**What:** Commercial BLE smart buttons from Swedish company Shortcut Labs.

**Specs:**
- Bluetooth Low Energy connection
- 3 triggers per button: push, double-push, hold
- Battery life: up to 24 months (CR2032)
- Size: Small enough for pocket
- Free SDK available for custom apps

**Where to Buy:**
- Direct: [flic.io/shop](https://flic.io/shop)
- EU shipping: ~7 business days
- Pricing: Single button ~€29, Three-pack ~€80

**For prototype:** Buy 2 buttons (~€55-60 total)

### Option 2: Custom ESP32-C3 Clickers (Future)

**Components per clicker:**
- Seeed XIAO ESP32-C3 board: ~€5
- CR2032 coin cell holder: ~€1
- Tactile button: ~€0.50
- 3D printed case: ~€2
- **Total: ~€8-10 per clicker**

### Option 3: Fully Custom System (Advanced)

Complete custom hardware including dedicated courtside display unit. Only pursue after validating concept with Options 1 or 2.

## App Implementation Options

### Option A: Flic App + Webhooks (Fastest Prototype)

Use Flic's native app to trigger webhooks on button press.

### Option B: Custom React Native App (Better)

Build a dedicated app that connects directly to Flic buttons via BLE.

**Tech stack:**
- React Native + react-native-ble-plx
- Or native iOS/Android with BLE libraries

## Tennis Scoring Logic

See full implementation in the detailed spec. Key features:
- Full tennis scoring (points, games, sets, tiebreaks)
- Deuce/advantage handling
- Undo functionality
- Match history

## Audio Announcements

The key insight: instead of fighting display visibility issues (sun glare, weatherproofing), announce the score audibly via Bluetooth speaker.

**Benefits:**
1. No display visibility issues
2. No mounting needed
3. Players don't need to look
4. Cheaper than outdoor display
5. Professional feel - like having an umpire

## Product Concepts

### Concept A: "Tennis Umpire" (Audio-First)
- Target: Individual players
- Components: 2x Flic buttons + Phone app + Bluetooth speaker
- Cost: ~€80-100

### Concept B: "Club Scoreboard" (Fixed Installation)
- Target: Tennis clubs with covered courts
- Cost: €300-800

### Concept C: "League Kit" (Tenis del Parque Integration)
- Target: League matches
- Features: Live scores, analytics, auto result submission

## Development Phases

1. **Validate** - Flic buttons + simple app
2. **Improve** - React Native app with BLE
3. **Integrate** - Connect to Tenis del Parque
4. **Scale** - Custom hardware

## Resources

- Flic SDK: [flic.io/developers](https://flic.io/developers)
- ESP32 docs: [docs.espressif.com](https://docs.espressif.com)
- React Native BLE: react-native-ble-plx

---

*Document created: January 2025*
*Status: Planning phase - awaiting hardware purchase*
