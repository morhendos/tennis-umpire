import { Platform, NativeModules } from 'react-native';

// Flic2 native module may not be available (e.g. iOS simulator)
// Import gracefully so the app still works without Bluetooth buttons
let Flic2: any = null;
try {
  // Only attempt import on platforms that could support it
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const flic2Module = require('react-native-flic2');
    Flic2 = flic2Module.default || flic2Module;
    // Verify the native module is actually linked
    if (!NativeModules.Flic2) {
      console.log('[Flic] Native module not linked (simulator build?)');
      Flic2 = null;
    }
  }
} catch (e) {
  console.log('[Flic] Module not available:', (e as Error).message);
  Flic2 = null;
}

export type FlicButtonId = string;
export type PlayerAssignment = 'A' | 'B' | null;

export interface FlicButton {
  uuid: string;
  name: string;
  serialNumber: string;
  batteryLevel: number;
  isConnected: boolean;
  isReady: boolean;
  pressCount: number;
}

export interface ButtonAssignments {
  playerA: FlicButtonId | null;
  playerB: FlicButtonId | null;
}

export type FlicEventType = 'click' | 'doubleClick' | 'hold';

export interface FlicEvent {
  buttonId: FlicButtonId;
  eventType: FlicEventType;
  timestamp: number;
}

type FlicEventCallback = (event: FlicEvent) => void;

// Trigger mode that supports click + double-click + hold
const BUTTON_TRIGGER_MODE_CLICK_AND_DOUBLE_CLICK_AND_HOLD = 2;

class FlicService {
  private isInitialized = false;
  private isInitializing = false;
  private listenersSetUp = false;
  private buttons: Map<FlicButtonId, FlicButton> = new Map();
  private assignments: ButtonAssignments = { playerA: null, playerB: null };
  private eventListeners: Set<FlicEventCallback> = new Set();
  private scanCompletionCallbacks: Set<(button?: FlicButton) => void> = new Set();
  private _isScanning = false;

  /** Whether Flic2 native module is available */
  get isAvailable(): boolean {
    return Flic2 !== null;
  }

