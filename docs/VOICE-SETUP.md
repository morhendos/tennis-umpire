# Voice Setup Guide

Tennis Umpire supports three voice engines. This guide explains how to set up each one.

## Quick Comparison

| Engine | Quality | Cost per Match | Free Tier | Offline |
|--------|---------|----------------|-----------|---------|
| **Google Cloud TTS** | Excellent | ~€0.08 | 1M chars/month (~200 matches) | No |
| **ElevenLabs** | Premium | ~€0.80-1.00 | 10K chars/month (~2 matches) | No |
| **Native TTS** | Good | Free | Unlimited | Yes |

---

## Google Cloud TTS (Recommended)

Best balance of quality and cost. Neural2 voices sound professional and natural.

### Step 1: Create Google Cloud Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. New accounts get **$300 free credits**

### Step 2: Create a Project

1. Click the project dropdown (top left)
2. Click **"New Project"**
3. Name it "Tennis Umpire" (or anything you like)
4. Click **"Create"**

### Step 3: Enable Text-to-Speech API

1. Go to [console.cloud.google.com/apis/library/texttospeech.googleapis.com](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Make sure your project is selected (top-left dropdown)
3. Click the blue **"Enable"** button

### Step 4: Create API Key

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"+ Create Credentials"** at the top
3. Select **"API Key"**
4. Copy the key (looks like `AIzaSy...`)

### Step 5: (Optional) Restrict API Key

For security, restrict your key to only Text-to-Speech:

1. Click on the API key you created
2. Under "API restrictions", select **"Restrict key"**
3. Choose only **"Cloud Text-to-Speech API"**
4. Click **"Save"**

### Step 6: Add to App

1. Open Tennis Umpire → Settings
2. Select **"Google"** engine
3. Paste your API key
4. Choose a voice and test!

### Available Google Voices

**English:**
- 🇬🇧 James, Oliver, Emma, Sophie (British Neural2)
- 🇺🇸 Michael, David, Jennifer, Emily (American Neural2)
- 🇦🇺 Jack, Thomas (Australian Neural2)

**Other Languages:**
- 🇪🇸 Pablo, Carlos, María, Elena (Spanish)
- 🇫🇷 Pierre, Louis, Claire, Amélie (French)
- 🇮🇹 Marco, Giulia, Sofia (Italian)

### Cost Breakdown

| Voice Type | Free Tier | After Free Tier |
|------------|-----------|-----------------|
| Neural2 | 1M chars/month | $16 per 1M chars |
| WaveNet | 1M chars/month | $16 per 1M chars |
| Standard | 4M chars/month | $4 per 1M chars |

**Per match estimate:** ~5,000 characters = ~€0.08

---

## ElevenLabs

Premium AI voices with the most natural sound, but more expensive.

### Step 1: Create Account

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up for free account

### Step 2: Get API Key

1. Go to [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
2. Click **"Create API Key"**
3. Copy the key

### Step 3: Add to App

1. Open Tennis Umpire → Settings
2. Select **"ElevenLabs"** engine
3. Paste your API key
4. Choose a voice (Bill is recommended for umpire style)

### Voice Settings

| Setting | Range | Description |
|---------|-------|-------------|
| Stability | 0-1 | Lower = more expressive, Higher = consistent |
| Similarity Boost | 0-1 | Voice character fidelity |
| Style | 0-1 | Lower = calm, Higher = dramatic |
| Speaker Boost | On/Off | Enhanced clarity |

### Cost

| Plan | Monthly Cost | Characters | Matches/Month |
|------|-------------|------------|---------------|
| Free | $0 | 10,000 | ~2 |
| Starter | $5 | 30,000 | ~6 |
| Creator | $22 | 100,000 | ~20 |

---

## Native TTS

Built-in device voices. Free and works offline, but less natural sounding.

### iOS Setup

To get better voices on iOS:

1. Open **Settings** → **Accessibility** → **Spoken Content** → **Voices**
2. Download "Enhanced" or "Premium" voices for your language
3. Recommended: British English voices for that Wimbledon feel

### Android Setup

Android uses Google's built-in TTS. Quality varies by device.

1. Open **Settings** → **Accessibility** → **Text-to-speech**
2. Make sure "Google Text-to-Speech" is selected
3. Download additional language packs if needed

### Troubleshooting

**No voice playing?**
- Check Settings → "Check installed voices"
- Download voices for your selected language

**Wrong language/accent?**
- App tries to match: British English → Australian → American
- Download preferred accent in device settings

---

## Environment Variables (Optional)

For development, you can set API keys in `.env`:

```bash
# .env
EXPO_PUBLIC_GOOGLE_TTS_API_KEY=your_key_here
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_key_here
```

Note: For production builds, users enter their own API keys in the app.
