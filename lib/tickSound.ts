import { Audio } from 'expo-av';

// ============================================
// Instant Button Feedback Sound
// ============================================
// Plays a soft, short tick immediately on button press to confirm
// the input was registered. Uses a separate Audio.Sound instance
// so it never conflicts with the main speech playback.
//
// The tick is a programmatically generated ~60ms sine wave
// encoded as a WAV data URI — no external file needed.

let tickSound: Audio.Sound | null = null;
let tickUri: string | null = null;
let isReady = false;

// Generate a soft tick as a base64 WAV data URI
function generateTickWav(): string {
  const sampleRate = 22050;
  const durationMs = 60;
  const frequency = 880; // A5 — soft, pleasant pitch
  const volume = 0.15; // Quiet — just enough to hear
  
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bytesPerSample;
  
  // WAV header (44 bytes)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Generate samples: sine wave with exponential decay
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    
    // Quick attack (2ms), exponential decay
    const attackSamples = Math.floor(sampleRate * 0.002);
    const attack = i < attackSamples ? i / attackSamples : 1;
    const decay = Math.exp(-progress * 6); // fast exponential decay
    const envelope = attack * decay;
    
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * bytesPerSample, intSample, true);
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Pre-load the tick sound so playback is instant
export async function initTickSound(): Promise<void> {
  try {
    tickUri = generateTickWav();
    const { sound } = await Audio.Sound.createAsync(
      { uri: tickUri },
      { shouldPlay: false, volume: 1.0 }
    );
    tickSound = sound;
    isReady = true;
    console.log('✅ Tick sound ready');
  } catch (e) {
    console.log('⚠️ Failed to init tick sound:', e);
  }
}

// Play the tick — designed to be fire-and-forget, never throws
export async function playTick(): Promise<void> {
  if (!isReady || !tickUri) return;
  
  try {
    // Create a fresh sound instance each time for reliability
    // (replayAsync can be flaky if the previous play hasn't fully finished)
    const { sound } = await Audio.Sound.createAsync(
      { uri: tickUri },
      { shouldPlay: true, volume: 1.0 }
    );
    
    // Auto-cleanup when done
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (e) {
    // Never let tick errors affect scoring flow
    console.log('⚠️ Tick play failed:', e);
  }
}

// Cleanup
export async function disposeTickSound(): Promise<void> {
  if (tickSound) {
    try {
      await tickSound.unloadAsync();
    } catch (_) {}
    tickSound = null;
  }
  isReady = false;
}
