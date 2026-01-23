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
- Pricing:
  - Single button: ~€29
  - Three-pack: ~€80

**For prototype:** Buy 2 buttons (~€55-60 total)

**Pros:**
- No hardware development
- Works immediately
- Reliable, tested product
- Has clip accessory for attaching to clothes

**Cons:**
- Bulkier than custom solution
- Requires their app or SDK
- Per-unit cost higher than DIY

### Option 2: Custom ESP32-C3 Clickers (Future)

**What:** Build tiny custom clickers using ESP32-C3 microcontrollers.

**Components per clicker:**
- Seeed XIAO ESP32-C3 board: ~€5
- CR2032 coin cell holder: ~€1
- Tactile button: ~€0.50
- 3D printed case: ~€2
- **Total: ~€8-10 per clicker**

**Where to Buy:**
- DigiKey: [digikey.com](https://www.digikey.com) - Seeed XIAO ESP32-C3 at $4.99
- AliExpress: ESP32-C3 boards for €3-4 (slower shipping)
- Amazon.es: Search "ESP32-C3" - packs of 2-3 for ~€15-20

**Pros:**
- Smaller form factor possible
- Fully customizable
- Lower per-unit cost at scale
- Can add custom branding
- Both BLE and WiFi capable

**Cons:**
- Requires firmware development
- 3D printing/case design needed
- More time to prototype

### Option 3: Fully Custom System (Advanced)

Complete custom hardware including dedicated courtside display unit:
- Custom clickers (ESP32-C3)
- E-ink or bright LCD display unit (ESP32 based)
- Solar powered option for outdoor courts
- No phone/tablet required

**Timeline:** Only pursue after validating concept with Options 1 or 2.

## App Implementation Options

### Option A: Flic App + Webhooks (Fastest Prototype)

Use Flic's native app to trigger webhooks on button press.

**How it works:**
1. Configure each Flic button in their app
2. Set button action to POST to your API endpoint
3. Build a web page that displays the score
4. API updates score state, page auto-refreshes

**Implementation:**
```
Flic Button Press
    → Flic App detects
    → HTTP POST to /api/scoreboard/point
    → Server updates match state
    → WebSocket pushes to display page
```

**Pros:**
- No BLE coding required
- Can prototype in a weekend
- Leverages existing Flic infrastructure

**Cons:**
- Requires internet connection on court
- Slight latency (100-300ms)
- Dependent on Flic app running

### Option B: Custom React Native App (Better)

Build a dedicated app that connects directly to Flic buttons via BLE.

**How it works:**
1. App pairs with both Flic buttons
2. Receives BLE events directly
3. Handles all scoring logic locally
4. Displays score on device screen
5. Optionally syncs to API when online

**Tech stack:**
- React Native + react-native-ble-plx
- Or native iOS/Android with BLE libraries

**Pros:**
- Works completely offline
- Instant response (<50ms)
- Full control over UX
- Can work without internet

**Cons:**
- More development time
- Need to handle BLE pairing UX
- Platform-specific considerations

## Tennis Scoring Logic

### Core State Structure

```javascript
const match = {
  id: 'match_123',
  players: {
    A: { name: 'Player 1', id: 'player_1' },
    B: { name: 'Player 2', id: 'player_2' }
  },
  server: 'A',
  points: { A: 0, B: 0 },      // 0, 15, 30, 40, 'AD'
  games: { A: 0, B: 0 },
  sets: [
    { A: 6, B: 4 },            // Completed sets
    { A: 3, B: 2 }             // Current set
  ],
  tiebreak: false,
  tiebreakPoints: { A: 0, B: 0 },
  history: [],                  // For undo functionality
  matchFormat: {
    setsToWin: 2,              // Best of 3
    gamesPerSet: 6,
    tiebreakAt: 6,
    finalSetTiebreak: true     // Or false for advantage set
  }
};
```

### Point Scoring Function

```javascript
function addPoint(player) {
  // Save state for undo
  saveToHistory();
  
  if (match.tiebreak) {
    return handleTiebreakPoint(player);
  }
  
  const opponent = player === 'A' ? 'B' : 'A';
  const p = match.points;
  
  // Deuce situations (both at 40 or beyond)
  if (p[player] >= 40 && p[opponent] >= 40) {
    if (p[player] === 40 && p[opponent] === 40) {
      // Deuce -> Advantage
      p[player] = 'AD';
    } else if (p[opponent] === 'AD') {
      // Opponent had advantage -> Back to deuce
      p[opponent] = 40;
    } else if (p[player] === 'AD') {
      // Player had advantage -> Wins game
      winGame(player);
    }
  }
  // Normal point progression
  else if (p[player] === 40) {
    // At 40, next point wins game
    winGame(player);
  } else {
    // Progress through 0 -> 15 -> 30 -> 40
    const sequence = [0, 15, 30, 40];
    const currentIndex = sequence.indexOf(p[player]);
    p[player] = sequence[currentIndex + 1];
  }
  
  return getDisplayState();
}
```

### Game Winning Function

```javascript
function winGame(player) {
  const opponent = player === 'A' ? 'B' : 'A';
  
  // Award game
  match.games[player]++;
  
  // Reset points
  match.points = { A: 0, B: 0 };
  
  // Check for set win
  const g = match.games;
  const format = match.matchFormat;
  
  if (g[player] >= format.gamesPerSet) {
    // Need 2 game lead, or tiebreak situation
    if (g[player] - g[opponent] >= 2) {
      winSet(player);
    } else if (g[player] === format.tiebreakAt && g[opponent] === format.tiebreakAt) {
      // Start tiebreak
      match.tiebreak = true;
      match.tiebreakPoints = { A: 0, B: 0 };
    }
  }
  
  // Switch server (except during tiebreak, handled separately)
  if (!match.tiebreak) {
    switchServer();
  }
}
```

### Tiebreak Handling

```javascript
function handleTiebreakPoint(player) {
  const opponent = player === 'A' ? 'B' : 'A';
  const tp = match.tiebreakPoints;
  
  tp[player]++;
  
  // Check for tiebreak win (7+ points, 2 ahead)
  if (tp[player] >= 7 && tp[player] - tp[opponent] >= 2) {
    match.games[player]++;
    winSet(player);
    match.tiebreak = false;
    match.tiebreakPoints = { A: 0, B: 0 };
  }
  
  // Switch server every 2 points (after first point)
  const totalPoints = tp.A + tp.B;
  if (totalPoints === 1 || (totalPoints > 1 && (totalPoints - 1) % 2 === 0)) {
    switchServer();
  }
  
  return getDisplayState();
}
```

### Set and Match Winning

```javascript
function winSet(player) {
  // Record completed set
  const currentSet = match.sets[match.sets.length - 1];
  currentSet[player] = match.games[player];
  currentSet[player === 'A' ? 'B' : 'A'] = match.games[player === 'A' ? 'B' : 'A'];
  
  // Reset games for new set
  match.games = { A: 0, B: 0 };
  
  // Count sets won
  const setsWon = { A: 0, B: 0 };
  match.sets.forEach(set => {
    if (set.A > set.B) setsWon.A++;
    else if (set.B > set.A) setsWon.B++;
  });
  
  // Check for match win
  if (setsWon[player] >= match.matchFormat.setsToWin) {
    endMatch(player);
  } else {
    // Start new set
    match.sets.push({ A: 0, B: 0 });
  }
}
```

### Undo Functionality

```javascript
function saveToHistory() {
  match.history.push(JSON.parse(JSON.stringify({
    points: match.points,
    games: match.games,
    sets: match.sets,
    server: match.server,
    tiebreak: match.tiebreak,
    tiebreakPoints: match.tiebreakPoints
  })));
  
  // Keep only last 20 states
  if (match.history.length > 20) {
    match.history.shift();
  }
}

function undo() {
  if (match.history.length === 0) return false;
  
  const previousState = match.history.pop();
  Object.assign(match, previousState);
  
  return getDisplayState();
}
```

## Display UI Design

### Main Scoreboard View

```
┌──────────────────────────────────────────┐
│                                          │
│   SETS           GAMES      POINTS       │
│                                          │
│   Juan García    6-4  5       40         │
│              ●                           │  ← serving indicator
│   Pedro López    6-4  4       30         │
│                                          │
│                                          │
│   ┌────────┐                             │
│   │  UNDO  │     Set 2 • Game Point      │
│   └────────┘                             │
│                                          │
└──────────────────────────────────────────┘
```

### Key UI Elements

1. **Player names** - Large, readable from distance
2. **Set scores** - Show all completed sets
3. **Current games** - Prominent display
4. **Points** - Very large, main focus
5. **Serving indicator** - Dot or ball icon next to server
6. **Undo button** - Accessible but not too prominent
7. **Status line** - "Deuce", "Advantage Player A", "Set Point", "Match Point"

### Visual Feedback

- **Point scored:** Brief highlight/flash on the scoring player's side
- **Game won:** Larger celebration animation
- **Set won:** Full screen celebration
- **Undo:** Subtle reverse animation

### Accessibility

- High contrast colors
- Large touch targets for undo
- Orientation lock (landscape recommended)
- Screen brightness lock (keep at max)

## Integration with Tenis del Parque

### API Endpoints

```javascript
// Start a scoreboard session for a match
POST /api/scoreboard/start
{
  matchId: 'match_123',
  playerA: 'player_1_id',
  playerB: 'player_2_id',
  format: { setsToWin: 2, ... }
}

// Record a point (from Flic webhook or app)
POST /api/scoreboard/point
{
  matchId: 'match_123',
  player: 'A',  // or 'B'
  timestamp: '2025-01-14T15:30:00Z'
}

// Get current match state
GET /api/scoreboard/state/:matchId

// WebSocket for live updates
WS /api/scoreboard/live/:matchId
```

### Live Score Display on Match Page

Add optional live score widget to existing match pages:

```jsx
// components/LiveScoreWidget.jsx
export function LiveScoreWidget({ matchId }) {
  const [score, setScore] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(`/api/scoreboard/live/${matchId}`);
    ws.onmessage = (event) => {
      setScore(JSON.parse(event.data));
    };
    return () => ws.close();
  }, [matchId]);
  
  if (!score) return <div>No live score available</div>;
  
  return (
    <div className="live-score-widget">
      <div className="live-indicator">● LIVE</div>
      {/* Score display */}
    </div>
  );
}
```

### Analytics Potential

Point-by-point data enables:
- Win percentage on first serve vs second serve
- Performance in deuce situations
- Comebacks from behind
- Average points per game
- Clutch performance (set/match points saved/converted)

## Next Steps

### Phase 1: Validate Concept (1-2 weeks)
- [ ] Order 2 Flic buttons from flic.io
- [ ] Build basic Next.js scoreboard page
- [ ] Configure Flic webhooks to hit API
- [ ] Test during 2-3 real matches
- [ ] Gather player feedback

### Phase 2: Improve UX (2-3 weeks)
- [ ] Build dedicated React Native app (if warranted)
- [ ] Add offline support
- [ ] Implement proper undo
- [ ] Add match history storage
- [ ] Design courtside display UI

### Phase 3: Platform Integration (2-3 weeks)
- [ ] Integrate with Tenis del Parque match system
- [ ] Add live score widget to match pages
- [ ] Store point-by-point data
- [ ] Build analytics dashboard

### Phase 4: Scale (Future)
- [ ] Consider custom ESP32 clickers
- [ ] Explore dedicated display units
- [ ] Potential product offering for clubs/leagues

## Competitive Analysis: ScorePadel

### What They Built

ScorePadel is a Spanish startup (founded by Sergio Fuentes, 24, and Carlos Martínez, 23) that created a digital scoreboard system for padel courts. They got the idea while traveling in Seoul - they noticed players were so dependent on a rudimentary scoring system that when it failed, they stopped playing.

**Their Product:**
- 43" TV display mounted on gooseneck universal support
- 4 wireless Bluetooth buttons (2 per side of court)
- Software with multiple game modes (golden point, advantage, sets, umpire mode)
- QR code registration for players
- Ad display capability for revenue generation
- Installation takes ~25 minutes with 2 people
- Button battery lasts 36-48 hours between charges
- 0.4 second press delay to prevent accidental triggers from ball hits

**Their Traction:**
- Reservations for 11 clubs and 25 courts
- ~400,000 monthly impressions claimed
- Targeting both Spain and international markets (tested in India)

### What They Don't Solve

Notably absent from their marketing:
- **Waterproofing** - No IP ratings mentioned
- **Sunlight visibility** - No brightness/nits specs
- **Temperature extremes** - No operating range mentioned

**Likely reason:** They're targeting indoor padel courts or covered outdoor courts. Most padel facilities in Spain have roof coverage since the glass walls don't protect from rain anyway.

### Tennis vs Padel: Critical Differences

| Factor | Padel Courts | Tennis Courts |
|--------|-------------|---------------|
| Typically covered | Yes (many indoor/covered) | Rarely |
| Direct sun exposure | Less common | Very common |
| Rain during play | Usually under cover | Often exposed |
| Mounting infrastructure | Glass walls everywhere | Only net posts/fencing |
| Match duration | 60-90 min typical | 1-3 hours |
| Scoring complexity | Simpler (often golden point) | More complex (deuce/ad, tiebreaks) |

**Key insight:** Tennis has harder environmental constraints. A fixed 43" TV won't work for most outdoor tennis courts - too much sun exposure, no weather protection, nowhere obvious to mount it.

### Lessons Learned from ScorePadel

**What to copy:**
- Button placement OUTSIDE the court (avoid interference with play)
- 0.4 second press delay (prevents accidental triggers)
- Multiple buttons per side (convenience)
- QR code for match setup (quick onboarding)
- Umpire mode for tournaments
- Ad integration for club revenue

**What to do differently for tennis:**
- Can't rely on fixed large display for outdoor courts
- Need weather-resistant solution
- Need sunlight-readable option
- Consider audio announcements instead of/in addition to visual display
- Portable solution may be better than fixed installation

---

## Audio Announcements: The Speaker Solution

### The Insight

If the main challenge with outdoor tennis is display visibility (sun glare, weatherproofing, mounting), why not **announce the score audibly** instead?

### How It Would Work

```
[Player A clicks button]
        ↓
[App receives point]
        ↓
[Text-to-speech announces:]
"15 - Love, García serving"
```

### Benefits

1. **No display visibility issues** - Works in bright sun, rain, whatever
2. **No mounting needed** - Just a portable Bluetooth speaker
3. **Players don't need to look** - Hear the score while preparing for next point
4. **Spectators can follow** - Everyone hears the score
5. **Cheaper** - Bluetooth speaker (~€20-50) vs outdoor TV (€500+)
6. **Portable** - Players can bring their own setup
7. **Professional feel** - Like having an umpire announcing

### Implementation Options

**Option A: Phone/Tablet as Hub**
```
[Flic buttons] → Bluetooth → [Phone running app]
                                    ↓
                            [Text-to-speech]
                                    ↓
                            [Bluetooth speaker]
```

**Option B: Dedicated Device**
```
[Custom clickers] → BLE → [ESP32 device with speaker]
                              ↓
                         [Pre-recorded audio files]
                         "15-Love", "30-15", etc.
```

### Audio Design Considerations

**Voice options:**
- Text-to-speech (flexible, any language)
- Pre-recorded professional voice (more polished)
- Choice of languages (Spanish/English for your market)

**What to announce:**
- Points: "15 - Love"
- Games: "Game García. García leads 3-2"
- Sets: "Set García, 6-4. García leads one set to love"
- Special situations: "Deuce", "Advantage García", "Match point"
- Server: "García to serve" (on changeovers)

**Volume/timing:**
- Announce after ~2 second delay (let point settle)
- Loud enough to hear across court but not disturbing neighbors
- Option to mute for quiet environments

### Hybrid Approach: Audio + Simple Display

Best of both worlds:
- **Primary:** Audio announcements via speaker
- **Secondary:** Simple e-ink or LED display showing just the score
- **Backup:** Phone screen for detailed view

```
┌─────────────────────────────────────┐
│                                     │
│   [Portable e-ink display]          │
│   ┌─────────────────────┐           │
│   │   GARCÍA    3  40   │           │
│   │   LÓPEZ     2  30   │           │
│   └─────────────────────┘           │
│         +                           │
│   [Bluetooth speaker]               │
│   "40-30, García serving"           │
│                                     │
└─────────────────────────────────────┘
```

### E-ink Display Option

**Why e-ink works for outdoor tennis:**
- Perfect visibility in direct sunlight (like Kindle)
- Ultra-low power (battery lasts weeks)
- No glare issues
- Lightweight and portable
- Cheap (~€30-50 for small display module)

**Limitations:**
- Slow refresh rate (fine for score updates)
- No video/animations
- Smaller sizes typically available

**Products to explore:**
- Waveshare e-ink displays (for DIY)
- LILYGO T5 (ESP32 + e-ink combo board)
- Repurposed Kindle as display

---

## Product Concepts

### Concept A: "Tennis Umpire" (Audio-First)

**Target:** Individual players, recreational matches

**Components:**
- 2x Flic buttons (or custom clickers)
- Phone app
- Portable Bluetooth speaker

**Experience:**
1. Players arrive at court with speaker and buttons
2. Open app, start match, pair buttons
3. Play match - click button after winning point
4. Speaker announces score after each point
5. Match data syncs to Tenis del Parque

**Cost to player:** ~€80-100 (buttons + speaker)

### Concept B: "Club Scoreboard" (Fixed Installation)

**Target:** Tennis clubs, covered courts

**Components:**
- Weather-resistant display OR e-ink panel
- 4x mounted buttons (2 per side)
- Central controller
- Speaker system

**Experience:**
1. Club installs system on covered courts
2. Players scan QR to register match
3. Fixed buttons on court fence
4. Score shown on display + announced via speaker
5. Club can show ads between matches

**Cost to club:** €300-800 depending on display choice

### Concept C: "League Kit" (Tenis del Parque Integration)

**Target:** League matches specifically

**Components:**
- 2x custom branded clickers
- Companion app
- Optional speaker

**Experience:**
1. League provides/rents kit to registered players
2. Before league match, open app, select scheduled match
3. Real-time score updates on match page
4. Point-by-point data stored for analytics
5. Automatic result submission when match ends

**Cost:** Included with league registration OR rental fee

---

## Resources

### Flic Development
- Flic SDK: [flic.io/developers](https://flic.io/developers)
- iOS SDK: Available via CocoaPods
- Android SDK: Available via Maven
- Webhook documentation in Flic app

### ESP32 Development (Future)
- ESP-IDF: [docs.espressif.com](https://docs.espressif.com)
- Arduino framework for ESP32
- PlatformIO for easier development

### React Native BLE
- react-native-ble-plx library
- Expo BLE module (if using Expo)

---

*Document created: January 2025*
*Status: Planning phase - awaiting hardware purchase*
