import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { useVoiceStore } from './voiceStore';
import { t, LanguageCode, TranslationKey } from './translations';

// ============================================
// Voice Pre-Cache System v2
// ============================================
// Generates announcement audio clips and persists them to disk.
// Clips survive app restarts and are reused across matches.
// Each announcement has up to 2 variants for natural variation.
//
// Disk layout:
//   {documentDirectory}/voice-cache/{engine}-{voiceId}-{lang}/
//     index.json   — maps "text|style" → ["file1.mp3", "file2.mp3"]
//     xxxxxx.mp3   — audio files
//
// Progressive strategy:
//   Match 1: Generate variant 1 for all entries (playable immediately)
//            Then background-fill variant 2
//   Match 2+: Both variants ready, random pick = natural umpire

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const CACHE_BASE_DIR = `${FileSystem.documentDirectory}voice-cache/`;
const MAX_VARIANTS = 2;

// ─── In-memory state ────────────────────────────────────────

// Disk index loaded into memory: "text|style" → [fileUri1, fileUri2?]
let diskIndex: Record<string, string[]> = {};
let currentVoiceDir = '';
let currentVoiceKey = '';
let indexDirty = false;
let saveIndexTimer: ReturnType<typeof setTimeout> | null = null;

// Fast lookup for playback: text → data URI (randomly picked variant)
const playbackCache = new Map<string, string[]>();

// Track which voice key the playback cache was loaded for
let playbackVoiceKey = '';

// Concurrency control
const MAX_CONCURRENT = 3;
let abortController: AbortController | null = null;

// Track current match players
let cachedPlayerA = '';
let cachedPlayerB = '';

// Track what's been queued this session
const queuedTexts = new Set<string>();

// ─── Cache status store (for UI progress) ───────────────────
interface CacheStatus {
  isGenerating: boolean;
  total: number;
  completed: number;
  failed: number;
}

export const useCacheStore = create<CacheStatus>(() => ({
  isGenerating: false,
  total: 0,
  completed: 0,
  failed: 0,
}));

// ─── Disk I/O helpers ───────────────────────────────────────

/** Get the voice-specific cache directory */
function getVoiceDir(): string {
  const { voiceEngine, settings, googleSettings, language } = useVoiceStore.getState();
  const voiceId = voiceEngine === 'google' ? googleSettings.voiceId : settings.voiceId;
  const key = `${voiceEngine}-${voiceId}-${language}`;
  return `${CACHE_BASE_DIR}${key}/`;
}

/** Get the voice key (for detecting changes) */
function getVoiceKey(): string {
  const { voiceEngine, settings, googleSettings, language } = useVoiceStore.getState();
  const voiceId = voiceEngine === 'google' ? googleSettings.voiceId : settings.voiceId;
  return `${voiceEngine}-${voiceId}-${language}`;
}

/** Ensure cache directory exists */
async function ensureCacheDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    console.log(`📁 Created cache dir: ${dir.replace(FileSystem.documentDirectory || '', '')}`);
  }
}

/** Load index.json from disk into memory */
async function loadDiskIndex(voiceDir: string): Promise<Record<string, string[]>> {
  const indexPath = `${voiceDir}index.json`;
  try {
    const info = await FileSystem.getInfoAsync(indexPath);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(indexPath);
    const parsed = JSON.parse(content);
    console.log(`📖 Loaded disk index: ${Object.keys(parsed).length} entries`);
    return parsed;
  } catch (e) {
    console.log(`⚠️ Failed to load disk index, starting fresh`);
    return {};
  }
}

/** Save index.json to disk (debounced) */
function scheduleSaveIndex(): void {
  indexDirty = true;
  if (saveIndexTimer) clearTimeout(saveIndexTimer);
  saveIndexTimer = setTimeout(() => {
    saveIndexTimer = null;
    flushIndex();
  }, 2000); // batch writes every 2 seconds
}

/** Immediately flush index to disk */
async function flushIndex(): Promise<void> {
  if (!indexDirty || !currentVoiceDir) return;
  try {
    const indexPath = `${currentVoiceDir}index.json`;
    await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(diskIndex));
    indexDirty = false;
  } catch (e) {
    console.log(`⚠️ Failed to save index:`, e);
  }
}