  async initialize(): Promise<boolean> {
    if (!Flic2) {
      console.log('[Flic] Native module not available — skipping init');
      return false;
    }
    if (this.isInitialized) return true;
    if (this.isInitializing) {
      // Wait for the other init call to finish
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (this.isInitialized) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 5000);
      });
      return this.isInitialized;
    }
    this.isInitializing = true;

    try {
      // Set up event listeners before starting (only once)
      if (!this.listenersSetUp) {
        this.setupEventListeners();
        this.listenersSetUp = true;
      }
      
      // Start the Flic 2 manager
      Flic2.start();

      // Wait for manager to initialize (with timeout fallback)
      if (!Flic2.isInitialized()) {
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          Flic2.addListener('managerInitialized', done);
          setTimeout(done, 3000);
        });
      }

      // Load existing buttons
      await this.refreshButtons();
      
      // Connect all known buttons
      Flic2.connectAllKnownButtons();

      this.isInitialized = true;
      this.isInitializing = false;
      console.log('[Flic] Service initialized');
      return true;
    } catch (error) {
      this.isInitializing = false;
      console.error('[Flic] Failed to initialize:', error);
      return false;
    }
  }

  private setupEventListeners(): void {
    // Single click
    Flic2.addListener('didReceiveButtonClick', (eventData: any) => {
      this.handleButtonEvent(eventData, 'click');
    });

    // Double click
    Flic2.addListener('didReceiveButtonDoubleClick', (eventData: any) => {
      this.handleButtonEvent(eventData, 'doubleClick');
    });

    // Hold / Long press
    Flic2.addListener('didReceiveButtonHold', (eventData: any) => {
      this.handleButtonEvent(eventData, 'hold');
    });

    // Scan result
    Flic2.addListener('scanResult', (result: any) => {
      console.log('[Flic] Scan result:', result);

      if (result.event === 'completion') {
        // Library has stopped scanning after finding a button (or error)
        this._isScanning = false;

        if (result.button && !result.error) {
          const button = this.updateButtonFromFlic2Button(result.button);
          this.setButtonMode(result.button.getUuid());
          console.log('[Flic] Button paired:', button.name);
          this.notifyScanCompletion(button);
        } else {
          console.log('[Flic] Scan completed without button, error:', result.error, 'result:', result.result);
          this.notifyScanCompletion(undefined);
        }
      } else if (result.button) {
        // Mid-scan discovery update
        this.updateButtonFromFlic2Button(result.button);
      }
    });
  }

  private handleButtonEvent(eventData: any, eventType: FlicEventType): void {
    if (!eventData.button) return;
    if (eventData.queued || eventData.age > 5) return;

    const buttonId = eventData.button.getUuid();
    this.updateButtonFromFlic2Button(eventData.button);

    const flicEvent: FlicEvent = {
      buttonId,
      eventType,
      timestamp: Date.now(),
    };

    console.log('[Flic] Button event:', eventType, buttonId.slice(-4));
    this.notifyListeners(flicEvent);
  }

  private updateButtonFromFlic2Button(flic2Button: any): FlicButton {
    const uuid = flic2Button.getUuid();
    const button: FlicButton = {
      uuid,
      name: flic2Button.getName() || 'Flic ' + uuid.slice(-4),
      serialNumber: flic2Button.getSerialNumber() || '',
      batteryLevel: flic2Button.getVoltage?.() ?? -1,
      isConnected: flic2Button.getIsReady() || false,
      isReady: flic2Button.getIsReady() || false,
      pressCount: flic2Button.getPressCount() || 0,
    };

    this.buttons.set(uuid, button);
    return button;
  }

  private async setButtonMode(uuid: string): Promise<void> {
    try {
      await Flic2.buttonSetMode(uuid, BUTTON_TRIGGER_MODE_CLICK_AND_DOUBLE_CLICK_AND_HOLD);
      console.log('[Flic] Button mode set:', uuid.slice(-4));
    } catch (error) {
      console.error('[Flic] Failed to set button mode:', error);
    }
  }

  async refreshButtons(): Promise<FlicButton[]> {
    try {
      const flic2Buttons = await Flic2.getButtons();
      for (const btn of flic2Buttons) {
        this.updateButtonFromFlic2Button(btn);
        await this.setButtonMode(btn.getUuid());
      }
      return Array.from(this.buttons.values());
    } catch (error) {
      console.error('[Flic] Failed to get buttons:', error);
      return [];
    }
  }

  async startScan(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      this._isScanning = true;
      Flic2.startScan();
      console.log('[Flic] Scan started');
    } catch (error) {
      this._isScanning = false;
      console.error('[Flic] Scan failed:', error);
      throw error;
    }
  }

  stopScan(): void {
    try {
      this._isScanning = false;
      Flic2.stopScan();
      console.log('[Flic] Scan stopped');
    } catch (error) {
      console.error('[Flic] Stop scan failed:', error);
    }
  }

  get isCurrentlyScanning(): boolean {
    return this._isScanning;
  }

  onScanComplete(callback: (button?: FlicButton) => void): () => void {
    this.scanCompletionCallbacks.add(callback);
    return () => this.scanCompletionCallbacks.delete(callback);
  }

  private notifyScanCompletion(button?: FlicButton): void {
    this.scanCompletionCallbacks.forEach(cb => {
      try { cb(button); } catch (e) { console.error('[Flic] Scan callback error:', e); }
    });
  }

  async connectButton(buttonId: FlicButtonId): Promise<boolean> {
    try {
      await Flic2.buttonConnect(buttonId);
      console.log('[Flic] Connected to button:', buttonId.slice(-4));
      await this.refreshButtons();
      return true;
    } catch (error) {
      console.error('[Flic] Connect failed:', error);
      return false;
    }
  }

  async disconnectButton(buttonId: FlicButtonId): Promise<void> {
    try {
      await Flic2.buttonDisconnect(buttonId);
    } catch (error) {
      console.error('[Flic] Disconnect failed:', error);
    }
  }

  async forgetButton(buttonId: FlicButtonId): Promise<void> {
    try {
      await Flic2.buttonForget(buttonId);
      this.buttons.delete(buttonId);
      
      if (this.assignments.playerA === buttonId) {
        this.assignments.playerA = null;
      }
      if (this.assignments.playerB === buttonId) {
        this.assignments.playerB = null;
      }
    } catch (error) {
      console.error('[Flic] Forget failed:', error);
    }
  }

  assignButton(buttonId: FlicButtonId, player: 'A' | 'B'): void {
    if (this.assignments.playerA === buttonId) {
      this.assignments.playerA = null;
    }
    if (this.assignments.playerB === buttonId) {
      this.assignments.playerB = null;
    }

    if (player === 'A') {
      this.assignments.playerA = buttonId;
    } else {
      this.assignments.playerB = buttonId;
    }

    console.log('[Flic] Button assigned:', buttonId.slice(-4), '-> Player', player);
  }

  clearAssignment(player: 'A' | 'B'): void {
    if (player === 'A') {
      this.assignments.playerA = null;
    } else {
      this.assignments.playerB = null;
    }
  }

  getAssignments(): ButtonAssignments {
    return { ...this.assignments };
  }

  getPlayerForButton(buttonId: FlicButtonId): PlayerAssignment {
    if (this.assignments.playerA === buttonId) return 'A';
    if (this.assignments.playerB === buttonId) return 'B';
    return null;
  }

  getButtons(): FlicButton[] {
    return Array.from(this.buttons.values());
  }

  getButton(buttonId: FlicButtonId): FlicButton | undefined {
    return this.buttons.get(buttonId);
  }

  addEventListener(callback: FlicEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private notifyListeners(event: FlicEvent): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[Flic] Event listener error:', error);
      }
    });
  }

  isBluetoothSupported(): boolean {
    return Flic2 !== null && (Platform.OS === 'ios' || Platform.OS === 'android');
  }

  cleanup(): void {
    this.stopScan();
    if (Flic2) {
      Flic2.disconnectAllKnownButtons();
    }
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

export const flicService = new FlicService();
