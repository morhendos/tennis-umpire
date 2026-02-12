import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { 
  useVoiceStore, 
  ELEVENLABS_VOICES,
  GOOGLE_VOICES,
  LANGUAGES, 
  VoiceEngine 
} from '@/lib/voiceStore';
import { speak, getAvailableVoices } from '@/lib/speech';
import { COLORS } from '@/constants/colors';
import { useThemeStore } from '@/lib/themeStore';

// ─── Section Header ─────────────────────────────────────────
function SectionHeader({ icon, label, color = COLORS.muted }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Collapsible API Key ────────────────────────────────────
function ApiKeyField({ 
  value, onChangeText, linkText, onLinkPress, hint, warning,
}: { 
  value: string; onChangeText: (t: string) => void;
  linkText: string; onLinkPress: () => void;
  hint?: string; warning?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.apiKeySection}>
      <View style={styles.apiKeyContainer}>
        <TextInput
          style={styles.apiKeyInput}
          placeholder="Enter your API key"
          placeholderTextColor={COLORS.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.apiKeyToggle} onPress={() => setVisible(!visible)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
      <View style={styles.apiKeyMeta}>
        <TouchableOpacity onPress={onLinkPress}>
          <Text style={styles.apiKeyLink}>{linkText}</Text>
        </TouchableOpacity>
        {hint && <Text style={styles.apiKeyHint}>{hint}</Text>}
        {warning && !value && <Text style={styles.apiKeyWarning}>{warning}</Text>}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    settings,
    googleSettings,
    language,
    audioEnabled,
    voiceEngine,
    elevenLabsApiKey,
    googleApiKey,
    setVoiceId,
    setStability,
    setSimilarityBoost,
    setStyle,
    setUseSpeakerBoost,
    setGoogleVoiceId,
    setGoogleSpeakingRate,
    setGooglePitch,
    setAudioEnabled,
    setLanguage,
    setVoiceEngine,
    setElevenLabsApiKey,
    setGoogleApiKey,
    resetToDefaults,
  } = useVoiceStore();

  const { theme, toggleTheme } = useThemeStore();

  const [nativeVoiceCounts, setNativeVoiceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadVoiceCounts() {
      try {
        const voices = await getAvailableVoices();
        const counts: Record<string, number> = {};
        voices.forEach(v => {
          const lang = v.language.split('-')[0].toLowerCase();
          counts[lang] = (counts[lang] || 0) + 1;
        });
        setNativeVoiceCounts(counts);
      } catch (e) {
        console.error('Failed to load voices:', e);
      }
    }
    loadVoiceCounts();
  }, []);

  const getVoicesForEngine = () => {
    if (voiceEngine === 'elevenlabs') return ELEVENLABS_VOICES;
    if (voiceEngine === 'google') return GOOGLE_VOICES[language as keyof typeof GOOGLE_VOICES] || GOOGLE_VOICES.en;
    return [];
  };

  const availableVoices = getVoicesForEngine();

  const testVoice = () => {
    const lang = language as 'en' | 'es' | 'fr' | 'it';
    const testText = {
      en: 'Fifteen-love. Game point.',
      es: 'Quince-cero. Bola de juego.',
      fr: 'Quinze-zéro. Balle de jeu.',
      it: 'Quindici-zero. Palla gioco.',
    };
    speak(testText[lang] || testText.en);
  };

  const checkVoices = async () => {
    const voices = await getAvailableVoices();
    const byLang: Record<string, string[]> = {};
    voices.forEach(v => {
      const lang = v.language.split('-')[0].toLowerCase();
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push(`${v.name} (${v.language})`);
    });
    const langInfo = ['en', 'es', 'fr', 'it'].map(lang => {
      const count = byLang[lang]?.length || 0;
      return `${count > 0 ? '✅' : '❌'} ${lang.toUpperCase()}: ${count} voices`;
    }).join('\n');
    Alert.alert('Available Voices', `${langInfo}\n\nTo add voices:\nSettings → Accessibility → Spoken Content → Voices`, [
      { text: 'Open Settings', onPress: () => Linking.openURL('App-Prefs:ACCESSIBILITY') },
      { text: 'OK' },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.silver} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Audio Toggle */}
          <View style={styles.cell}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Ionicons name="volume-high-outline" size={22} color={COLORS.greenAccent} />
                <Text style={styles.label}>Score Announcements</Text>
              </View>
              <Switch
                value={audioEnabled}
                onValueChange={setAudioEnabled}
                trackColor={{ false: COLORS.muted, true: COLORS.greenAccent }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          {/* Voice Engine Selector */}
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>ENGINE</Text>
            <View style={styles.engineGrid}>
              {([
                { key: 'native' as VoiceEngine, icon: 'phone-portrait-outline', name: 'Device', desc: 'Free', color: COLORS.greenAccent },
                { key: 'google' as VoiceEngine, icon: 'logo-google', name: 'Google', desc: '1M free/mo', color: COLORS.blue },
                { key: 'elevenlabs' as VoiceEngine, icon: 'sparkles-outline', name: 'ElevenLabs', desc: 'Premium', color: COLORS.gold },
              ]).map(engine => {
                const isSelected = voiceEngine === engine.key;
                return (
                  <TouchableOpacity
                    key={engine.key}
                    style={[styles.engineBtn, isSelected && { backgroundColor: engine.color + '15', borderColor: engine.color + '50' }]}
                    onPress={() => setVoiceEngine(engine.key)}
                  >
                    <Ionicons name={engine.icon as any} size={22} color={isSelected ? engine.color : COLORS.muted} />
                    <Text style={[styles.engineName, isSelected && { color: engine.color }]}>{engine.name}</Text>
                    <Text style={styles.engineDesc}>{engine.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Native: check voices link */}
            {voiceEngine === 'native' && (
              <TouchableOpacity style={styles.inlineLink} onPress={checkVoices}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.gold} />
                <Text style={styles.inlineLinkText}>Check installed voices</Text>
              </TouchableOpacity>
            )}

            {/* Google: API key */}
            {voiceEngine === 'google' && (
              <ApiKeyField
                value={googleApiKey}
                onChangeText={setGoogleApiKey}
                linkText="Get API key from Google Cloud →"
                onLinkPress={() => Linking.openURL('https://console.cloud.google.com/apis/credentials')}
                hint={'Enable "Cloud Text-to-Speech API" in Console'}
                warning="No API key — will fall back to device voice"
              />
            )}

            {/* ElevenLabs: API key */}
            {voiceEngine === 'elevenlabs' && (
              <ApiKeyField
                value={elevenLabsApiKey}
                onChangeText={setElevenLabsApiKey}
                linkText="Get free API key →"
                onLinkPress={() => Linking.openURL('https://elevenlabs.io/app/settings/api-keys')}
                warning="No API key — will fall back to device voice"
              />
            )}
          </View>

          {/* Language */}
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>LANGUAGE</Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const voiceCount = nativeVoiceCounts[lang.code] || 0;
                const isSelected = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageBtn, isSelected && styles.languageBtnSelected]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <View style={styles.languageInfo}>
                      <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>{lang.name}</Text>
                      {voiceEngine === 'native' && (
                        <Text style={[styles.languageVoiceCount, !voiceCount && styles.languageVoiceCountWarning]}>
                          {voiceCount ? `${voiceCount} voices` : 'No voices!'}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.greenAccent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {voiceEngine === 'native' && (
              <Text style={styles.languageHint}>Download voices in Settings → Accessibility → Spoken Content → Voices</Text>
            )}
          </View>

          {/* Voice + Tuning (Google) */}
          {voiceEngine === 'google' && (
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>VOICE &amp; TUNING</Text>
              {/* Voice list */}
              <View style={styles.voiceList}>
                {availableVoices.map((voice) => {
                  const isSelected = googleSettings.voiceId === voice.id;
                  return (
                    <TouchableOpacity
                      key={voice.id}
                      style={[styles.voiceOption, isSelected && { backgroundColor: COLORS.blue + '15', borderColor: COLORS.blue + '40' }]}
                      onPress={() => setGoogleVoiceId(voice.id)}
                    >
                      <Text style={[styles.voiceText, isSelected && styles.voiceTextSelected]}>{voice.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.blue} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sliders */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Speed</Text>
                    <Text style={[styles.sliderValue, { color: COLORS.blue }]}>{googleSettings.speakingRate.toFixed(2)}x</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0.5} maximumValue={1.5} step={0.05}
                    value={googleSettings.speakingRate} onValueChange={setGoogleSpeakingRate}
                    minimumTrackTintColor={COLORS.blue} maximumTrackTintColor={COLORS.muted} thumbTintColor={COLORS.blue}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Pitch</Text>
                    <Text style={[styles.sliderValue, { color: COLORS.blue }]}>{googleSettings.pitch.toFixed(1)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={-5} maximumValue={5} step={0.5}
                    value={googleSettings.pitch} onValueChange={setGooglePitch}
                    minimumTrackTintColor={COLORS.blue} maximumTrackTintColor={COLORS.muted} thumbTintColor={COLORS.blue}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Voice + Tuning (ElevenLabs) */}
          {voiceEngine === 'elevenlabs' && (
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>VOICE &amp; TUNING</Text>
              {/* Voice list */}
              <View style={styles.voiceList}>
                {availableVoices.map((voice) => {
                  const isSelected = settings.voiceId === voice.id;
                  return (
                    <TouchableOpacity
                      key={voice.id}
                      style={[styles.voiceOption, isSelected && { backgroundColor: COLORS.gold + '15', borderColor: COLORS.gold + '40' }]}
                      onPress={() => setVoiceId(voice.id)}
                    >
                      <Text style={[styles.voiceText, isSelected && styles.voiceTextSelected]}>{voice.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sliders */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Stability</Text>
                    <Text style={[styles.sliderValue, { color: COLORS.gold }]}>{settings.stability.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.sliderHint}>Lower = expressive · Higher = consistent</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.stability} onValueChange={setStability}
                    minimumTrackTintColor={COLORS.greenAccent} maximumTrackTintColor={COLORS.muted} thumbTintColor={COLORS.gold}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Similarity</Text>
                    <Text style={[styles.sliderValue, { color: COLORS.gold }]}>{settings.similarityBoost.toFixed(2)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.similarityBoost} onValueChange={setSimilarityBoost}
                    minimumTrackTintColor={COLORS.greenAccent} maximumTrackTintColor={COLORS.muted} thumbTintColor={COLORS.gold}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Excitement</Text>
                    <Text style={[styles.sliderValue, { color: COLORS.gold }]}>{settings.style.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.sliderHint}>Lower = calm · Higher = dramatic</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.style} onValueChange={setStyle}
                    minimumTrackTintColor={COLORS.greenAccent} maximumTrackTintColor={COLORS.muted} thumbTintColor={COLORS.gold}
                  />
                </View>

                {/* Speaker Boost toggle */}
                <View style={styles.inlineToggle}>
                  <View style={styles.rowInfo}>
                    <Ionicons name="mic-outline" size={18} color={COLORS.greenAccent} />
                    <Text style={styles.sliderLabel}>Speaker Boost</Text>
                  </View>
                  <Switch
                    value={settings.useSpeakerBoost}
                    onValueChange={setUseSpeakerBoost}
                    trackColor={{ false: COLORS.muted, true: COLORS.greenAccent }}
                    thumbColor={COLORS.white}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Test Voice — always visible when audio is on */}
          {audioEnabled && (
            <View style={styles.cell}>
              <TouchableOpacity style={styles.testBtn} onPress={testVoice} activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    voiceEngine === 'google' 
                      ? [COLORS.blue, '#2563eb'] 
                      : voiceEngine === 'elevenlabs'
                        ? [COLORS.gold, COLORS.goldMuted]
                        : [COLORS.greenLight, COLORS.green]
                  }
                  style={styles.testBtnGradient}
                >
                  <Ionicons name="play" size={20} color={COLORS.white} />
                  <Text style={styles.testBtnText}>Test Voice</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════════ APPEARANCE ═══════════════ */}
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>APPEARANCE</Text>
            <View style={styles.themeRow}>
              <TouchableOpacity
                style={[styles.themeOption, theme === 'dark' && styles.themeOptionSelected]}
                onPress={() => theme !== 'dark' && toggleTheme()}
                activeOpacity={0.7}
              >
                <Ionicons name="moon-outline" size={22} color={theme === 'dark' ? COLORS.gold : COLORS.muted} />
                <Text style={[styles.themeOptionText, theme === 'dark' && styles.themeOptionTextSelected]}>Dark</Text>
                {theme === 'dark' && <Ionicons name="checkmark-circle" size={16} color={COLORS.gold} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeOption, theme === 'light' && styles.themeOptionSelected]}
                onPress={() => theme !== 'light' && toggleTheme()}
                activeOpacity={0.7}
              >
                <Ionicons name="sunny-outline" size={22} color={theme === 'light' ? COLORS.gold : COLORS.muted} />
                <Text style={[styles.themeOptionText, theme === 'light' && styles.themeOptionTextSelected]}>Light</Text>
                {theme === 'light' && <Ionicons name="checkmark-circle" size={16} color={COLORS.gold} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.themeHint}>Light mode improves visibility on sunny courts</Text>
          </View>

          {/* ═══════════════ FOOTER ═══════════════ */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetToDefaults} activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={COLORS.muted} />
              <Text style={styles.resetBtnText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  safeContent: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.muted + '20',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
  backText: { color: COLORS.silver, fontSize: 16 },
  headerTitle: { color: COLORS.greenAccent, fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  content: { flex: 1 },

  // ─── Section headers ─────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2,
  },

  // ─── Cell (replaces old "section") ───────
  cell: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.muted + '10',
  },
  cellLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    letterSpacing: 2, marginBottom: 12,
  },

  // ─── Row layout ──────────────────────────
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 16, color: COLORS.white, fontWeight: '500' },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  // ─── Engine grid ─────────────────────────
  engineGrid: { flexDirection: 'row', gap: 8 },
  engineBtn: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.bgCard, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.muted + '20',
  },
  engineName: { fontSize: 12, color: COLORS.silver, fontWeight: '600' },
  engineDesc: { fontSize: 10, color: COLORS.muted },

  // ─── Inline link ─────────────────────────
  inlineLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 14, gap: 6,
  },
  inlineLinkText: { color: COLORS.gold, fontSize: 13 },

  // ─── API key ─────────────────────────────
  apiKeySection: { marginTop: 14 },
  apiKeyContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.muted + '20',
  },
  apiKeyInput: { flex: 1, padding: 14, fontSize: 13, color: COLORS.white, fontFamily: 'monospace' },
  apiKeyToggle: { padding: 14 },
  apiKeyMeta: { marginTop: 10, gap: 6 },
  apiKeyLink: { color: COLORS.blue, fontSize: 13, fontWeight: '500' },
  apiKeyHint: { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  apiKeyWarning: { fontSize: 12, color: COLORS.gold },

  // ─── Language grid ───────────────────────
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  languageBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, gap: 10,
    borderWidth: 1, borderColor: COLORS.muted + '20',
    minWidth: '45%', flex: 1,
  },
  languageBtnSelected: { backgroundColor: COLORS.greenAccent + '15', borderColor: COLORS.greenAccent + '50' },
  languageFlag: { fontSize: 22 },
  languageInfo: { flex: 1 },
  languageName: { fontSize: 14, color: COLORS.silver, fontWeight: '500' },
  languageNameSelected: { color: COLORS.white },
  languageVoiceCount: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  languageVoiceCountWarning: { color: COLORS.gold },
  languageHint: { marginTop: 12, fontSize: 11, color: COLORS.muted, lineHeight: 16 },

  // ─── Voice list ──────────────────────────
  voiceList: { gap: 6, marginBottom: 16 },
  voiceOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.muted + '15',
  },
  voiceText: { fontSize: 14, color: COLORS.silver, flex: 1 },
  voiceTextSelected: { color: COLORS.white, fontWeight: '500' },

  // ─── Slider group ────────────────────────
  sliderGroup: {
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    padding: 14, gap: 8,
  },
  sliderRow: { paddingVertical: 4 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 13, color: COLORS.silver, fontWeight: '500' },
  sliderValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sliderHint: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  slider: { width: '100%', height: 34 },

  // ─── Inline toggle ───────────────────────
  inlineToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, marginTop: 4,
    borderTopWidth: 1, borderTopColor: COLORS.muted + '15',
  },

  // ─── Test button ─────────────────────────
  testBtn: { borderRadius: 12, overflow: 'hidden' },
  testBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 10,
  },
  testBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  // ─── Footer ──────────────────────────────
  footer: { padding: 20, paddingTop: 28 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  resetBtnText: { color: COLORS.muted, fontSize: 14, fontWeight: '500' },
  bottomPadding: { height: 40 },

  // ─── Theme toggle ───────────────────────
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, gap: 10,
    borderWidth: 1, borderColor: COLORS.muted + '20',
  },
  themeOptionSelected: {
    backgroundColor: COLORS.gold + '10', borderColor: COLORS.gold + '40',
  },
  themeOptionText: { fontSize: 14, color: COLORS.silver, fontWeight: '500', flex: 1 },
  themeOptionTextSelected: { color: COLORS.white, fontWeight: '600' },
  themeHint: { marginTop: 10, fontSize: 11, color: COLORS.muted, textAlign: 'center' },
});
