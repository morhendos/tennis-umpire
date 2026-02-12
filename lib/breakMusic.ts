import { Audio } from 'expo-av';
import { useVoiceStore } from './voiceStore';

// ============================================
// Break Music Player
// ============================================
// Plays ambient music during changeovers and set breaks.
// Completely separate from announcement sounds — runs its own Sound instance.

// Available tracks — React Native requires static require() calls
// Drop MP3 files into assets/music/ and register them here
const TRACKS: { id: string; name: string; source: any }[] = [
  { id: 'billie-jean', name: 'Billie Jean', source: require('../assets/music/billie-jean.mp3') },
  { id: 'this-girl', name: 'This Girl', source: require('../assets/music/this-girl.mp3') },
  { id: 'felicita', name: 'Felicità', source: require('../assets/music/felicita.mp3') },
];

let musicSound: Audio.Sound | null = null;
let fadeTimer: NodeJS.Timeout | null = null;
let isPlaying = false;

// How many tracks are available
export function getTrackCount(): number {
  return TRACKS.length;
}

// Get track list for settings UI
export function getTrackList(): { id: string; name: string }[] {
  return TRACKS.map(t => ({ id: t.id, name: t.name }));
}

// Pick which track to play
function pickTrack(): typeof TRACKS[0] | null {
  if (TRACKS.length === 0) return null;

  const { breakMusicTrack } = useVoiceStore.getState();

  if (breakMusicTrack === 'shuffle') {
    return TRACKS[Math.floor(Math.random() * TRACKS.length)];
  }

  return TRACKS.find(t => t.id === breakMusicTrack) || TRACKS[0];
}

// Start playing break music (called when entering break mode)
export async function startBreakMusic(): Promise<void> {
  const { breakMusicEnabled, breakMusicVolume } = useVoiceStore.getState();

  if (!breakMusicEnabled || TRACKS.length === 0) {
    console.log('🎵 Break music disabled or no tracks available');
    return;
  }

  // Stop any existing music first
  await stopBreakMusic();

  const track = pickTrack();
  if (!track) return;

  try {
    console.log(`🎵 Starting break music: ${track.name} at ${Math.round(breakMusicVolume * 100)}% volume`);

    const { sound } = await Audio.Sound.createAsync(
      track.source,
      {
        shouldPlay: true,
        volume: breakMusicVolume,
        isLooping: true,
      }
    );

    musicSound = sound;
    isPlaying = true;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && !status.isPlaying && isPlaying) {
        // Track ended unexpectedly
        console.log('🎵 Break music stopped unexpectedly');
        isPlaying = false;
      }
    });
  } catch (e) {
    console.error('❌ Failed to start break music:', e);
  }
}

// Fade out music over duration (ms), then stop
export async function fadeOutAndStop(durationMs: number = 1000): Promise<void> {
  if (!musicSound || !isPlaying) return;

  const { breakMusicVolume } = useVoiceStore.getState();
  const steps = 10;
  const stepMs = durationMs / steps;
  const volumeStep = breakMusicVolume / steps;
  let currentVolume = breakMusicVolume;
  let step = 0;

  console.log(`🎵 Fading out break music over ${durationMs}ms`);

  return new Promise<void>((resolve) => {
    fadeTimer = setInterval(async () => {
      step++;
      currentVolume = Math.max(0, currentVolume - volumeStep);

      try {
        if (musicSound) {
          await musicSound.setVolumeAsync(currentVolume);
        }
      } catch (_) {
        // Sound may have been unloaded
      }

      if (step >= steps) {
        if (fadeTimer) {
          clearInterval(fadeTimer);
          fadeTimer = null;
        }
        await stopBreakMusic();
        resolve();
      }
    }, stepMs);
  });
}

// Immediately stop break music
export async function stopBreakMusic(): Promise<void> {
  // Clear any fade in progress
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }

  isPlaying = false;

  if (musicSound) {
    try {
      await musicSound.stopAsync();
      await musicSound.unloadAsync();
    } catch (_) {
      // Ignore cleanup errors
    }
    musicSound = null;
    console.log('🎵 Break music stopped');
  }
}

// Update volume live (for slider changes while music is playing)
export async function updateVolume(volume: number): Promise<void> {
  if (musicSound && isPlaying) {
    try {
      await musicSound.setVolumeAsync(volume);
    } catch (_) {}
  }
}

// Check if music is currently playing
export function isMusicPlaying(): boolean {
  return isPlaying;
}