/** Generate a short random filename */
function randomFilename(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let name = '';
  for (let i = 0; i < 8; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return `${name}.mp3`;
}

/** Make cache key from text + style */
function cacheKey(text: string, style: AnnouncementStyle): string {
  return `${text}|${style}`;
}

// ─── Public API ─────────────────────────────────────────────

/** Look up a cached audio clip by its announcement text, returns a random variant */
export function getCachedAudio(text: string): string | null {
  // If voice changed since cache was loaded, everything is stale
  const currentKey = getVoiceKey();
  if (currentKey !== playbackVoiceKey) {
    console.log(`🔄 Voice changed mid-match (${playbackVoiceKey} → ${currentKey}), switching cache`);
    playbackCache.clear();
    playbackVoiceKey = currentKey;
    // Trigger async reload of new voice's disk index (won't help THIS call but will help next)
    switchVoiceCacheAsync(currentKey);
    return null;
  }

  const variants = playbackCache.get(text);
  if (variants && variants.length > 0) {
    const pick = variants[Math.floor(Math.random() * variants.length)];
    const variantLabel = variants.length > 1 ? `variant ${variants.indexOf(pick) + 1}/${variants.length}` : '1 variant';
    console.log(`⚡ CACHE HIT (${variantLabel}): "${text}"`);
    return pick;
  }
  console.log(`❌ CACHE MISS: "${text}" — will generate live`);
  return null;
}

/** Switch disk index to a new voice (async, called on mid-match voice change) */
async function switchVoiceCacheAsync(voiceKey: string): Promise<void> {
  // Cancel any in-progress background generation to prevent cross-contamination
  if (abortController) {
    console.log(`⏹️ Aborting background generation (voice switching)`);
    abortController.abort();
    abortController = null;
  }
  
  try {
    const voiceDir = `${CACHE_BASE_DIR}${voiceKey}/`;
    await ensureCacheDir(voiceDir);
    diskIndex = await loadDiskIndex(voiceDir);
    currentVoiceDir = voiceDir;
    currentVoiceKey = voiceKey;
    console.log(`🎙️ Switched to voice cache: ${voiceKey} (${Object.keys(diskIndex).length} entries on disk)`);
    
    // Pre-load any disk entries into playback cache for immediate use
    let loaded = 0;
    for (const [key, filenames] of Object.entries(diskIndex)) {
      const text = key.split('|')[0]; // extract text from "text|style" key
      if (playbackCache.has(text)) continue;
      
      const uris: string[] = [];
      for (const filename of filenames) {
        try {
          const base64 = await FileSystem.readAsStringAsync(`${voiceDir}${filename}`, { encoding: FileSystem.EncodingType.Base64 });
          uris.push(`data:audio/mpeg;base64,${base64}`);
        } catch (_) {}
      }
      if (uris.length > 0) {
        playbackCache.set(text, uris);
        loaded++;
      }
    }
    if (loaded > 0) {
      console.log(`♻️ Loaded ${loaded} entries from disk for ${voiceKey}`);
    }
    
    // If mid-match, background-generate initial entries (point scores, deuce, etc.)
    // that would normally only be created at match start via generateCache()
    if (cachedPlayerA && cachedPlayerB) {
      const lang = useVoiceStore.getState().language as LanguageCode;
      const initialEntries = buildInitialEntries(cachedPlayerA, cachedPlayerB, lang);
      
      // Filter to only entries not already on disk or in playback cache
      const missing = initialEntries.filter(entry => {
        if (playbackCache.has(entry.text)) return false;
        const key = cacheKey(entry.text, entry.style);
        return !diskIndex[key] || diskIndex[key].length === 0;
      });
      
      if (missing.length > 0) {
        console.log(`🔄 Mid-match voice switch: background-generating ${missing.length} point scores for ${voiceKey}`);
        // Small delay so the current live generation isn't competing
        setTimeout(() => {
          processEntries(missing, 1).then(() => flushIndex());
        }, 2000);
      }
    }
  } catch (e) {
    console.log(`⚠️ Failed to switch voice cache:`, e);
  }
}

/** Save a live-generated clip to cache (called by speech.ts after live generation) */
export async function saveLiveClip(text: string, style: string, base64Audio: string): Promise<void> {
  try {
    // Make sure we're pointing at the right voice directory
    const voiceKey = getVoiceKey();
    if (voiceKey !== currentVoiceKey) {
      await switchVoiceCacheAsync(voiceKey);
    }
    
    const announcementStyle = style as AnnouncementStyle;
    const key = cacheKey(text, announcementStyle);
    const existingVariants = diskIndex[key] || [];
    
    // Don't exceed max variants
    if (existingVariants.length >= MAX_VARIANTS) return;
    
    // Save to filesystem
    const filename = randomFilename();
    const filePath = `${currentVoiceDir}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, base64Audio, { encoding: FileSystem.EncodingType.Base64 });
    
    // Update disk index
    if (!diskIndex[key]) diskIndex[key] = [];
    diskIndex[key].push(filename);
    scheduleSaveIndex();
    
    // Update playback cache
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
    const existing = playbackCache.get(text) || [];
    existing.push(dataUri);
    playbackCache.set(text, existing);
    
    console.log(`💾 LIVE → SAVED: "${text}" (v${existingVariants.length + 1})`);
  } catch (e: any) {
    console.log(`⚠️ Failed to save live clip: ${e.message}`);
  }
}

/** Check if pre-caching is active */
export function isCacheReady(): boolean {
  const { isGenerating, total, completed } = useCacheStore.getState();
  return !isGenerating && total > 0 && completed > 0;
}

/** Get cache stats */
export function getCacheStats(): { cached: number; total: number; variants: number; diskEntries: number } {
  const { total, completed } = useCacheStore.getState();
  const totalVariants = Object.values(diskIndex).reduce((sum, arr) => sum + arr.length, 0);
  return { cached: completed, total, variants: totalVariants, diskEntries: Object.keys(diskIndex).length };
}

/** Clear match-specific in-memory state (keeps disk cache) */
export function clearCache() {
  playbackCache.clear();
  queuedTexts.clear();
  cachedPlayerA = '';
  cachedPlayerB = '';
  useCacheStore.setState({ isGenerating: false, total: 0, completed: 0, failed: 0 });
  console.log(`🗑️ Match cache cleared (disk cache preserved: ${Object.keys(diskIndex).length} entries)`);
}

/** Clear disk cache for current voice */
export async function clearCurrentVoiceCache(): Promise<void> {
  cancelCacheGeneration();
  playbackCache.clear();
  queuedTexts.clear();
  diskIndex = {};
  indexDirty = false;
  if (currentVoiceDir) {
    try {
      await FileSystem.deleteAsync(currentVoiceDir, { idempotent: true });
      console.log(`🗑️ Deleted disk cache for: ${currentVoiceKey}`);
    } catch (e) {
      console.log(`⚠️ Failed to delete voice cache:`, e);
    }
  }
  useCacheStore.setState({ isGenerating: false, total: 0, completed: 0, failed: 0 });
}

/** Clear ALL disk caches (all voices/languages) */
export async function clearAllCaches(): Promise<void> {
  cancelCacheGeneration();
  playbackCache.clear();
  queuedTexts.clear();
  diskIndex = {};
  indexDirty = false;
  cachedPlayerA = '';
  cachedPlayerB = '';
  try {
    await FileSystem.deleteAsync(CACHE_BASE_DIR, { idempotent: true });
    console.log('🗑️ All voice caches deleted from disk');
  } catch (e) {
    console.log(`⚠️ Failed to delete all caches:`, e);
  }
  useCacheStore.setState({ isGenerating: false, total: 0, completed: 0, failed: 0 });
}

/** Get disk usage info for all voice caches */
export async function getCacheDiskInfo(): Promise<Array<{ voiceKey: string; files: number; entries: number }>> {
  const results: Array<{ voiceKey: string; files: number; entries: number }> = [];
  try {
    const baseInfo = await FileSystem.getInfoAsync(CACHE_BASE_DIR);
    if (!baseInfo.exists) return results;
    
    const dirs = await FileSystem.readDirectoryAsync(CACHE_BASE_DIR);
    for (const dir of dirs) {
      try {
        const dirPath = `${CACHE_BASE_DIR}${dir}/`;
        const files = await FileSystem.readDirectoryAsync(dirPath);
        const mp3Count = files.filter(f => f.endsWith('.mp3')).length;
        
        // Try to read index for entry count
        let entryCount = 0;
        try {
          const idx = await FileSystem.readAsStringAsync(`${dirPath}index.json`);
          entryCount = Object.keys(JSON.parse(idx)).length;
        } catch (_) {}
        
        results.push({ voiceKey: dir, files: mp3Count, entries: entryCount });
      } catch (_) {}
    }
  } catch (_) {}
  return results;
}

/** Cancel any in-progress cache generation */
export function cancelCacheGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  useCacheStore.setState({ isGenerating: false });
  // Flush any pending index writes
  if (indexDirty) flushIndex();
  console.log('⏹️ Cache generation cancelled');
}

// ─── Main cache generation ──────────────────────────────────

/** Initial cache at match start */
export async function generateCache(playerA: string, playerB: string): Promise<void> {
  const { precacheEnabled, voiceEngine } = useVoiceStore.getState();
  
  if (!precacheEnabled) {
    console.log('💤 Pre-cache disabled');
    return;
  }
  
  if (voiceEngine === 'native') {
    console.log('💤 Pre-cache skipped (native TTS is instant)');
    return;
  }

  // Cancel any previous generation
  cancelCacheGeneration();
  clearCache();
  cachedPlayerA = playerA;
  cachedPlayerB = playerB;

  // Initialize disk cache for current voice
  const voiceKey = getVoiceKey();
  const voiceDir = getVoiceDir();
  
  if (voiceKey !== currentVoiceKey) {
    // Voice changed — load new index from disk
    await ensureCacheDir(voiceDir);
    diskIndex = await loadDiskIndex(voiceDir);
    currentVoiceDir = voiceDir;
    currentVoiceKey = voiceKey;
    console.log(`🎙️ Voice cache: ${voiceKey} (${Object.keys(diskIndex).length} entries on disk)`);
  }
  playbackVoiceKey = voiceKey;

  const lang = useVoiceStore.getState().language as LanguageCode;
  
  // Build all entries needed for match start
  const entries = buildInitialEntries(playerA, playerB, lang);
  
  // Check disk for existing clips — load into playback cache
  let diskHits = 0;
  let needVariant1: CacheEntry[] = [];
  let needVariant2: CacheEntry[] = [];
  
  for (const entry of entries) {
    const key = cacheKey(entry.text, entry.style);
    const diskVariants = diskIndex[key];
    
    if (diskVariants && diskVariants.length >= 1) {
      // Load all disk variants into playback cache
      const uris: string[] = [];
      for (const filename of diskVariants) {
        try {
          const filePath = `${currentVoiceDir}${filename}`;
          const base64 = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 });
          uris.push(`data:audio/mpeg;base64,${base64}`);
        } catch (_) {
          // File missing on disk — will re-generate
        }
      }
      
      if (uris.length > 0) {
        playbackCache.set(entry.text, uris);
        queuedTexts.add(entry.text);
        diskHits++;
        
        // If only 1 variant, queue variant 2 for background fill
        if (uris.length < MAX_VARIANTS) {
          needVariant2.push(entry);
        }
        continue;
      }
    }
    
    // No disk cache — need to generate variant 1
    needVariant1.push(entry);
  }

  console.log(`\n🎯 ════════════════════════════════════════`);
  console.log(`🎯 CACHE PLAN for "${playerA}" vs "${playerB}"`);
  console.log(`🎯 Total entries: ${entries.length}`);
  console.log(`🎯 Disk hits: ${diskHits} (loaded from filesystem)`);
  console.log(`🎯 Need variant 1: ${needVariant1.length} (new, will generate now)`);
  console.log(`🎯 Need variant 2: ${needVariant2.length} (background fill after)`);
  console.log(`🎯 ════════════════════════════════════════\n`);

  // Phase 1: Generate missing variant 1s (blocks until done — match needs these)
  if (needVariant1.length > 0) {
    await processEntries(needVariant1, 1);
  }
  
  // Flush index to disk after variant 1s
  await flushIndex();

  // Phase 2: Background-fill variant 2s (non-blocking, happens during match)
  if (needVariant2.length > 0) {
    console.log(`🔄 Background: filling ${needVariant2.length} variant 2s...`);
    // Small delay so match start announcements aren't competing for bandwidth
    setTimeout(() => {
      processEntries(needVariant2, 2).then(() => {
        flushIndex();
      });
    }, 5000);
  }
}

/** Progressive cache — call after each game to cache ahead */
export async function progressCache(
  gamesA: number, 
  gamesB: number, 
  setsPlayed: number,
  tiebreak: boolean
): Promise<void> {
  const { precacheEnabled, voiceEngine } = useVoiceStore.getState();
  if (!precacheEnabled || voiceEngine === 'native') return;
  if (!cachedPlayerA || !cachedPlayerB) return;

  const lang = useVoiceStore.getState().language as LanguageCode;
  const entries = buildProgressiveEntries(
    cachedPlayerA, cachedPlayerB, lang,
    gamesA, gamesB, setsPlayed, tiebreak
  );

  if (entries.length === 0) return;
  
  // Split into new entries vs variant 2 fills
  const needVariant1: CacheEntry[] = [];
  const needVariant2: CacheEntry[] = [];
  
  for (const entry of entries) {
    if (queuedTexts.has(entry.text)) continue; // already in playback cache
    
    const key = cacheKey(entry.text, entry.style);
    const diskVariants = diskIndex[key];
    
    if (diskVariants && diskVariants.length >= 1) {
      // Load from disk
      const uris: string[] = [];
      for (const filename of diskVariants) {
        try {
          const filePath = `${currentVoiceDir}${filename}`;
          const base64 = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 });
          uris.push(`data:audio/mpeg;base64,${base64}`);
        } catch (_) {}
      }
      if (uris.length > 0) {
        playbackCache.set(entry.text, uris);
        queuedTexts.add(entry.text);
        if (uris.length < MAX_VARIANTS) needVariant2.push(entry);
        continue;
      }
    }
    
    needVariant1.push(entry);
  }

  if (needVariant1.length > 0) {
    await processEntries(needVariant1, 1);
    await flushIndex();
  }
  
  // Background variant 2 fills
  if (needVariant2.length > 0) {
    setTimeout(() => {
      processEntries(needVariant2, 2).then(() => flushIndex());
    }, 3000);
  }
}

/** Process a batch of cache entries for a specific variant number */
async function processEntries(entries: CacheEntry[], variantNum: number): Promise<void> {
  // Filter already queued for this variant pass
  const newEntries = variantNum === 1 
    ? entries.filter(e => !queuedTexts.has(e.text))
    : entries; // variant 2: always generate even if text is queued (we want a SECOND version)
    
  if (newEntries.length === 0) return;

  if (variantNum === 1) {
    for (const e of newEntries) queuedTexts.add(e.text);
  }

  // Snapshot the voice context — if it changes mid-batch, clips get discarded
  const snapshotVoiceKey = currentVoiceKey;
  const snapshotVoiceDir = currentVoiceDir;

  const { voiceEngine } = useVoiceStore.getState();
  const label = variantNum === 1 ? 'PRE-CACHING' : 'VARIANT 2 FILL';
  console.log(`\n🔥 ════════════════════════════════════════`);
  console.log(`🔥 ${label}: ${newEntries.length} announcements (${voiceEngine}) [${snapshotVoiceKey}]`);
  console.log(`🔥 ════════════════════════════════════════`);
  
  abortController = new AbortController();
  const signal = abortController.signal;
  
  if (variantNum === 1) {
    useCacheStore.setState(s => ({
      isGenerating: true,
      total: s.total + newEntries.length,
    }));
  }

  let generated = 0;
  let i = 0;
  while (i < newEntries.length && !signal.aborted) {
    // Check if voice changed — abort this batch to prevent cross-contamination
    if (currentVoiceKey !== snapshotVoiceKey) {
      console.log(`🚫 Voice changed during batch (${snapshotVoiceKey} → ${currentVoiceKey}), aborting`);
      break;
    }
    const batch = newEntries.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(entry => 
      generateAndSaveClip(entry.text, entry.style, variantNum, signal, snapshotVoiceKey, snapshotVoiceDir).then(ok => {
        if (ok) generated++;
      })
    );
    await Promise.allSettled(promises);
    i += MAX_CONCURRENT;
  }

  if (!signal.aborted) {
    if (variantNum === 1) {
      const { completed, failed, total } = useCacheStore.getState();
      console.log(`\n✅ ════════════════════════════════════════`);
      console.log(`✅ CACHE READY: ${completed}/${total} cached, ${failed} failed`);
      console.log(`✅ Disk entries: ${Object.keys(diskIndex).length} | Playback ready: ${playbackCache.size}`);
      console.log(`✅ ════════════════════════════════════════\n`);
    } else {
      console.log(`\n✅ Variant 2 fill done: ${generated}/${newEntries.length} generated\n`);
    }
  }
  
  if (variantNum === 1) {
    useCacheStore.setState({ isGenerating: false });
  }
  abortController = null;
}

// ─── Generate + persist a single clip ───────────────────────

type AnnouncementStyle = 'score' | 'game' | 'set' | 'match' | 'dramatic' | 'calm';

async function generateAndSaveClip(
  text: string, 
  style: AnnouncementStyle,
  variantNum: number,
  signal: AbortSignal,
  expectedVoiceKey?: string,
  expectedVoiceDir?: string
): Promise<boolean> {
  if (signal.aborted) return false;
  
  // Use snapshot voice context if provided, otherwise current
  const voiceKey = expectedVoiceKey || currentVoiceKey;
  const voiceDir = expectedVoiceDir || currentVoiceDir;
  
  try {
    // Determine which engine to use based on the snapshot voice key
    const engine = voiceKey.startsWith('google') ? 'google' : voiceKey.startsWith('elevenlabs') ? 'elevenlabs' : null;
    if (!engine) return false;
    
    let audioBase64: string | null = null;

    if (engine === 'google') {
      audioBase64 = await generateGoogleClipBase64(text, style, signal);
    } else if (engine === 'elevenlabs') {
      audioBase64 = await generateElevenLabsClipBase64(text, style, signal);
    }

    if (!audioBase64 || signal.aborted) return false;

    // Verify voice hasn't changed before saving — prevents cross-contamination
    if (expectedVoiceKey && currentVoiceKey !== expectedVoiceKey) {
      console.log(`🚫 DISCARDED (voice changed): "${text}"`);
      return false;
    }

    // Save to filesystem
    const filename = randomFilename();
    const filePath = `${voiceDir}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, audioBase64, { encoding: FileSystem.EncodingType.Base64 });

    // Update disk index
    const key = cacheKey(text, style);
    if (!diskIndex[key]) diskIndex[key] = [];
    diskIndex[key].push(filename);
    scheduleSaveIndex();

    // Only update playback cache if this voice is still active
    if (currentVoiceKey === voiceKey) {
      const dataUri = `data:audio/mpeg;base64,${audioBase64}`;
      const existing = playbackCache.get(text) || [];
      existing.push(dataUri);
      playbackCache.set(text, existing);
    }

    const tag = variantNum === 1 ? '💾' : '💾²';
    console.log(`${tag} SAVED (v${variantNum}): "${text}"`);
    
    if (variantNum === 1) {
      useCacheStore.setState(s => ({ completed: s.completed + 1 }));
    }
    
    return true;
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.log(`⚠️ CACHE FAILED for "${text}": ${e.message}`);
      if (variantNum === 1) {
        useCacheStore.setState(s => ({ failed: s.failed + 1 }));
      }
    }
    return false;
  }
}

