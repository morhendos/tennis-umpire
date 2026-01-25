# Tennis Umpire - Refactoring Plan

> Created: January 25, 2026
> Status: Phase 4 Complete ✅

---

## Completed Refactoring

### Phase 1-4: Main Screen Refactoring ✅

**Result:** `index.tsx` reduced from **2,405 → 102 lines** (96% reduction!)

| Phase | Description | Lines Removed |
|-------|-------------|---------------|
| 1 | Extract `constants/colors.ts` | -30 |
| 2 | Extract UI primitives (`components/ui/`) | -201 |
| 3 | Extract `CoinFlip.tsx` | -568 |
| 4 | Extract `SetupScreen.tsx`, `MatchScreen.tsx`, `ScreenWrapper.tsx` | -1,473 |

**New Structure:**
```
app/(tabs)/
  └── index.tsx (102 lines) - thin orchestrator

components/
  ├── ScreenWrapper.tsx (59 lines)
  ├── SetupScreen.tsx (338 lines)
  ├── MatchScreen.tsx (527 lines)
  ├── CoinFlip.tsx (570 lines)
  └── ui/
      ├── AnimatedScore.tsx (63 lines)
      ├── ServeIndicator.tsx (104 lines)
      ├── IconButton.tsx (62 lines)
      └── index.ts

constants/
  └── colors.ts (41 lines)

lib/
  └── matchUtils.ts (51 lines)
```

---

## Pending Refactoring

### Phase 5: Settings Screen Refactoring 🔴 HIGH PRIORITY

**Current:** `app/settings.tsx` - **898 lines**

**Problem:** Single massive file handling:
- Voice engine selection (Native/Google/ElevenLabs)
- Language selection with voice count display
- API key management (show/hide, validation)
- Engine-specific settings (ElevenLabs sliders, Google pitch/rate)
- Test voice functionality
- ~400 lines of styles

**Proposed Structure:**
```
components/settings/
  ├── SettingsSection.tsx        (~30 lines)  - Reusable section wrapper
  ├── VoiceEngineSelector.tsx    (~80 lines)  - Native/Google/ElevenLabs grid
  ├── LanguageSelector.tsx       (~60 lines)  - Language grid with voice counts
  ├── ApiKeyInput.tsx            (~50 lines)  - Secure input with show/hide
  ├── VoiceSelector.tsx          (~70 lines)  - Voice list for current engine
  ├── ElevenLabsSettings.tsx     (~100 lines) - Stability, similarity, style sliders
  ├── GoogleSettings.tsx         (~80 lines)  - Speaking rate, pitch sliders
  ├── styles.ts                  (~200 lines) - Shared settings styles
  └── index.ts                   - Exports

app/settings.tsx → ~150 lines (orchestrator)
```

**Estimated effort:** 1-2 hours
**Impact:** High - easier to maintain voice settings

---

### Phase 6: Speech Module Refactoring 🔴 HIGH PRIORITY

**Current:** `lib/speech.ts` - **700 lines**

**Problem:** Mixed concerns in single file:
- SSML template generation
- Three different TTS engine implementations
- Match announcement text generation
- Audio playback management
- Debouncing and timing logic

**Proposed Structure:**
```
lib/speech/
  ├── index.ts              (~50 lines)  - Main speak() export, engine routing
  ├── ssml.ts               (~100 lines) - SSML template helpers
  ├── nativeTTS.ts          (~80 lines)  - expo-speech wrapper
  ├── googleTTS.ts          (~120 lines) - Google Cloud TTS API
  ├── elevenLabsTTS.ts      (~100 lines) - ElevenLabs API
  ├── announcements.ts      (~150 lines) - Match announcement generation
  ├── audioPlayer.ts        (~50 lines)  - Sound playback, cleanup
  └── types.ts              (~30 lines)  - Shared types
```

**Estimated effort:** 2-3 hours
**Impact:** High - easier to add/modify TTS engines, better testability

---

### Phase 7: Cleanup - Remove Unused Expo Template Files 🟡 MEDIUM PRIORITY

**Files to delete:**
```
app/(tabs)/explore.tsx           (112 lines) - Template demo page
components/hello-wave.tsx        (19 lines)  - Demo animation
components/parallax-scroll-view.tsx (79 lines) - Not used
components/themed-text.tsx       (60 lines)  - Not used (we use COLORS)
components/themed-view.tsx       (14 lines)  - Not used
components/external-link.tsx     (25 lines)  - Only used by explore.tsx
hooks/use-theme-color.ts         (21 lines)  - Not used
hooks/use-color-scheme.ts        (1 line)    - Not used
hooks/use-color-scheme.web.ts    (21 lines)  - Not used
```

**Also review:**
- `components/haptic-tab.tsx` - Check if used
- `constants/theme.ts` - Check if needed after cleanup

**Estimated effort:** 10-15 minutes
**Impact:** Cleaner project, less confusion

---

### Phase 8: Optional Improvements 🟢 LOW PRIORITY

#### 8.1 Voice Store Cleanup
**Current:** `lib/voiceStore.ts` - 248 lines

**Could extract:**
- `lib/voices/elevenlabs.ts` - ElevenLabs voice definitions
- `lib/voices/google.ts` - Google voice definitions  
- `lib/voices/defaults.ts` - Default settings

**Verdict:** Minor improvement, do if touching this file anyway

#### 8.2 Scoring Module
**Current:** `lib/scoring.ts` - 473 lines

**Status:** Well-structured, pure functions, testable. Leave as-is unless it grows.

**Could split if needed:**
- `lib/scoring/types.ts`
- `lib/scoring/formats.ts`
- `lib/scoring/engine.ts`

---

## Current File Sizes (Post Phase 4)

| File | Lines | Status |
|------|-------|--------|
| `app/(tabs)/index.tsx` | 102 | ✅ Refactored |
| `app/settings.tsx` | 898 | 🔴 Needs refactoring |
| `lib/speech.ts` | 700 | 🔴 Needs refactoring |
| `components/MatchScreen.tsx` | 527 | ✅ New component |
| `components/CoinFlip.tsx` | 570 | ✅ Extracted |
| `components/SetupScreen.tsx` | 338 | ✅ New component |
| `lib/scoring.ts` | 473 | 🟢 Clean, leave as-is |
| `lib/voiceStore.ts` | 248 | 🟢 OK for now |
| `lib/translations.ts` | 197 | 🟢 OK |
| `lib/useMatch.ts` | 189 | 🟢 OK |

---

## Recommended Order

1. **Phase 7** - Quick cleanup of unused files (10 min)
2. **Phase 5** - Settings screen refactoring (1-2 hours)
3. **Phase 6** - Speech module refactoring (2-3 hours)
4. **Phase 8** - Optional improvements as needed

---

## Notes

- All refactoring follows the same pattern: extract components/modules, keep parent as thin orchestrator
- Always test after each extraction
- Commit after each phase
- TypeScript compilation (`npx tsc --noEmit`) should pass after each step
