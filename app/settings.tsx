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
import { useColors, AppColors } from '@/constants/colors';
import { useThemeStore } from '@/lib/themeStore';

// ─── Section Header ─────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Collapsible API Key ────────────────────────────────────
function ApiKeyField({ 
  value, onChangeText, linkText, onLinkPress, hint, warning, colors,
}: { 
  value: string; onChangeText: (t: string) => void;
  linkText: string; onLinkPress: () => void;
  hint?: string; warning?: string;
  colors: AppColors;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.apiKeySection}>
      <View style={[styles.apiKeyContainer, { backgroundColor: colors.bgCard, borderColor: colors.muted + '20' }]}>
        <TextInput
          style={[styles.apiKeyInput, { color: colors.white }]}
          placeholder="Enter your API key"
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.apiKeyToggle} onPress={() => setVisible(!visible)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>
      <View style={styles.apiKeyMeta}>
        <TouchableOpacity onPress={onLinkPress}>
          <Text style={[styles.apiKeyLink, { color: colors.blue }]}>{linkText}</Text>
        </TouchableOpacity>
        {hint && <Text style={[styles.apiKeyHint, { color: colors.muted }]}>{hint}</Text>}
        {warning && !value && <Text style={[styles.apiKeyWarning, { color: colors.gold }]}>{warning}</Text>}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const {
    settings,
    googleSettings,
    language,
    audioEnabled,
    stadiumEcho,
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
    setStadiumEcho,
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
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <LinearGradient colors={[c.bgPrimary, c.bgSecondary, c.bgPrimary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.muted + '20' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.silver} />
            <Text style={[styles.backText, { color: c.silver }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.greenAccent }]}>SETTINGS</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Audio Toggle */}
          <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Ionicons name="volume-high-outline" size={22} color={c.greenAccent} />
                <Text style={[styles.label, { color: c.white }]}>Score Announcements</Text>
              </View>
              <Switch
                value={audioEnabled}
                onValueChange={setAudioEnabled}
                trackColor={{ false: c.muted, true: c.greenAccent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Stadium Echo */}
          {audioEnabled && (
            <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Ionicons name="megaphone-outline" size={22} color={c.gold} />
                  <View>
                    <Text style={[styles.label, { color: c.white }]}>Stadium Echo</Text>
                    <Text style={[{ fontSize: 11, color: c.muted, marginTop: 2 }]}>Outdoor PA announcer feel</Text>
                  </View>
                </View>
                <Switch
                  value={stadiumEcho}
                  onValueChange={setStadiumEcho}
                  trackColor={{ false: c.muted, true: c.gold }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          )}

          {/* Voice Engine Selector */}
          <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
            <Text style={[styles.cellLabel, { color: c.muted }]}>ENGINE</Text>
            <View style={styles.engineGrid}>
              {([
                { key: 'native' as VoiceEngine, icon: 'phone-portrait-outline', name: 'Device', desc: 'Free', color: c.greenAccent },
                { key: 'google' as VoiceEngine, icon: 'logo-google', name: 'Google', desc: '1M free/mo', color: c.blue },
                { key: 'elevenlabs' as VoiceEngine, icon: 'sparkles-outline', name: 'ElevenLabs', desc: 'Premium', color: c.gold },
              ]).map(engine => {
                const isSelected = voiceEngine === engine.key;
                return (
                  <TouchableOpacity
                    key={engine.key}
                    style={[
                      styles.engineBtn, 
                      { backgroundColor: c.bgCard, borderColor: c.muted + '20' },
                      isSelected && { backgroundColor: engine.color + '15', borderColor: engine.color + '50' },
                    ]}
                    onPress={() => setVoiceEngine(engine.key)}
                  >
                    <Ionicons name={engine.icon as any} size={22} color={isSelected ? engine.color : c.muted} />
                    <Text style={[styles.engineName, { color: c.silver }, isSelected && { color: engine.color }]}>{engine.name}</Text>
                    <Text style={[styles.engineDesc, { color: c.muted }]}>{engine.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Native: check voices link */}
            {voiceEngine === 'native' && (
              <TouchableOpacity style={styles.inlineLink} onPress={checkVoices}>
                <Ionicons name="information-circle-outline" size={16} color={c.gold} />
                <Text style={[styles.inlineLinkText, { color: c.gold }]}>Check installed voices</Text>
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
                colors={c}
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
                colors={c}
              />
            )}
          </View>

          {/* Language */}
          <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
            <Text style={[styles.cellLabel, { color: c.muted }]}>LANGUAGE</Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const voiceCount = nativeVoiceCounts[lang.code] || 0;
                const isSelected = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageBtn,
                      { backgroundColor: c.bgCard, borderColor: c.muted + '20' },
                      isSelected && { backgroundColor: c.greenAccent + '15', borderColor: c.greenAccent + '50' },
                    ]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <View style={styles.languageInfo}>
                      <Text style={[styles.languageName, { color: c.silver }, isSelected && { color: c.white }]}>{lang.name}</Text>
                      {voiceEngine === 'native' && (
                        <Text style={[styles.languageVoiceCount, { color: c.muted }, !voiceCount && { color: c.gold }]}>
                          {voiceCount ? `${voiceCount} voices` : 'No voices!'}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={c.greenAccent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {voiceEngine === 'native' && (
              <Text style={[styles.languageHint, { color: c.muted }]}>Download voices in Settings → Accessibility → Spoken Content → Voices</Text>
            )}
          </View>

          {/* Voice + Tuning (Google) */}
          {voiceEngine === 'google' && (
            <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
              <Text style={[styles.cellLabel, { color: c.muted }]}>VOICE &amp; TUNING</Text>
              <View style={styles.voiceList}>
                {availableVoices.map((voice) => {
                  const isSelected = googleSettings.voiceId === voice.id;
                  return (
                    <TouchableOpacity
                      key={voice.id}
                      style={[
                        styles.voiceOption,
                        { backgroundColor: c.bgCard, borderColor: c.muted + '15' },
                        isSelected && { backgroundColor: c.blue + '15', borderColor: c.blue + '40' },
                      ]}
                      onPress={() => setGoogleVoiceId(voice.id)}
                    >
                      <Text style={[styles.voiceText, { color: c.silver }, isSelected && { color: c.white, fontWeight: '500' }]}>{voice.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={c.blue} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.sliderGroup, { backgroundColor: c.bgCard }]}>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Speed</Text>
                    <Text style={[styles.sliderValue, { color: c.blue }]}>{googleSettings.speakingRate.toFixed(2)}x</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0.5} maximumValue={1.5} step={0.05}
                    value={googleSettings.speakingRate} onValueChange={setGoogleSpeakingRate}
                    minimumTrackTintColor={c.blue} maximumTrackTintColor={c.muted} thumbTintColor={c.blue}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Pitch</Text>
                    <Text style={[styles.sliderValue, { color: c.blue }]}>{googleSettings.pitch.toFixed(1)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={-5} maximumValue={5} step={0.5}
                    value={googleSettings.pitch} onValueChange={setGooglePitch}
                    minimumTrackTintColor={c.blue} maximumTrackTintColor={c.muted} thumbTintColor={c.blue}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Voice + Tuning (ElevenLabs) */}
          {voiceEngine === 'elevenlabs' && (
            <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
              <Text style={[styles.cellLabel, { color: c.muted }]}>VOICE &amp; TUNING</Text>
              <View style={styles.voiceList}>
                {availableVoices.map((voice) => {
                  const isSelected = settings.voiceId === voice.id;
                  return (
                    <TouchableOpacity
                      key={voice.id}
                      style={[
                        styles.voiceOption,
                        { backgroundColor: c.bgCard, borderColor: c.muted + '15' },
                        isSelected && { backgroundColor: c.gold + '15', borderColor: c.gold + '40' },
                      ]}
                      onPress={() => setVoiceId(voice.id)}
                    >
                      <Text style={[styles.voiceText, { color: c.silver }, isSelected && { color: c.white, fontWeight: '500' }]}>{voice.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={c.gold} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.sliderGroup, { backgroundColor: c.bgCard }]}>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Stability</Text>
                    <Text style={[styles.sliderValue, { color: c.gold }]}>{settings.stability.toFixed(2)}</Text>
                  </View>
                  <Text style={[styles.sliderHint, { color: c.muted }]}>Lower = expressive · Higher = consistent</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.stability} onValueChange={setStability}
                    minimumTrackTintColor={c.greenAccent} maximumTrackTintColor={c.muted} thumbTintColor={c.gold}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Similarity</Text>
                    <Text style={[styles.sliderValue, { color: c.gold }]}>{settings.similarityBoost.toFixed(2)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.similarityBoost} onValueChange={setSimilarityBoost}
                    minimumTrackTintColor={c.greenAccent} maximumTrackTintColor={c.muted} thumbTintColor={c.gold}
                  />
                </View>
                <View style={styles.sliderRow}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Excitement</Text>
                    <Text style={[styles.sliderValue, { color: c.gold }]}>{settings.style.toFixed(2)}</Text>
                  </View>
                  <Text style={[styles.sliderHint, { color: c.muted }]}>Lower = calm · Higher = dramatic</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0} maximumValue={1} step={0.05}
                    value={settings.style} onValueChange={setStyle}
                    minimumTrackTintColor={c.greenAccent} maximumTrackTintColor={c.muted} thumbTintColor={c.gold}
                  />
                </View>

                <View style={[styles.inlineToggle, { borderTopColor: c.muted + '15' }]}>
                  <View style={styles.rowInfo}>
                    <Ionicons name="mic-outline" size={18} color={c.greenAccent} />
                    <Text style={[styles.sliderLabel, { color: c.silver }]}>Speaker Boost</Text>
                  </View>
                  <Switch
                    value={settings.useSpeakerBoost}
                    onValueChange={setUseSpeakerBoost}
                    trackColor={{ false: c.muted, true: c.greenAccent }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Test Voice */}
          {audioEnabled && (
            <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
              <TouchableOpacity style={styles.testBtn} onPress={testVoice} activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    voiceEngine === 'google' 
                      ? [c.blue, '#2563eb'] 
                      : voiceEngine === 'elevenlabs'
                        ? [c.gold, c.goldMuted]
                        : [c.greenLight, c.green]
                  }
                  style={styles.testBtnGradient}
                >
                  <Ionicons name="play" size={20} color="#ffffff" />
                  <Text style={styles.testBtnText}>Test Voice</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════════ APPEARANCE ═══════════════ */}
          <View style={[styles.cell, { borderBottomColor: c.muted + '10' }]}>
            <Text style={[styles.cellLabel, { color: c.muted }]}>APPEARANCE</Text>
            <View style={styles.themeRow}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { backgroundColor: c.bgCard, borderColor: c.muted + '20' },
                  theme === 'dark' && { backgroundColor: c.gold + '10', borderColor: c.gold + '40' },
                ]}
                onPress={() => theme !== 'dark' && toggleTheme()}
                activeOpacity={0.7}
              >
                <Ionicons name="moon-outline" size={22} color={theme === 'dark' ? c.gold : c.muted} />
                <Text style={[styles.themeOptionText, { color: c.silver }, theme === 'dark' && { color: c.white, fontWeight: '600' }]}>Dark</Text>
                {theme === 'dark' && <Ionicons name="checkmark-circle" size={16} color={c.gold} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { backgroundColor: c.bgCard, borderColor: c.muted + '20' },
                  theme === 'light' && { backgroundColor: c.gold + '10', borderColor: c.gold + '40' },
                ]}
                onPress={() => theme !== 'light' && toggleTheme()}
                activeOpacity={0.7}
              >
                <Ionicons name="sunny-outline" size={22} color={theme === 'light' ? c.gold : c.muted} />
                <Text style={[styles.themeOptionText, { color: c.silver }, theme === 'light' && { color: c.white, fontWeight: '600' }]}>Light</Text>
                {theme === 'light' && <Ionicons name="checkmark-circle" size={16} color={c.gold} />}
              </TouchableOpacity>
            </View>
            <Text style={[styles.themeHint, { color: c.muted }]}>Light mode improves visibility on sunny courts</Text>
          </View>

          {/* ═══════════════ FOOTER ═══════════════ */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: c.bgCard }]} onPress={resetToDefaults} activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={c.muted} />
              <Text style={[styles.resetBtnText, { color: c.muted }]}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeContent: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
  backText: { fontSize: 16 },
  headerTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  content: { flex: 1 },

  // ─── Section headers ─────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2,
  },

  // ─── Cell ────────────────────────────────
  cell: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cellLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 2, marginBottom: 12,
  },

  // ─── Row layout ──────────────────────────
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 16, fontWeight: '500' },

  // ─── Engine grid ─────────────────────────
  engineGrid: { flexDirection: 'row', gap: 8 },
  engineBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 12, gap: 4,
    borderWidth: 1,
  },
  engineName: { fontSize: 12, fontWeight: '600' },
  engineDesc: { fontSize: 10 },

  // ─── Inline link ─────────────────────────
  inlineLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 14, gap: 6,
  },
  inlineLinkText: { fontSize: 13 },

  // ─── API key ─────────────────────────────
  apiKeySection: { marginTop: 14 },
  apiKeyContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
  },
  apiKeyInput: { flex: 1, padding: 14, fontSize: 13, fontFamily: 'monospace' },
  apiKeyToggle: { padding: 14 },
  apiKeyMeta: { marginTop: 10, gap: 6 },
  apiKeyLink: { fontSize: 13, fontWeight: '500' },
  apiKeyHint: { fontSize: 11, lineHeight: 16 },
  apiKeyWarning: { fontSize: 12 },

  // ─── Language grid ───────────────────────
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  languageBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, gap: 10,
    borderWidth: 1,
    minWidth: '45%', flex: 1,
  },
  languageFlag: { fontSize: 22 },
  languageInfo: { flex: 1 },
  languageName: { fontSize: 14, fontWeight: '500' },
  languageVoiceCount: { fontSize: 10, marginTop: 1 },
  languageHint: { marginTop: 12, fontSize: 11, lineHeight: 16 },

  // ─── Voice list ──────────────────────────
  voiceList: { gap: 6, marginBottom: 16 },
  voiceOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 10, borderWidth: 1,
  },
  voiceText: { fontSize: 14, flex: 1 },

  // ─── Slider group ────────────────────────
  sliderGroup: {
    borderRadius: 12, padding: 14, gap: 8,
  },
  sliderRow: { paddingVertical: 4 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 13, fontWeight: '500' },
  sliderValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sliderHint: { fontSize: 10, marginTop: 1 },
  slider: { width: '100%', height: 34 },

  // ─── Inline toggle ───────────────────────
  inlineToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, marginTop: 4,
    borderTopWidth: 1,
  },

  // ─── Test button ─────────────────────────
  testBtn: { borderRadius: 12, overflow: 'hidden' },
  testBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 10,
  },
  testBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  // ─── Footer ──────────────────────────────
  footer: { padding: 20, paddingTop: 28 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  resetBtnText: { fontSize: 14, fontWeight: '500' },
  bottomPadding: { height: 40 },

  // ─── Theme toggle ───────────────────────
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, gap: 10, borderWidth: 1,
  },
  themeOptionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  themeHint: { marginTop: 10, fontSize: 11, textAlign: 'center' },
});
