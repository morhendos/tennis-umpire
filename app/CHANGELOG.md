# Changelog

All notable changes to Tennis Umpire.

## [1.1.0] - 2025-01-25

### Added

#### Match Format Selection
- **5 match formats** to choose from:
  - **Best of 3 Sets** - Standard format (first to 2 sets)
  - **2 Sets + Super Tiebreak** - If 1-1, play 10-point match tiebreak instead of 3rd set
  - **Best of 5 Sets** - Grand Slam format (first to 3 sets)
  - **1 Set** - Quick match format
  - **Pro Set** - First to 8 games
- Format selector on setup screen with pill-style buttons
- Selected format highlighted in green

#### Super Tiebreak Support
- Match tiebreak logic: first to 10 points, win by 2
- Super tiebreak only triggered when sets are tied at match point (e.g., 1-1 in best of 3)
- Super tiebreak score displayed correctly in scoreboard
- Super tiebreak announcement: "Match tiebreak, first to ten"
- Multi-language support for super tiebreak (EN, ES, FR, IT)

#### Scoreboard Fixes
- Fixed final set display bug - now shows all sets correctly when match completes
- Portrait mode: Shows all completed sets including deciding set
- Landscape mode: All set columns display properly at match end

## [1.0.0] - 2025-01-24

### Added

#### Audio System
- **Debouncing** for rapid scoring - prevents audio chaos
- Only the final score is announced when tapping rapidly
- Important announcements (game/set/match) play immediately
- Current audio stops instantly on new input

#### Voice Engines
- **Google Cloud TTS** with Neural2 voices (10x cheaper than ElevenLabs)
- **ElevenLabs** integration for premium AI voices
- **Native TTS** fallback for offline use
- Multi-language support: English, Spanish, French, Italian

#### SSML Styling (Google TTS)
- Different styles for different announcements:
  - `score` - Regular points, clear and measured
  - `game` - Game won, emphasis + pause
  - `set` - Set won, slower and deeper
  - `match` - Match point/won, maximum drama
  - `dramatic` - Set point, tiebreak
  - `calm` - Changeover, time calls
- Bluetooth speaker audio optimization

#### Scoreboard
- Premium Wimbledon-inspired dark theme
- Animated score changes with pop effect
- Pulsing serve indicator
- **Landscape TV-style scoreboard** with full set-by-set scores
  - Shows each completed set score in separate columns (6-4, 7-5, etc.)
  - Current set games highlighted with gold asterisk
  - Winning set scores displayed in bold white
  - Compact serve indicator for landscape
  - Score buttons on left/right sides for easy tapping
  - Integrated undo/audio/reset controls at bottom
- Safe area handling for notch/Dynamic Island

#### Coin Flip
- Two-sided coin with player initials
- Physics-based flip animation (2.4s, 9+ rotations)
- Green side for Player 1, Gold for Player 2
- Shake effect on landing
- Multi-flip support with CONFIRM button

#### Match Logic
- Full tennis scoring (0-15-30-40, deuce, advantage)
- Tiebreak at 6-6
- Best of 3 sets
- Undo functionality
- Automatic serve switching

#### Announcements
- Match start: "Player A versus Player B. Player A to serve."
- Point scores: "Fifteen-love", "Deuce", "Advantage Nadal"
- Game won: "Game, Nadal. Nadal leads 4 games to 2."
- Set won: "Game and set, Federer. 6-4."
- Match point: "Match point, Djokovic"
- Changeover: "Changeover, 90 seconds"
- Scheduled serve calls after breaks

#### Settings
- Voice engine selection with visual tabs
- API key management (show/hide toggle)
- Voice selection per engine
- Google: Speaking rate, pitch sliders
- ElevenLabs: Stability, similarity, style sliders
- Language selection with voice count display
- Test voice button
- Reset to defaults

### Technical
- React Native / Expo SDK 52
- Expo Router for navigation
- Zustand for state management
- AsyncStorage for persistence
- EAS Build configuration for Android APK

---

## Roadmap

### Planned
- [ ] Pre-generated audio clips for near-zero API cost
- [ ] PWA screenshots for app store optimization
- [ ] Bluetooth clicker support for hands-free scoring
- [ ] Match history and statistics
- [ ] Share match results

### Ideas
- [ ] Custom voice training with user's voice
- [ ] Court-side speaker integration
- [ ] Tournament bracket mode
- [ ] Apple Watch / Wear OS companion
