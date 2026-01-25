# Architecture Overview

Technical documentation of the Tennis Umpire codebase.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo (SDK 52) |
| Router | Expo Router (file-based routing) |
| State Management | Zustand + AsyncStorage |
| Audio | Expo AV (TTS playback) + Expo Speech (native fallback) |
| Styling | React Native StyleSheet |
| Build | EAS Build |

---

## Directory Structure

```
app/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/            
│   │   ├── _layout.tsx    # Tab navigator config
│   │   └── index.tsx      # Main scoreboard screen
│   ├── _layout.tsx        # Root layout
│   └── settings.tsx       # Settings screen
│
├── lib/                    # Core business logic
│   ├── speech.ts          # TTS engine + SSML
│   ├── scoring.ts         # Tennis scoring rules
│   ├── voiceStore.ts      # Voice settings (Zustand store)
│   ├── useMatch.ts        # Match state hook
│   └── translations.ts    # i18n strings
│
├── assets/
│   └── images/            # App icons, tennis ball, etc.
│
├── docs/                   # Documentation
│
├── app.json               # Expo configuration
├── eas.json               # EAS Build profiles
└── package.json
```

---

## Key Files Explained

### `/app/(tabs)/index.tsx` - Main Scoreboard

The primary screen containing:
- **Setup View**: Player name inputs, coin flip trigger
- **Coin Flip View**: Animated coin toss for serve selection
- **Match View**: Live scoreboard with tap-to-score

Key components:
- `CoinFlip` - Animated 3D coin flip with physics
- `ServeIndicator` - Pulsing dot showing current server
- `AnimatedScore` - Score with pop animation on change

### `/lib/scoring.ts` - Tennis Scoring Logic

Pure functions for tennis rules:

```typescript
// Types
type Player = 'A' | 'B';
type MatchStatus = 'in_progress' | 'deuce' | 'advantage_A' | 'match_point_A' | ...

// Key functions
getMatchStatus(state: MatchState): MatchStatus
getSetsWon(state: MatchState): { A: number, B: number }
```

Handles:
- Standard scoring (0, 15, 30, 40)
- Deuce and advantage
- Tiebreaks at 6-6
- Best of 3 sets

### `/lib/speech.ts` - Voice Announcements

TTS engine abstraction supporting:
- Google Cloud TTS (with SSML)
- ElevenLabs
- Native device TTS

Key exports:
```typescript
speak(text: string, style?: AnnouncementStyle): Promise<void>
announceScore(state: MatchState): void
announceGameWon(winner: Player, state: MatchState): void
announceSetWon(winner: Player, setScore, state: MatchState): void
announceStatus(status: MatchStatus, state: MatchState): void
```

### `/lib/voiceStore.ts` - Settings Store

Zustand store with AsyncStorage persistence:

```typescript
interface VoiceStore {
  // Engine selection
  voiceEngine: 'google' | 'elevenlabs' | 'native';
  
  // API keys
  googleApiKey: string;
  elevenLabsApiKey: string;
  
  // Google settings
  googleSettings: {
    voiceId: string;
    speakingRate: number;
    pitch: number;
  };
  
  // ElevenLabs settings
  settings: {
    voiceId: string;
    stability: number;
    similarityBoost: number;
    style: number;
  };
  
  // General
  language: 'en' | 'es' | 'fr' | 'it';
  audioEnabled: boolean;
}
```

### `/lib/useMatch.ts` - Match State Hook

React hook managing match state and actions:

```typescript
const {
  match,           // Current match state or null
  startMatch,      // (playerA, playerB, server) => void
  scorePoint,      // (winner: 'A' | 'B') => void
  undo,            // Go back one point
  resetMatch,      // End current match
  canUndo,         // Boolean
  audioEnabled,    // Boolean
  toggleAudio,     // Toggle announcements
} = useMatch();
```

### `/lib/translations.ts` - i18n

Translation strings for all supported languages:

```typescript
const translations = {
  en: {
    love: 'love',
    fifteen: 'fifteen',
    game: 'Game',
    matchPoint: 'Match point',
    // ...
  },
  es: { ... },
  fr: { ... },
  it: { ... },
};

// Usage
t('game', 'es') // => "Juego"
```

---

## Audio Debouncing

To prevent audio chaos from rapid button tapping:

```
User taps rapidly: tap → tap → tap → tap
                    │     │     │     │
                    ▼     ▼     ▼     ▼
                  cancel cancel cancel wait 300ms
                                         │
                                         ▼
                                   Play final score
```

**Rules:**
- Regular point scores (`score` style): Debounced 300ms
- Important announcements (`game`, `set`, `match`, `dramatic`): Play immediately
- Current audio always stops immediately on new tap
- Only the *latest* score is announced after rapid tapping

---

## State Flow

```
┌─────────────────┐
│  User taps      │
│  score button   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  useMatch       │
│  scorePoint()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  scoring.ts     │
│  Calculate new  │
│  match state    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  speech.ts      │
│  Announce score │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  voiceStore     │
│  Get engine &   │
│  settings       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TTS API call   │
│  (Google/11Labs │
│  /Native)       │
└─────────────────┘
```

---

## Voice Engine Architecture

```
speak(text, style)
       │
       ├──► voiceEngine === 'google'
       │         │
       │         ▼
       │    wrapInSSML(text, style)
       │         │
       │         ▼
       │    speakWithGoogle(ssml, settings, apiKey)
       │         │
       │         ▼
       │    Google Cloud TTS API
       │         │
       │         ▼
       │    Expo AV playback
       │
       ├──► voiceEngine === 'elevenlabs'
       │         │
       │         ▼
       │    speakWithElevenLabs(text, settings, apiKey)
       │         │
       │         ▼
       │    ElevenLabs API
       │         │
       │         ▼
       │    Expo AV playback
       │
       └──► voiceEngine === 'native'
                 │
                 ▼
            speakNative(text)
                 │
                 ▼
            Expo Speech API
```

---

## SSML Processing

For Google TTS, announcements are wrapped in SSML:

```typescript
type AnnouncementStyle = 'score' | 'game' | 'set' | 'match' | 'dramatic' | 'calm';

// Example: "Game, Nadal. 4-2."
// With 'game' style becomes:
<speak>
  <prosody rate="92%" pitch="-1st">
    <emphasis level="moderate">Game, Nadal</emphasis>
    <break time="400ms"/>
    <prosody pitch="-2st">4-2</prosody>
  </prosody>
</speak>
```

---

## Design System

### Colors (Wimbledon-inspired)

```typescript
const COLORS = {
  // Backgrounds
  bgPrimary: '#050a08',    // Deep dark green-black
  bgSecondary: '#0a1210',
  bgCard: '#0d1a15',
  
  // Wimbledon green
  green: '#1a472a',
  greenLight: '#2d6a4f',
  greenAccent: '#40916c',
  
  // Championship gold
  gold: '#c9a227',
  goldLight: '#d4b742',
  
  // Text
  white: '#ffffff',
  cream: '#f5f5dc',
  silver: '#c0c0c0',
  muted: '#5a6b62',
};
```

### Typography

- Large scores: 48-64px, bold
- Labels: 11-12px, uppercase, letter-spacing
- Body: 15-16px

### Components

- `BlurView` for glassmorphic cards
- `LinearGradient` for buttons and accents
- Subtle animations via `Animated` API

---

## Adding New Features

### New Voice Engine

1. Add to `VoiceEngine` type in `voiceStore.ts`
2. Add settings interface and defaults
3. Implement `speakWith[Engine]()` in `speech.ts`
4. Add UI section in `settings.tsx`

### New Language

1. Add translations in `translations.ts`
2. Add to `LANGUAGES` array in `voiceStore.ts`
3. Add Google voices in `GOOGLE_VOICES`
4. Test with all announcement types

### New Announcement Type

1. Add function in `speech.ts`
2. Call from appropriate place in `useMatch.ts`
3. Add translation strings if needed
