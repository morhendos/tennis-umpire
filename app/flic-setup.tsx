import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors, AppColors } from '@/constants/colors';
import { useFlic } from '@/lib/useFlic';
import { FlicButton, FlicEvent, flicService } from '@/lib/flic';

interface TestEvent {
  id: number;
  player: 'A' | 'B' | null;
  eventType: string;
  buttonName: string;
  timestamp: number;
}

function getEventMeta(eventType: string, c: AppColors) {
  const map: Record<string, { label: string; icon: string; color: string }> = {
    click:       { label: 'Single Click', icon: 'finger-print-outline', color: c.greenAccent },
    doubleClick: { label: 'Double Click', icon: 'copy-outline',         color: c.gold },
    hold:        { label: 'Long Press',   icon: 'time-outline',         color: c.blue },
  };
  return map[eventType] || { label: eventType, icon: 'help-outline', color: c.muted };
}

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.Version;
    console.log('[Permissions] Android API level:', apiLevel);

    const alreadyGranted = {
      fineLocation: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      btScan: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      btConnect: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
    };
    console.log('[Permissions] Already granted:', JSON.stringify(alreadyGranted));

    if (alreadyGranted.fineLocation && alreadyGranted.btScan && alreadyGranted.btConnect) {
      console.log('[Permissions] All permissions already granted');
      return true;
    }

    if (!alreadyGranted.fineLocation) {
      console.log('[Permissions] Requesting fine location...');
      const locationResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      console.log('[Permissions] Fine location result:', locationResult);

      if (locationResult !== 'granted') {
        const coarseGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        if (!coarseGranted) {
          console.log('[Permissions] Requesting coarse location as fallback...');
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
          );
        }
      }
    }

    if (!alreadyGranted.btScan || !alreadyGranted.btConnect) {
      console.log('[Permissions] Requesting Bluetooth permissions...');
      const btResults = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      console.log('[Permissions] Bluetooth results:', JSON.stringify(btResults, null, 2));
    }

    const finalCheck = {
      fineLocation: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      coarseLocation: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION),
      btScan: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      btConnect: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
    };
    console.log('[Permissions] Final check:', JSON.stringify(finalCheck));

    const hasLocation = finalCheck.fineLocation || finalCheck.coarseLocation;
    const hasBluetooth = finalCheck.btScan && finalCheck.btConnect;

    if (!hasLocation || !hasBluetooth) {
      const missing = [];
      if (!hasLocation) missing.push('Location');
      if (!hasBluetooth) missing.push('Bluetooth');
      console.warn('[Permissions] Missing:', missing);
      Alert.alert(
        'Permissions Required',
        `Please enable ${missing.join(' and ')} in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    console.log('[Permissions] Ready to scan \u2705',
      finalCheck.fineLocation ? '(fine location)' : '(coarse location only)'
    );
    return true;
  } catch (error) {
    console.error('[Permissions] Error:', error);
    return false;
  }
}

export default function FlicSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const [scanError, setScanError] = useState<string | null>(null);

  const {
    isInitialized,
    isScanning,
    buttons,
    assignments,
    startScan,
    stopScan,
    clearAssignment,
    swapAssignments,
    forgetButton,
  } = useFlic({});

  const handleScanToggle = useCallback(async () => {
    setScanError(null);
    if (isScanning) {
      stopScan();
    } else {
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        setScanError('Missing permissions — check the alert for details');
        return;
      }
      try {
        await startScan();
      } catch (err: any) {
        console.error('[Scan] Error:', err);
        setScanError(err?.message || 'Scan failed');
      }
    }
  }, [isScanning, startScan, stopScan]);

  const handleForget = useCallback((buttonId: string) => {
    Alert.alert(
      'Forget Button',
      'Remove this button from the app? You can pair it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forget', style: 'destructive', onPress: () => forgetButton(buttonId) },
      ]
    );
  }, [forgetButton]);

  const getButtonAssignment = (buttonId: string): 'A' | 'B' | null => {
    if (assignments.playerA === buttonId) return 'A';
    if (assignments.playerB === buttonId) return 'B';
    return null;
  };

  const getPlayerButton = (player: 'A' | 'B'): FlicButton | undefined => {
    const buttonId = player === 'A' ? assignments.playerA : assignments.playerB;
    if (!buttonId) return undefined;
    return buttons.find(b => b.uuid === buttonId);
  };

  const playerAButton = getPlayerButton('A');
  const playerBButton = getPlayerButton('B');
  const hasBothButtons = buttons.length >= 2;
  const hasAnyAssigned = !!assignments.playerA || !!assignments.playerB;

  // ─── Live test events ───────────────────
  const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
  const eventIdRef = useRef(0);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = flicService.addEventListener((event: FlicEvent) => {
      const player = flicService.getPlayerForButton(event.buttonId);
      const button = buttons.find(b => b.uuid === event.buttonId);

      const testEvent: TestEvent = {
        id: ++eventIdRef.current,
        player,
        eventType: event.eventType,
        buttonName: button?.name || event.buttonId.slice(-8),
        timestamp: Date.now(),
      };

      setTestEvents(prev => [testEvent, ...prev].slice(0, 8));

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    });

    return unsubscribe;
  }, [isInitialized, buttons, flashAnim]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <LinearGradient colors={[c.bgPrimary, c.bgSecondary, c.bgPrimary]} style={StyleSheet.absoluteFill} />
      <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: c.muted + '20' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.silver} />
            <Text style={[styles.backText, { color: c.silver }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.greenAccent }]}>FLIC BUTTONS</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.section, { borderBottomColor: c.muted + '15' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleInline, { color: c.muted }]}>AVAILABLE BUTTONS</Text>
              <TouchableOpacity 
                style={[
                  styles.scanBtn, 
                  { backgroundColor: c.blue + '20' },
                  isScanning && { backgroundColor: c.blue }, 
                  hasBothButtons && !isScanning && { backgroundColor: c.muted + '15' },
                ]} 
                onPress={handleScanToggle}
                disabled={hasBothButtons && !isScanning}
              >
                {isScanning 
                  ? <ActivityIndicator size="small" color="#ffffff" /> 
                  : <Ionicons name="bluetooth" size={18} color={hasBothButtons ? c.muted : c.blue} />
                }
                <Text style={[
                  styles.scanBtnText, 
                  { color: c.blue },
                  isScanning && { color: '#ffffff' }, 
                  hasBothButtons && !isScanning && { color: c.muted },
                ]}>
                  {isScanning ? 'Scanning...' : hasBothButtons ? 'Paired' : 'Scan'}
                </Text>
              </TouchableOpacity>
            </View>

            {scanError && (
              <View style={[styles.errorContainer, { backgroundColor: c.gold + '20' }]}>
                <Ionicons name="warning" size={20} color={c.gold} />
                <Text style={[styles.errorText, { color: c.gold }]}>{scanError}</Text>
              </View>
            )}

            {!isInitialized ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={c.greenAccent} />
                <Text style={[styles.loadingText, { color: c.muted }]}>Initializing Bluetooth...</Text>
              </View>
            ) : buttons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bluetooth-outline" size={48} color={c.muted} />
                <Text style={[styles.emptyTitle, { color: c.silver }]}>No Buttons Found</Text>
                <Text style={[styles.emptyDesc, { color: c.muted }]}>Tap Scan above, then press and hold your Flic button for 8 seconds until the LED flashes rapidly.</Text>
              </View>
            ) : (
              <View style={styles.buttonList}>
                {buttons.map((button) => {
                  const assignment = getButtonAssignment(button.uuid);
                  return (
                    <TouchableOpacity 
                      key={button.uuid} 
                      style={[styles.buttonCard, { backgroundColor: c.bgCard, borderColor: c.muted + '20' }]} 
                      onLongPress={() => handleForget(button.uuid)} 
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonLeft}>
                        <View style={[styles.connectionDot, { backgroundColor: c.muted }, button.isConnected && { backgroundColor: c.greenAccent }]} />
                        <View>
                          <Text style={[styles.buttonCardName, { color: c.white }]}>{button.name}</Text>
                          <Text style={[styles.buttonCardId, { color: c.muted }]}>{button.serialNumber || button.uuid.slice(-8)}</Text>
                        </View>
                      </View>
                      <View style={styles.buttonRight}>
                        {assignment && (
                          <View style={[styles.assignmentBadge, { backgroundColor: assignment === 'A' ? c.greenAccent : c.blue }]}>
                            <Text style={styles.assignmentBadgeText}>{assignment}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={[styles.section, { borderBottomColor: c.muted + '15' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleInline, { color: c.muted }]}>PLAYER ASSIGNMENTS</Text>
              {playerAButton && playerBButton && (
                <TouchableOpacity style={[styles.swapBtn, { backgroundColor: c.gold + '15' }]} onPress={swapAssignments} activeOpacity={0.7}>
                  <Ionicons name="swap-horizontal" size={16} color={c.gold} />
                  <Text style={[styles.swapBtnText, { color: c.gold }]}>Swap</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.playerCard, { backgroundColor: c.bgCard, borderColor: c.muted + '20', borderLeftColor: c.greenAccent }]}>
              <View style={styles.playerHeader}>
                <View style={[styles.playerBadge, { backgroundColor: c.greenAccent }]}><Text style={styles.playerBadgeText}>A</Text></View>
                <Text style={[styles.playerLabel, { color: c.white }]}>Player A</Text>
              </View>
              {playerAButton ? (
                <View style={styles.assignedButton}>
                  <View style={styles.buttonInfo}>
                    <Ionicons name="radio-button-on" size={16} color={playerAButton.isConnected ? c.greenAccent : c.muted} />
                    <Text style={[styles.buttonName, { color: c.silver }]}>{playerAButton.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => clearAssignment('A')}>
                    <Ionicons name="close-circle" size={22} color={c.muted} />
                  </TouchableOpacity>
                </View>
              ) : (<Text style={[styles.noButtonText, { color: c.muted }]}>No button assigned</Text>)}
            </View>
            <View style={[styles.playerCard, { backgroundColor: c.bgCard, borderColor: c.muted + '20', borderLeftColor: c.blue }]}>
              <View style={styles.playerHeader}>
                <View style={[styles.playerBadge, { backgroundColor: c.blue }]}><Text style={styles.playerBadgeText}>B</Text></View>
                <Text style={[styles.playerLabel, { color: c.white }]}>Player B</Text>
              </View>
              {playerBButton ? (
                <View style={styles.assignedButton}>
                  <View style={styles.buttonInfo}>
                    <Ionicons name="radio-button-on" size={16} color={playerBButton.isConnected ? c.greenAccent : c.muted} />
                    <Text style={[styles.buttonName, { color: c.silver }]}>{playerBButton.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => clearAssignment('B')}>
                    <Ionicons name="close-circle" size={22} color={c.muted} />
                  </TouchableOpacity>
                </View>
              ) : (<Text style={[styles.noButtonText, { color: c.muted }]}>No button assigned</Text>)}
            </View>
          </View>

          {/* Live Test */}
          {hasAnyAssigned && (
            <View style={[styles.section, { borderBottomColor: c.muted + '15' }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitleInline, { color: c.muted }]}>LIVE TEST</Text>
                {testEvents.length > 0 && (
                  <TouchableOpacity onPress={() => setTestEvents([])} activeOpacity={0.7}>
                    <Text style={[styles.clearEventsText, { color: c.muted }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {testEvents.length === 0 ? (
                <Animated.View style={[
                  styles.testEmptyCard,
                  { backgroundColor: c.bgCard, borderColor: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [c.muted + '20', c.greenAccent + '60'] }) },
                ]}>
                  <Ionicons name="radio-outline" size={28} color={c.muted} />
                  <Text style={[styles.testEmptyText, { color: c.silver }]}>Press a Flic button to test</Text>
                  <Text style={[styles.testEmptyHint, { color: c.muted }]}>Try single click, double click, and long press</Text>
                </Animated.View>
              ) : (
                <View style={styles.testEventList}>
                  {testEvents.map((evt, index) => {
                    const meta = getEventMeta(evt.eventType, c);
                    const isLatest = index === 0;
                    const playerColor = evt.player === 'A' ? c.greenAccent : evt.player === 'B' ? c.blue : c.muted;
                    return (
                      <View key={evt.id} style={[
                        styles.testEventRow, 
                        { backgroundColor: c.bgCard, borderColor: c.muted + '10' },
                        isLatest && { opacity: 1, borderColor: c.muted + '30' },
                      ]}>
                        <View style={[styles.testEventDot, { backgroundColor: playerColor }]} />
                        <View style={styles.testEventInfo}>
                          <View style={styles.testEventTop}>
                            <Text style={[styles.testEventPlayer, { color: playerColor }]}>
                              {evt.player ? `Player ${evt.player}` : 'Unassigned'}
                            </Text>
                            <View style={styles.testEventTypeBadge}>
                              <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                              <Text style={[styles.testEventTypeText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                          </View>
                          <Text style={[styles.testEventButton, { color: c.muted }]}>{evt.buttonName}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={[styles.section, { borderBottomColor: c.muted + '15' }]}>
            <Text style={[styles.sectionTitle, { color: c.muted }]}>BUTTON CONTROLS</Text>
            <View style={[styles.instructionCard, { backgroundColor: c.bgCard }]}>
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIcon, { backgroundColor: c.bgPrimary }]}><Ionicons name="finger-print-outline" size={20} color={c.greenAccent} /></View>
                <View style={styles.instructionText}><Text style={[styles.instructionLabel, { color: c.white }]}>Single Click</Text><Text style={[styles.instructionDesc, { color: c.muted }]}>Score point for player</Text></View>
              </View>
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIcon, { backgroundColor: c.bgPrimary }]}><Ionicons name="copy-outline" size={20} color={c.gold} /></View>
                <View style={styles.instructionText}><Text style={[styles.instructionLabel, { color: c.white }]}>Double Click</Text><Text style={[styles.instructionDesc, { color: c.muted }]}>Undo last point</Text></View>
              </View>
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIcon, { backgroundColor: c.bgPrimary }]}><Ionicons name="time-outline" size={20} color={c.blue} /></View>
                <View style={styles.instructionText}><Text style={[styles.instructionLabel, { color: c.white }]}>Long Press</Text><Text style={[styles.instructionDesc, { color: c.muted }]}>Announce current score</Text></View>
              </View>
            </View>
          </View>

          {/* Pairing Tips */}
          <View style={[styles.section, { borderBottomColor: c.muted + '15' }]}>
            <Text style={[styles.sectionTitle, { color: c.muted }]}>PAIRING TIPS</Text>
            <View style={[styles.tipCard, { backgroundColor: c.bgCard }]}>
              <View style={styles.tipRow}>
                <Text style={[styles.tipNumber, { backgroundColor: c.greenAccent + '20', color: c.greenAccent }]}>1</Text>
                <Text style={[styles.tipText, { color: c.silver }]}>Tap <Text style={[styles.tipBold, { color: c.white }]}>Scan</Text> above to start searching</Text>
              </View>
              <View style={styles.tipRow}>
                <Text style={[styles.tipNumber, { backgroundColor: c.greenAccent + '20', color: c.greenAccent }]}>2</Text>
                <Text style={[styles.tipText, { color: c.silver }]}>Press and hold the Flic button for <Text style={[styles.tipBold, { color: c.white }]}>8 seconds</Text> until the LED flashes rapidly</Text>
              </View>
              <View style={styles.tipRow}>
                <Text style={[styles.tipNumber, { backgroundColor: c.greenAccent + '20', color: c.greenAccent }]}>3</Text>
                <Text style={[styles.tipText, { color: c.silver }]}>Buttons are <Text style={[styles.tipBold, { color: c.white }]}>automatically assigned</Text> — first to Player A, second to Player B</Text>
              </View>
              <View style={styles.tipRow}>
                <Text style={[styles.tipNumber, { backgroundColor: c.greenAccent + '20', color: c.greenAccent }]}>4</Text>
                <Text style={[styles.tipText, { color: c.silver }]}>Use <Text style={[styles.tipBold, { color: c.white }]}>Swap</Text> to flip assignments if needed</Text>
              </View>
            </View>
            <Text style={[styles.helpText, { color: c.muted }]}>Long press a paired button to forget it</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
  backText: { fontSize: 16 },
  headerTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  content: { flex: 1 },
  section: { padding: 20, borderBottomWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  sectionTitleInline: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  instructionCard: { borderRadius: 12, padding: 16, gap: 16 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  instructionText: { flex: 1 },
  instructionLabel: { fontSize: 15, fontWeight: '600' },
  instructionDesc: { fontSize: 13, marginTop: 2 },
  playerCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 3 },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  playerBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playerBadgeText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  playerLabel: { fontSize: 16, fontWeight: '600' },
  assignedButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonName: { fontSize: 14 },
  clearBtn: { padding: 4 },
  noButtonText: { fontSize: 14, fontStyle: 'italic' },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  swapBtnText: { fontSize: 13, fontWeight: '600' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  scanBtnText: { fontSize: 13, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  buttonList: { gap: 10 },
  buttonCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  buttonLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectionDot: { width: 10, height: 10, borderRadius: 5 },
  buttonCardName: { fontSize: 15, fontWeight: '500' },
  buttonCardId: { fontSize: 12, marginTop: 2 },
  buttonRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assignmentBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  assignmentBadgeText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  // Live test
  clearEventsText: { fontSize: 13 },
  testEmptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8, borderRadius: 12, borderWidth: 1 },
  testEmptyText: { fontSize: 15, fontWeight: '500' },
  testEmptyHint: { fontSize: 12 },
  testEventList: { gap: 6 },
  testEventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, opacity: 0.5 },
  testEventDot: { width: 10, height: 10, borderRadius: 5 },
  testEventInfo: { flex: 1 },
  testEventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testEventPlayer: { fontSize: 14, fontWeight: '700' },
  testEventTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  testEventTypeText: { fontSize: 12, fontWeight: '600' },
  testEventButton: { fontSize: 11, marginTop: 2 },

  tipCard: { borderRadius: 12, padding: 16, gap: 14, marginBottom: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipNumber: { width: 22, height: 22, borderRadius: 11, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  tipBold: { fontWeight: '600' },
  helpText: { fontSize: 13, textAlign: 'center' },
  bottomPadding: { height: 40 },
});
