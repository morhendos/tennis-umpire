# Tennis Umpire - Refactoring Plan

## 📊 Current State Analysis

### File Sizes (Problem Areas)

| File | Lines | Size | Status |
|------|-------|------|--------|
| `app/(tabs)/index.tsx` | **2,405** | 68KB | 🔴 Critical - God Component |
| `app/settings.tsx` | 912 | 27KB | 🟡 Large - needs splitting |
| `lib/speech.ts` | 700 | 20KB | 🟡 OK for now |
| `lib/scoring.ts` | 473 | 13KB | 🟢 Good |
| `lib/voiceStore.ts` | 248 | 8KB | 🟢 Good |
| `lib/useMatch.ts` | 189 | 5KB | 🟢 Good |

### Issues Identified

#### 1. **God Component** (`index.tsx` = 2,405 lines)
This single file contains:
- 6 inline components (AnimatedScore, ServeIndicator, IconButton, CoinFlip, etc.)
- 4 different screens (Setup Step 1, Setup Step 2, Coin Flip, Match)
- 2 layout variants (Portrait, Landscape)
- 1,200+ lines of styles
- All business logic mixed with presentation

#### 2. **No Component Separation**
Reusable components are defined inline instead of in `/components`.

#### 3. **Styles Not Modular**
- One massive StyleSheet with 100+ definitions
- Colors defined inline instead of using constants
- No shared style utilities

#### 4. **DRY Violations**
- Portrait and landscape scoreboards duplicate logic
- Similar button styles repeated
- Gradient patterns repeated throughout

#### 5. ~~**Project Structure Confusion**~~ ✅ RESOLVED
~~The Expo project lived in `/app` folder, and Expo Router used `/app/app` for routing.~~
**Fixed:** Moved Expo project to root. Now `app/` is only for Expo Router.

---

## 🎯 Target Architecture

```
tennis-umpire/
├── app/                              # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab navigation config
│   │   ├── index.tsx                 # Main screen (~100 lines, orchestrator only)
│   │   └── explore.tsx               # Stats/history (future)
│   ├── _layout.tsx                   # Root layout
│   ├── settings.tsx                  # Settings screen (~300 lines)
│   └── modal.tsx                     # Modal route
│
├── components/                       # Reusable UI components
│   ├── match/                        # Match-specific components
│   │   ├── Scoreboard.tsx            # Portrait scoreboard
│   │   ├── ScoreboardLandscape.tsx   # Landscape scoreboard
│   │   ├── ScoreButtons.tsx          # Tap-to-score buttons
│   │   ├── MatchComplete.tsx         # Winner celebration
│   │   └── StatusBanner.tsx          # Deuce/Match Point banner
│   │
│   ├── setup/                        # Setup flow components
│   │   ├── PlayerSetup.tsx           # Step 1: Enter names
│   │   ├── FormatSetup.tsx           # Step 2: Choose format
│   │   └── CoinFlip.tsx              # Coin flip animation
│   │
│   ├── ui/                           # Generic UI primitives
│   │   ├── AnimatedScore.tsx         # Animated number display
│   │   ├── ServeIndicator.tsx        # Pulsing serve dot
│   │   ├── IconButton.tsx            # Blur background icon button
│   │   ├── GradientButton.tsx        # Reusable gradient button
│   │   └── index.ts                  # Barrel exports
│   │
│   └── index.ts                      # Main barrel export
│
├── constants/                        # App-wide constants
│   ├── colors.ts                     # COLORS object
│   ├── styles.ts                     # Shared style utilities
│   └── index.ts                      # Barrel exports
│
├── lib/                              # Business logic (keep as-is)
│   ├── scoring.ts                    # Tennis scoring rules
│   ├── speech.ts                     # TTS integration
│   ├── useMatch.ts                   # Match state hook
│   ├── voiceStore.ts                 # Voice settings
│   ├── settings.ts                   # App settings
│   └── translations.ts               # i18n strings
│
├── hooks/                            # Custom React hooks
│   └── useOrientation.ts             # Screen orientation hook
│
├── types/                            # TypeScript types (if needed)
│   └── match.ts                      # Match-related types
│
├── assets/                           # Images, fonts, etc.
├── docs/                             # Documentation
├── app.json                          # Expo config
└── package.json
```

