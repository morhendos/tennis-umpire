# SSML Voice Styling

Tennis Umpire uses SSML (Speech Synthesis Markup Language) to create professional, dramatic umpire-style announcements with Google Cloud TTS.

## What is SSML?

SSML is an XML-based markup language that gives fine control over how text is spoken:
- **Pauses** between words
- **Emphasis** on important words
- **Pitch** changes (higher/lower voice)
- **Rate** changes (faster/slower)
- **Volume** adjustments

## Announcement Styles

The app uses 6 different styles depending on the announcement type:

### 1. `score` - Regular Point Scores

Used for: "Fifteen-love", "Thirty-all", etc.

```xml
<speak>
  <prosody rate="95%" pitch="-1st">
    Fifteen-love
  </prosody>
</speak>
```

**Effect:** Clear, measured, slight pitch drop. Professional and calm.

---

### 2. `game` - Game Won

Used for: "Game, Nadal. Nadal leads 4 games to 2."

```xml
<speak>
  <prosody rate="92%" pitch="-1st">
    <emphasis level="moderate">Game, Nadal</emphasis>
    <break time="400ms"/>
    <prosody pitch="-2st">
      Nadal leads 4 games to 2
    </prosody>
  </prosody>
</speak>
```

**Effect:** Emphasis on "Game [Name]", pause, then deeper pitch for the score.

---

### 3. `set` - Set Won

Used for: "Game and set, Federer. 6-4."

```xml
<speak>
  <prosody rate="88%" pitch="-2st" volume="+1dB">
    <emphasis level="strong">Game and set, Federer</emphasis>
    <break time="500ms"/>
    6-4
  </prosody>
</speak>
```

**Effect:** Slower, deeper, louder. More dramatic for this important moment.

---

### 4. `match` - Match Point / Match Won

Used for: "Match point, Djokovic" and "Game, set, match. Djokovic wins."

```xml
<speak>
  <prosody rate="85%" pitch="-2st" volume="+2dB">
    <emphasis level="strong">
      Match point, Djokovic
    </emphasis>
  </prosody>
</speak>
```

**Effect:** Maximum drama - slowest, deepest pitch, loudest volume.

---

### 5. `dramatic` - Set Point / Tiebreak

Used for: "Set point, Murray" and "Tiebreak"

```xml
<speak>
  <break time="200ms"/>
  <prosody rate="90%" pitch="-1st" volume="+1dB">
    <emphasis level="strong">
      Set point, Murray
    </emphasis>
  </prosody>
</speak>
```

**Effect:** Brief pause before, strong emphasis, slightly elevated.

---

### 6. `calm` - Changeover / Time Calls

Used for: "Changeover, 90 seconds" and "Time. Nadal to serve."

```xml
<speak>
  <prosody rate="95%" pitch="0st">
    Changeover, 90 seconds
  </prosody>
</speak>
```

**Effect:** Neutral, relaxed, informational tone.

---

## Style Mapping

| Announcement Type | Style | Rate | Pitch | Volume |
|------------------|-------|------|-------|--------|
| Regular score | `score` | 95% | -1st | normal |
| Game won | `game` | 92% | -1st/-2st | normal |
| Set won | `set` | 88% | -2st | +1dB |
| Match point/won | `match` | 85% | -2st | +2dB |
| Set point, Tiebreak | `dramatic` | 90% | -1st | +1dB |
| Changeover, Time | `calm` | 95% | 0st | normal |

## SSML Reference

### Prosody (Rate, Pitch, Volume)

```xml
<prosody rate="90%" pitch="-2st" volume="+2dB">
  Text here
</prosody>
```

| Attribute | Values | Description |
|-----------|--------|-------------|
| rate | 50%-200%, slow, medium, fast | Speaking speed |
| pitch | -20st to +20st, x-low to x-high | Voice pitch (semitones) |
| volume | -6dB to +6dB, silent to x-loud | Volume level |

### Break (Pauses)

```xml
<break time="500ms"/>
```

| Time | Use Case |
|------|----------|
| 200ms | Brief pause |
| 400ms | After "Game [Name]" |
| 500ms | Before score in set announcement |

### Emphasis

```xml
<emphasis level="strong">Match point!</emphasis>
```

| Level | Use Case |
|-------|----------|
| reduced | De-emphasize |
| moderate | Slight emphasis |
| strong | Important moments |

## Audio Profile

The app uses a Bluetooth speaker optimization profile:

```javascript
audioConfig: {
  effectsProfileId: ['medium-bluetooth-speaker-class-device']
}
```

This optimizes the audio for outdoor court speakers.

## Customization

To modify styles, edit `/lib/speech.ts`:

```typescript
function wrapInSSML(text: string, style: AnnouncementStyle): string {
  switch (style) {
    case 'match':
      // Make even more dramatic:
      return `<speak>
        <prosody rate="80%" pitch="-3st" volume="+3dB">
          <emphasis level="strong">${escaped}</emphasis>
        </prosody>
      </speak>`;
    // ...
  }
}
```

## Note for Non-Google Engines

- **ElevenLabs**: Does not support SSML. Uses voice settings instead (stability, style).
- **Native TTS**: Limited SSML support varies by device. Falls back to plain text.