// ─── Google Cloud TTS generation ────────────────────────────

function wrapInSSML(text: string, style: AnnouncementStyle): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  switch (style) {
    case 'score':
      return `<speak><prosody rate="95%" pitch="-1st">${escaped}</prosody></speak>`;
    case 'game':
      return `<speak><prosody rate="92%" pitch="-1st"><emphasis level="moderate">${escaped.replace('...', '</emphasis><break time="400ms"/><prosody pitch="-2st">')}</prosody></prosody></speak>`;
    case 'set':
      return `<speak><prosody rate="88%" pitch="-2st" volume="+1dB"><emphasis level="strong">${escaped.replace('...', '</emphasis><break time="500ms"/>')}</prosody></speak>`;
    case 'match':
      return `<speak><prosody rate="85%" pitch="-2st" volume="+2dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    case 'dramatic':
      return `<speak><break time="200ms"/><prosody rate="90%" pitch="-1st" volume="+1dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    case 'calm':
      return `<speak><prosody rate="95%" pitch="0st">${escaped}</prosody></speak>`;
    default:
      return `<speak>${escaped}</speak>`;
  }
}

async function generateGoogleClipBase64(
  text: string, 
  style: AnnouncementStyle,
  signal: AbortSignal
): Promise<string | null> {
  const { googleSettings, googleApiKey } = useVoiceStore.getState();
  if (!googleApiKey) return null;

  const ssml = wrapInSSML(text, style);

  const response = await fetch(`${GOOGLE_TTS_API_URL}?key=${googleApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      input: { ssml },
      voice: {
        languageCode: googleSettings.voiceId.split('-').slice(0, 2).join('-'),
        name: googleSettings.voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: googleSettings.speakingRate || 1.0,
        pitch: googleSettings.pitch || 0,
        effectsProfileId: ['medium-bluetooth-speaker-class-device'],
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (!data.audioContent) return null;

  return data.audioContent; // already base64
}

// ─── ElevenLabs generation ──────────────────────────────────

function prepareTextForElevenLabs(text: string): string {
  let prepared = text.replace(/\.\.\./g, '.');
  prepared = prepared.replace(/\.\s*\./g, '.');
  prepared = prepared.trim();
  if (!/[.!?]$/.test(prepared)) prepared += '.';
  return prepared;
}

const STYLE_OFFSETS: Record<AnnouncementStyle, { stabilityOffset: number; styleOffset: number }> = {
  score:    { stabilityOffset:  0,    styleOffset:  0    },
  game:     { stabilityOffset: -0.05, styleOffset: +0.10 },
  set:      { stabilityOffset: -0.10, styleOffset: +0.20 },
  match:    { stabilityOffset: -0.15, styleOffset: +0.30 },
  dramatic: { stabilityOffset: -0.10, styleOffset: +0.25 },
  calm:     { stabilityOffset: +0.10, styleOffset: -0.10 },
};

function clamp(v: number, min = 0, max = 1) { return Math.min(max, Math.max(min, v)); }

async function generateElevenLabsClipBase64(
  text: string, 
  style: AnnouncementStyle,
  signal: AbortSignal
): Promise<string | null> {
  const { settings, elevenLabsApiKey, language } = useVoiceStore.getState();
  if (!elevenLabsApiKey) return null;

  const lang = language as LanguageCode;
  const modelId = lang === 'en' ? 'eleven_flash_v2_5' : 'eleven_multilingual_v2';
  const offsets = STYLE_OFFSETS[style] || STYLE_OFFSETS.score;
  const preparedText = prepareTextForElevenLabs(text);

  const response = await fetch(`${ELEVENLABS_API_URL}/${settings.voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
    signal,
    body: JSON.stringify({
      text: preparedText,
      model_id: modelId,
      voice_settings: {
        stability: clamp(settings.stability + offsets.stabilityOffset),
        similarity_boost: settings.similarityBoost,
        style: clamp(settings.style + offsets.styleOffset),
        use_speaker_boost: settings.useSpeakerBoost,
      },
    }),
  });

  if (!response.ok) return null;

  const arrayBuffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Build all texts to pre-cache ───────────────────────────

interface CacheEntry {
  text: string;
  style: AnnouncementStyle;
}

function pointToWord(point: number, lang: LanguageCode): string {
  if (point === 0) return t('love', lang);
  if (point === 15) return t('fifteen', lang);
  if (point === 30) return t('thirty', lang);
  if (point === 40) return t('forty', lang);
  return String(point);
}

function gameScoreWord(n: number, lang: LanguageCode): string {
  if (n === 0) return t('love', lang);
  return String(n);
}

// ─── Entry builders ─────────────────────────────────────────

function createAdder(entries: CacheEntry[], seen: Set<string>) {
  return function add(text: string, style: AnnouncementStyle) {
    if (!seen.has(text)) {
      seen.add(text);
      entries.push({ text, style });
    }
  };
}

/** Add all game-won announcement variants for a specific score */
function addGameWonEntries(
  add: (text: string, style: AnnouncementStyle) => void,
  playerA: string, playerB: string, lang: LanguageCode,
  w: number, l: number, winner: string
) {
  const loser = winner === playerA ? playerB : playerA;
  if (w === l) {
    add(`${t('game', lang)} ${winner}... ${w} ${t('gamesAll', lang)}`, 'game');
  } else {
    const leader = w > l ? winner : loser;
    add(`${t('game', lang)} ${winner}... ${leader} ${t('leads', lang)} ${gameScoreWord(Math.max(w, l), lang)} ${t('gamesTo', lang)} ${gameScoreWord(Math.min(w, l), lang)}`, 'game');
    add(`${t('game', lang)} ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'game');
  }
}

/** Match start — only point scores + first game announcements */
function buildInitialEntries(playerA: string, playerB: string, lang: LanguageCode): CacheEntry[] {
  const entries: CacheEntry[] = [];
  const seen = new Set<string>();
  const add = createAdder(entries, seen);

  // All point scores (reused every game, small fixed set)
  const pointValues = [0, 15, 30, 40];
  for (const s of pointValues) {
    for (const r of pointValues) {
      if (s === 40 && r === 40) continue;
      if (s === 0 && r === 0) continue;
      const sw = pointToWord(s, lang);
      const rw = pointToWord(r, lang);
      if (s === r) {
        add(`${sw}-${t('all', lang)}`, 'score');
      } else {
        add(`${sw}-${rw}`, 'score');
      }
    }
  }
  add(t('deuce', lang), 'score');
  add(`${t('advantage', lang)} ${playerA}`, 'score');
  add(`${t('advantage', lang)} ${playerB}`, 'score');

  // First game won (1-0)
  for (const winner of [playerA, playerB]) {
    addGameWonEntries(add, playerA, playerB, lang, 1, 0, winner);
  }

  // To serve
  add(`${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${playerB} ${t('toServe', lang)}`, 'calm');

  // First changeover (happens after game 1)
  const changeoverPhrases = [
    t('changeover', lang),
    t('playersChangeSides', lang),
    t('changeOfEnds', lang),
  ];
  const durationPhrases = [
    t('ninetySeconds', lang),
    t('ninetySecondBreak', lang),
    t('oneAndAHalfMinutes', lang),
    `90 ${t('seconds', lang)}`,
  ];
  for (const cp of changeoverPhrases) {
    for (const dp of durationPhrases) {
      add(`${cp}... ${dp}`, 'calm');
    }
  }
  add(`${t('time', lang)}... ${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${t('time', lang)}... ${playerB} ${t('toServe', lang)}`, 'calm');

  console.log(`📋 Initial cache plan: ${entries.length} entries for "${playerA}" vs "${playerB}" (${lang})`);
  return entries;
}

/** Progressive cache — look ahead 2 games from current state */
function buildProgressiveEntries(
  playerA: string, playerB: string, lang: LanguageCode,
  gamesA: number, gamesB: number, setsPlayed: number, tiebreak: boolean
): CacheEntry[] {
  const entries: CacheEntry[] = [];
  const seen = new Set<string>();
  const add = createAdder(entries, seen);

  const maxGame = Math.max(gamesA, gamesB);

  // Cache game-won announcements for next 2 possible games ahead
  const lookAhead = 2;
  const maxW = Math.min(gamesA + lookAhead, 7);
  const maxL = Math.min(gamesB + lookAhead, 7);
  
  for (const winner of [playerA, playerB]) {
    for (let w = 0; w <= maxW; w++) {
      for (let l = 0; l <= maxL; l++) {
        if (w === 0 && l === 0) continue;
        if (w < gamesA || l < gamesB) continue;
        if (w === gamesA && l === gamesB) continue;
        addGameWonEntries(add, playerA, playerB, lang, w, l, winner);
      }
    }
  }

  // When either player reaches 4+ games, cache set point
  if (maxGame >= 4) {
    add(`${t('setPoint', lang)}, ${playerA}`, 'dramatic');
    add(`${t('setPoint', lang)}, ${playerB}`, 'dramatic');
  }

  // When either player reaches 5+ games, cache set won announcements
  if (maxGame >= 5) {
    for (const winner of [playerA, playerB]) {
      for (let w = 6; w <= 7; w++) {
        for (let l = 0; l <= 6; l++) {
          if (w <= l) continue;
          add(`${t('gameAndSet', lang)}, ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'set');
          add(`${t('set', lang)} ${winner}... ${gameScoreWord(w, lang)} ${t('gamesTo', lang)} ${gameScoreWord(l, lang)}`, 'set');
        }
      }
    }
    add(`${t('setBreak', lang)}... ${t('twoMinuteBreak', lang)}`, 'calm');
    add(`${t('setBreak', lang)}... 120 ${t('seconds', lang)}`, 'calm');
    add(t('twoMinuteBreak', lang), 'calm');
  }

  // When both players reach 5+ games, cache tiebreak scores
  if (gamesA >= 5 && gamesB >= 5) {
    add(t('tiebreak', lang), 'dramatic');
    add(t('superTiebreak', lang), 'dramatic');
    for (let a = 0; a <= 7; a++) {
      for (let b = 0; b <= 7; b++) {
        if (a === 0 && b === 0) continue;
        if (a === b) {
          add(`${a}-${t('all', lang)}`, 'score');
        } else if (a > b) {
          add(`${a}-${b}`, 'score');
        } else {
          add(`${b}-${a}`, 'score');
        }
      }
    }
  }

  // In 2nd+ set, cache match point & match won
  if (setsPlayed >= 1) {
    add(`${t('matchPoint', lang)}, ${playerA}`, 'match');
    add(`${t('matchPoint', lang)}, ${playerB}`, 'match');
    add(`${t('gameSetMatch', lang)}... ${playerA} ${t('wins', lang)}`, 'match');
    add(`${t('gameSetMatch', lang)}... ${playerB} ${t('wins', lang)}`, 'match');
  }

  if (entries.length > 0) {
    console.log(`📋 Progressive cache: +${entries.length} entries (games ${gamesA}-${gamesB}, set ${setsPlayed + 1})`);
  }
  return entries;
}
