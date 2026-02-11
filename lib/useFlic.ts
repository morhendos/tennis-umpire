import { useEffect, useCallback, useState, useRef } from 'react';
import { flicService, FlicButton, FlicEvent, ButtonAssignments } from './flic';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASSIGNMENTS_STORAGE_KEY = 'flic-button-assignments';

interface UseFlicOptions {
  onScorePoint?: (player: 'A' | 'B') => void;
  onUndo?: () => void;
  onAnnounceScore?: () => void;
  enabled?: boolean;
}

interface UseFlicReturn {
  // State
  isInitialized: boolean;
  isScanning: boolean;
  buttons: FlicButton[];
  assignments: ButtonAssignments;
  
  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  assignButton: (buttonId: string, player: 'A' | 'B') => void;
  clearAssignment: (player: 'A' | 'B') => void;
  swapAssignments: () => void;
  forgetButton: (buttonId: string) => void;
  connectButton: (buttonId: string) => Promise<boolean>;
  refreshButtons: () => Promise<void>;
}

export function useFlic(options: UseFlicOptions = {}): UseFlicReturn {
  const { 
    onScorePoint, 
    onUndo, 
    onAnnounceScore,
    enabled = true 
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [buttons, setButtons] = useState<FlicButton[]>([]);
  const [assignments, setAssignments] = useState<ButtonAssignments>({ 
    playerA: null, 
    playerB: null 
  });

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const continuousScanRef = useRef(false);

  // Use refs for callbacks to avoid stale closures
  const onScorePointRef = useRef(onScorePoint);
  const onUndoRef = useRef(onUndo);
  const onAnnounceScoreRef = useRef(onAnnounceScore);

  useEffect(() => {
    onScorePointRef.current = onScorePoint;
    onUndoRef.current = onUndo;
    onAnnounceScoreRef.current = onAnnounceScore;
  }, [onScorePoint, onUndo, onAnnounceScore]);

  /**
   * Load saved assignments from storage
   */
  const loadAssignments = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ButtonAssignments;
        setAssignments(parsed);
        
        // Also update the service
        if (parsed.playerA) {
          flicService.assignButton(parsed.playerA, 'A');
        }
        if (parsed.playerB) {
          flicService.assignButton(parsed.playerB, 'B');
        }
      }
    } catch (error) {
      console.error('[useFlic] Failed to load assignments:', error);
    }
  }, []);

  /**
   * Save assignments to storage
   */
  const saveAssignments = useCallback(async (newAssignments: ButtonAssignments) => {
    try {
      await AsyncStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(newAssignments));
    } catch (error) {
      console.error('[useFlic] Failed to save assignments:', error);
    }
  }, []);

  /**
   * Handle button events
   */
  const handleButtonEvent = useCallback((event: FlicEvent) => {
    if (!enabled) return;

    const player = flicService.getPlayerForButton(event.buttonId);
    
    console.log('[useFlic] Button event:', {
      buttonId: event.buttonId.slice(-4),
      eventType: event.eventType,
      player,
    });

    switch (event.eventType) {
      case 'click':
        // Single click = score point (only if button is assigned)
        if (player && onScorePointRef.current) {
          onScorePointRef.current(player);
        }
        break;

      case 'doubleClick':
        // Double click = undo (any assigned button)
        if (player && onUndoRef.current) {
          onUndoRef.current();
        }
        break;

      case 'hold':
        // Long press = announce score (any assigned button)
        if (player && onAnnounceScoreRef.current) {
          onAnnounceScoreRef.current();
        }
        break;
    }
  }, [enabled]);

  /**
   * Refresh button list
   */
  const refreshButtons = useCallback(async () => {
    const btns = await flicService.refreshButtons();
    setButtons(btns);
  }, []);

  /**
   * Initialize Flic service
   */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const success = await flicService.initialize();
      if (mounted && success) {
        setIsInitialized(true);
        setButtons(flicService.getButtons());
        await loadAssignments();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadAssignments]);

  /**
   * Subscribe to button events
   */
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = flicService.addEventListener(handleButtonEvent);
    return unsubscribe;
  }, [isInitialized, handleButtonEvent]);

  /**
   * Start scanning for buttons (continuous mode - auto-restarts after each button found)
   */
  const startScan = useCallback(async () => {
    continuousScanRef.current = true;
    setIsScanning(true);
    try {
      await flicService.startScan();
      // Refresh button list periodically during scan
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(async () => {
        await refreshButtons();
      }, 2000);
    } catch (error) {
      console.error('[useFlic] Scan error:', error);
      continuousScanRef.current = false;
      setIsScanning(false);
    }
  }, [refreshButtons]);

  /**
   * Stop scanning
   */
  const stopScan = useCallback(() => {
    continuousScanRef.current = false;
    flicService.stopScan();
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
    // Refresh buttons one more time
    refreshButtons();
  }, [refreshButtons]);

  /**
   * Auto-assign a newly paired button to the first open slot
   */
  const autoAssignButton = useCallback((buttonId: string) => {
    const current = flicService.getAssignments();
    if (!current.playerA) {
      console.log('[useFlic] Auto-assigning new button to Player A');
      flicService.assignButton(buttonId, 'A');
    } else if (!current.playerB) {
      console.log('[useFlic] Auto-assigning new button to Player B');
      flicService.assignButton(buttonId, 'B');
    } else {
      console.log('[useFlic] Both slots full, skipping auto-assign');
      return;
    }
    const newAssignments = flicService.getAssignments();
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  }, [saveAssignments]);

  /**
   * Listen for scan completion — auto-assign + auto-restart if in continuous mode
   */
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = flicService.onScanComplete(async (button) => {
      // Refresh the button list with the new button
      await refreshButtons();

      // Auto-assign to first open slot
      if (button?.uuid) {
        autoAssignButton(button.uuid);
      }

      if (continuousScanRef.current) {
        // Check if both slots are now full — stop scanning
        const current = flicService.getAssignments();
        if (current.playerA && current.playerB) {
          console.log('[useFlic] Both players assigned, stopping scan');
          continuousScanRef.current = false;
          setIsScanning(false);
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          return;
        }

        // Brief pause then restart scan for next button
        console.log('[useFlic] Button found, restarting scan for more...');
        setTimeout(async () => {
          if (continuousScanRef.current) {
            try {
              await flicService.startScan();
              console.log('[useFlic] Scan restarted');
            } catch (e) {
              console.error('[useFlic] Scan restart failed:', e);
              continuousScanRef.current = false;
              setIsScanning(false);
            }
          }
        }, 1500);
      } else {
        setIsScanning(false);
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
      }
    });

    return unsubscribe;
  }, [isInitialized, refreshButtons, autoAssignButton]);

  /**
   * Assign button to player
   */
  const assignButton = useCallback((buttonId: string, player: 'A' | 'B') => {
    flicService.assignButton(buttonId, player);
    const newAssignments = flicService.getAssignments();
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  }, [saveAssignments]);

  /**
   * Clear player assignment
   */
  const clearAssignment = useCallback((player: 'A' | 'B') => {
    flicService.clearAssignment(player);
    const newAssignments = flicService.getAssignments();
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  }, [saveAssignments]);

  /**
   * Swap A/B assignments
   */
  const swapAssignments = useCallback(() => {
    const current = flicService.getAssignments();
    const oldA = current.playerA;
    const oldB = current.playerB;

    // Clear both first
    flicService.clearAssignment('A');
    flicService.clearAssignment('B');

    // Reassign swapped
    if (oldB) flicService.assignButton(oldB, 'A');
    if (oldA) flicService.assignButton(oldA, 'B');

    const newAssignments = flicService.getAssignments();
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  }, [saveAssignments]);

  /**
   * Forget (unpair) a button
   */
  const forgetButton = useCallback(async (buttonId: string) => {
    await flicService.forgetButton(buttonId);
    setButtons(flicService.getButtons());
    const newAssignments = flicService.getAssignments();
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  }, [saveAssignments]);

  /**
   * Connect to a button
   */
  const connectButton = useCallback(async (buttonId: string): Promise<boolean> => {
    const success = await flicService.connectButton(buttonId);
    if (success) {
      await refreshButtons();
    }
    return success;
  }, [refreshButtons]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return {
    isInitialized,
    isScanning,
    buttons,
    assignments,
    startScan,
    stopScan,
    assignButton,
    clearAssignment,
    swapAssignments,
    forgetButton,
    connectButton,
    refreshButtons,
  };
}