---

## 📋 Refactoring Steps

### Phase 1: Foundation (Quick Wins)
- [ ] **Step 1.1**: Extract `constants/colors.ts` - Move COLORS object
- [ ] **Step 1.2**: Extract `constants/styles.ts` - Shared style utilities
- [ ] **Step 1.3**: Create barrel exports (`index.ts` files)

### Phase 2: UI Primitives
- [ ] **Step 2.1**: Extract `components/ui/AnimatedScore.tsx`
- [ ] **Step 2.2**: Extract `components/ui/ServeIndicator.tsx`
- [ ] **Step 2.3**: Extract `components/ui/IconButton.tsx`
- [ ] **Step 2.4**: Create `components/ui/index.ts` barrel

### Phase 3: Setup Flow
- [ ] **Step 3.1**: Extract `components/setup/CoinFlip.tsx`
- [ ] **Step 3.2**: Extract `components/setup/PlayerSetup.tsx`
- [ ] **Step 3.3**: Extract `components/setup/FormatSetup.tsx`

### Phase 4: Match Components
- [ ] **Step 4.1**: Extract `components/match/StatusBanner.tsx`
- [ ] **Step 4.2**: Extract `components/match/ScoreButtons.tsx`
- [ ] **Step 4.3**: Extract `components/match/MatchComplete.tsx`
- [ ] **Step 4.4**: Extract `components/match/Scoreboard.tsx` (portrait)
- [ ] **Step 4.5**: Extract `components/match/ScoreboardLandscape.tsx`

### Phase 5: Final Cleanup
- [ ] **Step 5.1**: Refactor `index.tsx` to orchestrator (~150 lines)
- [ ] **Step 5.2**: Review and refactor `settings.tsx`
- [ ] **Step 5.3**: Remove unused code and imports
- [ ] **Step 5.4**: Add JSDoc comments to public APIs
- [ ] **Step 5.5**: Update README with architecture overview

---

## 📏 Guidelines

### File Size Targets
- **Screen files** (`app/` routes): 100-300 lines max
- **Components**: 50-250 lines max
- **Utilities/hooks**: 50-150 lines max

### Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Constants: `camelCase.ts`
- Types: `PascalCase` for types, `camelCase.ts` for files

### Import Order
```typescript
// 1. React/React Native
import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. External packages
import { LinearGradient } from 'expo-linear-gradient';

// 3. Internal absolute imports
import { COLORS } from '@/constants';
import { AnimatedScore } from '@/components/ui';

// 4. Relative imports
import { styles } from './styles';
```

### Component Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component
// 4. Styles (or import from separate file if >50 lines)
// 5. Export
```

---

## ✅ Success Criteria

After refactoring:
- [ ] No file exceeds 300 lines (except complex scoreboards ~400 max)
- [ ] `index.tsx` is under 200 lines (orchestration only)
- [ ] All reusable components are in `/components`
- [ ] Colors and shared styles in `/constants`
- [ ] Each component has a single responsibility
- [ ] Easy to find where any feature lives
- [ ] New developers can understand structure in 5 minutes

---

## 🚀 Execution Log

### ✅ Project Structure Cleanup
- **Status**: ✅ Complete
- **Date**: Jan 25, 2025
- **Notes**: Moved Expo project from `tennis-umpire/app/` to root. Now `app/` is only for Expo Router.

### Step 1.1: Extract colors.ts
- **Status**: ⏳ Pending
- **Date**: -
- **Notes**: -

### Step 1.2: Extract styles.ts
- **Status**: ⏳ Pending
- **Date**: -
- **Notes**: -

(Continue for each step...)

---

## 📝 Notes

### ✅ Project Structure Cleaned Up
Moved Expo project from `tennis-umpire/app/` to root `tennis-umpire/`.
Now `app/` folder is only used for Expo Router (file-based routing) - much cleaner!

### Future Considerations
- Consider extracting settings into separate route group `(settings)/`
- May want a `features/` folder if app grows significantly
- Could add Storybook for component documentation
