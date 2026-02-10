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

  const [showApiKey, setShowApiKey] = useState(false);
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  const [nativeVoiceCounts, setNativeVoiceCounts] = useState<Record<string, number>>({});

  // Load native voice counts on mount
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

  // Get voices for current engine and language
  const getVoicesForEngine = () => {
    if (voiceEngine === 'elevenlabs') {
      return ELEVENLABS_VOICES;
    } else if (voiceEngine === 'google') {
      return GOOGLE_VOICES[language as keyof typeof GOOGLE_VOICES] || GOOGLE_VOICES.en;
    }
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
      const status = count > 0 ? '✅' : '❌';
      return `${status} ${lang.toUpperCase()}: ${count} voices`;
    }).join('\n');
    
    Alert.alert(
      'Available Voices',
      `${langInfo}\n\nTo add voices:\nSettings → Accessibility → Spoken Content → Voices`,
      [
        { text: 'Open Settings', onPress: () => Linking.openURL('App-Prefs:ACCESSIBILITY') },
        { text: 'OK' }
      ]
    );
  };

  const openElevenLabs = () => {
    Linking.openURL('https://elevenlabs.io/app/settings/api-keys');
  };

  const openGoogleCloud = () => {
    Linking.openURL('https://console.cloud.google.com/apis/credentials');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />

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
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Ionicons name="volume-high-outline" size={22} color={COLORS.greenAccent} />
                <Text style={styles.label}>Audio Enabled</Text>
              </View>
              <Switch
                value={audioEnabled}
                onValueChange={setAudioEnabled}
                trackColor={{ false: COLORS.muted, true: COLORS.greenAccent }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          {/* Flic Buttons */}
          <TouchableOpacity 
            style={styles.section} 
            onPress={() => router.push('/flic-setup')}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Ionicons name="radio-button-on-outline" size={22} color={COLORS.blue} />
                <View>
                  <Text style={styles.label}>Flic Buttons</Text>
                  <Text style={styles.hint}>Physical clickers for scoring</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* Voice Engine */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VOICE ENGINE</Text>
            <View style={styles.engineGrid}>
              <TouchableOpacity
                style={[
                  styles.engineBtn,
                  voiceEngine === 'native' && styles.engineBtnSelected,
                ]}
                onPress={() => setVoiceEngine('native')}
              >
                <Ionicons 
                  name="phone-portrait-outline" 
                  size={24} 
                  color={voiceEngine === 'native' ? COLORS.greenAccent : COLORS.muted} 
                />
                <Text style={[
                  styles.engineName,
                  voiceEngine === 'native' && styles.engineNameSelected,
                ]}>
                  Native
                </Text>
                <Text style={styles.engineDesc}>Free</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.engineBtn,
                  voiceEngine === 'google' && styles.engineBtnSelectedGoogle,
                ]}
                onPress={() => setVoiceEngine('google')}
              >
                <Ionicons 
                  name="logo-google" 
                  size={24} 
                  color={voiceEngine === 'google' ? COLORS.blue : COLORS.muted} 
                />
                <Text style={[
                  styles.engineName,
                  voiceEngine === 'google' && styles.engineNameSelectedGoogle,
                ]}>
                  Google
                </Text>
                <Text style={styles.engineDesc}>1M free/mo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.engineBtn,
                  voiceEngine === 'elevenlabs' && styles.engineBtnSelectedGold,
                ]}
                onPress={() => setVoiceEngine('elevenlabs')}
              >
                <Ionicons 
                  name="sparkles-outline" 
                  size={24} 
                  color={voiceEngine === 'elevenlabs' ? COLORS.gold : COLORS.muted} 
                />
                <Text style={[
                  styles.engineName,
                  voiceEngine === 'elevenlabs' && styles.engineNameSelectedGold,
                ]}>
                  ElevenLabs
                </Text>
                <Text style={styles.engineDesc}>Premium</Text>
              </TouchableOpacity>
            </View>
            
            {/* Check voices button for Native TTS */}
            {voiceEngine === 'native' && (
              <TouchableOpacity style={styles.checkVoicesBtn} onPress={checkVoices}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.gold} />
                <Text style={styles.checkVoicesText}>Check installed voices</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Google Cloud API Key */}
          {voiceEngine === 'google' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GOOGLE CLOUD API KEY</Text>
              <View style={styles.apiKeyContainer}>
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Enter your API key"
                  placeholderTextColor={COLORS.muted}
                  value={googleApiKey}
                  onChangeText={setGoogleApiKey}
                  secureTextEntry={!showGoogleApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.apiKeyToggle}
                  onPress={() => setShowGoogleApiKey(!showGoogleApiKey)}
                >
                  <Ionicons 
                    name={showGoogleApiKey ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.muted} 
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.apiKeyLink} onPress={openGoogleCloud}>
                <Text style={styles.apiKeyLinkTextBlue}>Get API key from Google Cloud →</Text>
              </TouchableOpacity>
              <Text style={styles.googleHint}>
                💡 Enable &quot;Cloud Text-to-Speech API&quot; in Google Cloud Console
              </Text>
              {!googleApiKey && (
                <Text style={styles.apiKeyWarning}>
                  ⚠️ No API key - will use native TTS
                </Text>
              )}
            </View>
          )}

          {/* ElevenLabs API Key */}
          {voiceEngine === 'elevenlabs' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ELEVENLABS API KEY</Text>
              <View style={styles.apiKeyContainer}>
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Enter your API key"
                  placeholderTextColor={COLORS.muted}
                  value={elevenLabsApiKey}
                  onChangeText={setElevenLabsApiKey}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.apiKeyToggle}
                  onPress={() => setShowApiKey(!showApiKey)}
                >
                  <Ionicons 
                    name={showApiKey ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.muted} 
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.apiKeyLink} onPress={openElevenLabs}>
                <Text style={styles.apiKeyLinkText}>Get free API key →</Text>
              </TouchableOpacity>
              {!elevenLabsApiKey && (
                <Text style={styles.apiKeyWarning}>
                  ⚠️ No API key - will use native TTS
                </Text>
              )}
            </View>
          )}

          {/* Language Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LANGUAGE</Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const voiceCount = nativeVoiceCounts[lang.code] || 0;
                const hasVoices = voiceCount > 0;
                
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageBtn,
                      language === lang.code && styles.languageBtnSelected,
                    ]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <View style={styles.languageInfo}>
                      <Text style={[
                        styles.languageName,
                        language === lang.code && styles.languageNameSelected,
                      ]}>
                        {lang.name}
                      </Text>
                      {voiceEngine === 'native' && (
                        <Text style={[
                          styles.languageVoiceCount,
                          !hasVoices && styles.languageVoiceCountWarning,
                        ]}>
                          {hasVoices ? `${voiceCount} voices` : 'No voices!'}
                        </Text>
                      )}
                    </View>
                    {language === lang.code && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.greenAccent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {voiceEngine === 'native' && (
              <Text style={styles.languageHint}>
                💡 Download voices in iOS Settings → Accessibility → Spoken Content → Voices
              </Text>
            )}
          </View>

          {/* Voice Selection (for Google) */}
          {voiceEngine === 'google' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VOICE</Text>
              {availableVoices.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    googleSettings.voiceId === voice.id && styles.voiceOptionSelectedGoogle,
                  ]}
                  onPress={() => setGoogleVoiceId(voice.id)}
                >
                  <Text style={[
                    styles.voiceText,
                    googleSettings.voiceId === voice.id && styles.voiceTextSelected,
                  ]}>
                    {voice.name}
                  </Text>
                  {googleSettings.voiceId === voice.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.blue} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Google Voice Settings */}
          {voiceEngine === 'google' && (
            <>
              {/* Speaking Rate */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>Speaking Rate</Text>
                  <Text style={styles.valueBlue}>{googleSettings.speakingRate.toFixed(2)}x</Text>
                </View>
                <Text style={styles.hint}>0.25x (slow) to 4x (fast)</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={1.5}
                  step={0.05}
                  value={googleSettings.speakingRate}
                  onValueChange={setGoogleSpeakingRate}
                  minimumTrackTintColor={COLORS.blue}
                  maximumTrackTintColor={COLORS.muted}
                  thumbTintColor={COLORS.blue}
                />
              </View>

              {/* Pitch */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>Pitch</Text>
                  <Text style={styles.valueBlue}>{googleSettings.pitch.toFixed(1)}</Text>
                </View>
                <Text style={styles.hint}>-20 (low) to +20 (high)</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={-5}
                  maximumValue={5}
                  step={0.5}
                  value={googleSettings.pitch}
                  onValueChange={setGooglePitch}
                  minimumTrackTintColor={COLORS.blue}
                  maximumTrackTintColor={COLORS.muted}
                  thumbTintColor={COLORS.blue}
                />
              </View>
            </>
          )}

          {/* Voice Selection (for ElevenLabs) */}
          {voiceEngine === 'elevenlabs' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VOICE</Text>
              {availableVoices.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    settings.voiceId === voice.id && styles.voiceOptionSelected,
                  ]}
                  onPress={() => setVoiceId(voice.id)}
                >
                  <Text style={[
                    styles.voiceText,
                    settings.voiceId === voice.id && styles.voiceTextSelected,
                  ]}>
                    {voice.name}
                  </Text>
                  {settings.voiceId === voice.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.greenAccent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Voice Settings (only for ElevenLabs) */}
          {voiceEngine === 'elevenlabs' && (
            <>
              {/* Stability */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>Stability</Text>
                  <Text style={styles.value}>{settings.stability.toFixed(2)}</Text>
                </View>
                <Text style={styles.hint}>Lower = expressive · Higher = consistent</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={settings.stability}
                  onValueChange={setStability}
                  minimumTrackTintColor={COLORS.greenAccent}
                  maximumTrackTintColor={COLORS.muted}
                  thumbTintColor={COLORS.gold}
                />
              </View>

              {/* Similarity Boost */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>Similarity Boost</Text>
                  <Text style={styles.value}>{settings.similarityBoost.toFixed(2)}</Text>
                </View>
                <Text style={styles.hint}>Voice character fidelity</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={settings.similarityBoost}
                  onValueChange={setSimilarityBoost}
                  minimumTrackTintColor={COLORS.greenAccent}
                  maximumTrackTintColor={COLORS.muted}
                  thumbTintColor={COLORS.gold}
                />
              </View>

              {/* Style / Excitement */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>Style / Excitement</Text>
                  <Text style={styles.value}>{settings.style.toFixed(2)}</Text>
                </View>
                <Text style={styles.hint}>Lower = calm · Higher = dramatic</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={settings.style}
                  onValueChange={setStyle}
                  minimumTrackTintColor={COLORS.greenAccent}
                  maximumTrackTintColor={COLORS.muted}
                  thumbTintColor={COLORS.gold}
                />
              </View>

              {/* Speaker Boost */}
              <View style={styles.section}>
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Ionicons name="mic-outline" size={22} color={COLORS.greenAccent} />
                    <View>
                      <Text style={styles.label}>Speaker Boost</Text>
                      <Text style={styles.hint}>Enhanced clarity</Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.useSpeakerBoost}
                    onValueChange={setUseSpeakerBoost}
                    trackColor={{ false: COLORS.muted, true: COLORS.greenAccent }}
                    thumbColor={COLORS.white}
                  />
                </View>
              </View>
            </>
          )}

          {/* Test Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.testBtn} onPress={testVoice} activeOpacity={0.8}>
              <LinearGradient
                colors={
                  voiceEngine === 'google' 
                    ? [COLORS.blue, '#2563eb'] 
                    : [COLORS.greenLight, COLORS.green]
                }
                style={styles.testBtnGradient}
              >
                <Ionicons name="volume-high" size={22} color={COLORS.white} />
                <Text style={styles.testBtnText}>Test Voice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Reset Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetToDefaults} activeOpacity={0.7}>
              <Ionicons name="refresh" size={18} color={COLORS.muted} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  safeContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted + '20',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  backText: {
    color: COLORS.silver,
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.greenAccent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted + '15',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  value: {
    fontSize: 16,
    color: COLORS.gold,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  valueBlue: {
    fontSize: 16,
    color: COLORS.blue,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },

  // Engine selection
  engineGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  engineBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  engineBtnSelected: {
    backgroundColor: COLORS.greenAccent + '15',
    borderColor: COLORS.greenAccent + '50',
  },
  engineBtnSelectedGoogle: {
    backgroundColor: COLORS.blue + '15',
    borderColor: COLORS.blue + '50',
  },
  engineBtnSelectedGold: {
    backgroundColor: COLORS.gold + '15',
    borderColor: COLORS.gold + '50',
  },
  engineName: {
    fontSize: 13,
    color: COLORS.silver,
    fontWeight: '600',
  },
  engineNameSelected: {
    color: COLORS.white,
  },
  engineNameSelectedGoogle: {
    color: COLORS.blue,
  },
  engineNameSelectedGold: {
    color: COLORS.gold,
  },
  engineDesc: {
    fontSize: 10,
    color: COLORS.muted,
  },
  checkVoicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  checkVoicesText: {
    color: COLORS.gold,
    fontSize: 14,
  },

  // API Key
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  apiKeyInput: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    color: COLORS.white,
    fontFamily: 'monospace',
  },
  apiKeyToggle: {
    padding: 16,
  },
  apiKeyLink: {
    marginTop: 12,
  },
  apiKeyLinkText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '500',
  },
  apiKeyLinkTextBlue: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '500',
  },
  apiKeyWarning: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.gold,
  },
  googleHint: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  
  // Language grid
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
    minWidth: '45%',
    flex: 1,
  },
  languageBtnSelected: {
    backgroundColor: COLORS.greenAccent + '15',
    borderColor: COLORS.greenAccent + '50',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 15,
    color: COLORS.silver,
    fontWeight: '500',
  },
  languageNameSelected: {
    color: COLORS.white,
  },
  languageVoiceCount: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  languageVoiceCountWarning: {
    color: COLORS.gold,
  },
  languageHint: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  
  // Voice options
  voiceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.muted + '15',
  },
  voiceOptionSelected: {
    backgroundColor: COLORS.greenAccent + '15',
    borderColor: COLORS.greenAccent + '40',
  },
  voiceOptionSelectedGoogle: {
    backgroundColor: COLORS.blue + '15',
    borderColor: COLORS.blue + '40',
  },
  voiceText: {
    fontSize: 15,
    color: COLORS.silver,
    flex: 1,
  },
  voiceTextSelected: {
    color: COLORS.white,
    fontWeight: '500',
  },
  
  // Buttons
  testBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  testBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  testBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  resetBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
