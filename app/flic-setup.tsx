import { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useFlic } from '@/lib/useFlic';
import { FlicButton } from '@/lib/flic';

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.Version;
    console.log('[Permissions] Android API level:', apiLevel);

    // Step 1: Check what's already granted
    const alreadyGranted = {
      fineLocation: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      btScan: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      btConnect: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
    };
    console.log('[Permissions] Already granted:', JSON.stringify(alreadyGranted));

    // If everything is already granted, skip requesting
    if (alreadyGranted.fineLocation && alreadyGranted.btScan && alreadyGranted.btConnect) {
      console.log('[Permissions] All permissions already granted');
      return true;
    }

    // Step 2: Request location (try fine first, fall back to coarse)
    if (!alreadyGranted.fineLocation) {
      console.log('[Permissions] Requesting fine location...');
      const locationResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      console.log('[Permissions] Fine location result:', locationResult);

      // If fine location is blocked, try coarse as fallback
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

    // Step 3: Request Bluetooth permissions
    if (!alreadyGranted.btScan || !alreadyGranted.btConnect) {
      console.log('[Permissions] Requesting Bluetooth permissions...');
      const btResults = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      console.log('[Permissions] Bluetooth results:', JSON.stringify(btResults, null, 2));
    }

    // Step 4: Final verification - need at least coarse location + BT
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
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const {
    isInitialized,
    isScanning,
    buttons,
    assignments,
    startScan,
    stopScan,
    assignButton,
    clearAssignment,
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

  const handleAssign = useCallback((player: 'A' | 'B') => {
    if (!selectedButton) return;
    assignButton(selectedButton, player);
    setSelectedButton(null);
  }, [selectedButton, assignButton]);

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

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]} style={StyleSheet.absoluteFill} />
      <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.silver} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FLIC BUTTONS</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BUTTON CONTROLS</Text>
            <View style={styles.instructionCard}>
              <View style={styles.instructionRow}>
                <View style={styles.instructionIcon}><Ionicons name="finger-print-outline" size={20} color={COLORS.greenAccent} /></View>
                <View style={styles.instructionText}><Text style={styles.instructionLabel}>Single Click</Text><Text style={styles.instructionDesc}>Score point for player</Text></View>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionIcon}><Ionicons name="copy-outline" size={20} color={COLORS.gold} /></View>
                <View style={styles.instructionText}><Text style={styles.instructionLabel}>Double Click</Text><Text style={styles.instructionDesc}>Undo last point</Text></View>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionIcon}><Ionicons name="time-outline" size={20} color={COLORS.blue} /></View>
                <View style={styles.instructionText}><Text style={styles.instructionLabel}>Long Press</Text><Text style={styles.instructionDesc}>Announce current score</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PLAYER ASSIGNMENTS</Text>
            <View style={[styles.playerCard, styles.playerCardA]}>
              <View style={styles.playerHeader}>
                <View style={styles.playerBadge}><Text style={styles.playerBadgeText}>A</Text></View>
                <Text style={styles.playerLabel}>Player A</Text>
              </View>
              {playerAButton ? (
                <View style={styles.assignedButton}>
                  <View style={styles.buttonInfo}>
                    <Ionicons name="radio-button-on" size={16} color={playerAButton.isConnected ? COLORS.greenAccent : COLORS.muted} />
                    <Text style={styles.buttonName}>{playerAButton.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => clearAssignment('A')}><Ionicons name="close-circle" size={22} color={COLORS.muted} /></TouchableOpacity>
                </View>
              ) : (<Text style={styles.noButtonText}>No button assigned</Text>)}
            </View>
            <View style={[styles.playerCard, styles.playerCardB]}>
              <View style={styles.playerHeader}>
                <View style={[styles.playerBadge, styles.playerBadgeB]}><Text style={styles.playerBadgeText}>B</Text></View>
                <Text style={styles.playerLabel}>Player B</Text>
              </View>
              {playerBButton ? (
                <View style={styles.assignedButton}>
                  <View style={styles.buttonInfo}>
                    <Ionicons name="radio-button-on" size={16} color={playerBButton.isConnected ? COLORS.greenAccent : COLORS.muted} />
                    <Text style={styles.buttonName}>{playerBButton.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => clearAssignment('B')}><Ionicons name="close-circle" size={22} color={COLORS.muted} /></TouchableOpacity>
                </View>
              ) : (<Text style={styles.noButtonText}>No button assigned</Text>)}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>AVAILABLE BUTTONS</Text>
              <TouchableOpacity style={[styles.scanBtn, isScanning && styles.scanBtnActive]} onPress={handleScanToggle}>
                {isScanning ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="bluetooth" size={18} color={COLORS.blue} />}
                <Text style={[styles.scanBtnText, isScanning && styles.scanBtnTextActive]}>{isScanning ? 'Scanning...' : 'Scan'}</Text>
              </TouchableOpacity>
            </View>

            {scanError && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color={COLORS.gold} />
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
            )}

            {!isInitialized ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.greenAccent} /><Text style={styles.loadingText}>Initializing Bluetooth...</Text></View>
            ) : buttons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bluetooth-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No Buttons Found</Text>
                <Text style={styles.emptyDesc}>Press and hold your Flic button for 8 seconds until the LED flashes, then tap Scan.</Text>
              </View>
            ) : (
              <View style={styles.buttonList}>
                {buttons.map((button) => {
                  const assignment = getButtonAssignment(button.uuid);
                  const isSelected = selectedButton === button.uuid;
                  return (
                    <TouchableOpacity key={button.uuid} style={[styles.buttonCard, isSelected && styles.buttonCardSelected, assignment && styles.buttonCardAssigned]} onPress={() => setSelectedButton(isSelected ? null : button.uuid)} onLongPress={() => handleForget(button.uuid)}>
                      <View style={styles.buttonLeft}>
                        <View style={[styles.connectionDot, button.isConnected && styles.connectionDotActive]} />
                        <View><Text style={styles.buttonCardName}>{button.name}</Text><Text style={styles.buttonCardId}>{button.serialNumber || button.uuid.slice(-8)}</Text></View>
                      </View>
                      <View style={styles.buttonRight}>
                        {assignment && <View style={[styles.assignmentBadge, assignment === 'A' ? styles.assignmentBadgeA : styles.assignmentBadgeB]}><Text style={styles.assignmentBadgeText}>{assignment}</Text></View>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {selectedButton && !getButtonAssignment(selectedButton) && (
              <View style={styles.assignActions}>
                <Text style={styles.assignLabel}>Assign to:</Text>
                <View style={styles.assignButtons}>
                  <TouchableOpacity style={[styles.assignBtn, styles.assignBtnA]} onPress={() => handleAssign('A')}><Text style={styles.assignBtnText}>Player A</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.assignBtn, styles.assignBtnB]} onPress={() => handleAssign('B')}><Text style={styles.assignBtnText}>Player B</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}><Text style={styles.helpText}>Long press a button to forget it</Text></View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  safeContent: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.muted + '20' },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
  backText: { color: COLORS.silver, fontSize: 16 },
  headerTitle: { color: COLORS.greenAccent, fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  content: { flex: 1 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.muted + '15' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 2, marginBottom: 16 },
  sectionTitleInline: { fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 2 },
  instructionCard: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 16, gap: 16 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  instructionText: { flex: 1 },
  instructionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  instructionDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  playerCard: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.muted + '20' },
  playerCardA: { borderLeftWidth: 3, borderLeftColor: COLORS.greenAccent },
  playerCardB: { borderLeftWidth: 3, borderLeftColor: COLORS.blue },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  playerBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.greenAccent, alignItems: 'center', justifyContent: 'center' },
  playerBadgeB: { backgroundColor: COLORS.blue },
  playerBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  playerLabel: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  assignedButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonName: { fontSize: 14, color: COLORS.silver },
  clearBtn: { padding: 4 },
  noButtonText: { fontSize: 14, color: COLORS.muted, fontStyle: 'italic' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.blue + '20', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  scanBtnActive: { backgroundColor: COLORS.blue },
  scanBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.blue },
  scanBtnTextActive: { color: COLORS.white },
  loadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingText: { fontSize: 14, color: COLORS.muted },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.silver },
  emptyDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.gold + '20', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: COLORS.gold, fontSize: 13, flex: 1 },
  buttonList: { gap: 10 },
  buttonCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.muted + '20' },
  buttonCardSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '10' },
  buttonCardAssigned: { opacity: 0.7 },
  buttonLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.muted },
  connectionDotActive: { backgroundColor: COLORS.greenAccent },
  buttonCardName: { fontSize: 15, fontWeight: '500', color: COLORS.white },
  buttonCardId: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  buttonRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assignmentBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  assignmentBadgeA: { backgroundColor: COLORS.greenAccent },
  assignmentBadgeB: { backgroundColor: COLORS.blue },
  assignmentBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  assignActions: { marginTop: 16, padding: 16, backgroundColor: COLORS.gold + '15', borderRadius: 12, borderWidth: 1, borderColor: COLORS.gold + '30' },
  assignLabel: { fontSize: 13, color: COLORS.gold, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  assignButtons: { flexDirection: 'row', gap: 12 },
  assignBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  assignBtnA: { backgroundColor: COLORS.greenAccent },
  assignBtnB: { backgroundColor: COLORS.blue },
  assignBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  helpText: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  bottomPadding: { height: 40 },
});
