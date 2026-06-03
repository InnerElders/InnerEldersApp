import { getDB } from '@/db/dbInstance';
import { Platform } from 'react-native';

// Dynamic import wrapper to prevent crashes on iOS/Web where the native module is not linked
const getHealthConnectModule = () => {
  if (Platform.OS === 'android') {
    try {
      return require('react-native-health-connect');
    } catch (e) {
      console.warn('[HealthConnectService] Failed to require react-native-health-connect:', e);
      return null;
    }
  }
  return null;
};

export type ConnectionStatus = 'Desconectado' | 'Conectando' | 'Conectado';

export interface DeviceInfo {
  manufacturer: string | null;
  model: string | null;
  firmware: string | null;
  batteryLevel: number | null;
  rssi: number | null;
  connectedSince: string | null;
  discoveredServices: string[];
}

export const RecordTypes = {
  HeartRate: 'HeartRate',
  OxygenSaturation: 'OxygenSaturation'
} as const;

class HealthConnectService {
  private activeRut: string | null = null;
  private currentBpm: number | null = null;
  private currentOxygen: number | null = null;
  private currentStress: number | null = null;
  private connectionStatus: ConnectionStatus = 'Desconectado';
  private lastSyncTime: string | null = null;

  // Polling intervals
  private syncPollInterval: any = null;
  private simInterval: any = null;
  private isSimulated: boolean = false;

  // Device Info Mock for compatibility with UI
  private deviceInfo: DeviceInfo = {
    manufacturer: 'Google',
    model: 'Health Connect',
    firmware: 'Servicios de Sistema',
    batteryLevel: null,
    rssi: null,
    connectedSince: null,
    discoveredServices: ['HeartRate', 'OxygenSaturation']
  };

  // Listeners
  private bpmListeners: Set<(bpm: number | null) => void> = new Set();
  private oxygenListeners: Set<(oxygen: number | null) => void> = new Set();
  private stressListeners: Set<(stress: number | null) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private deviceInfoListeners: Set<(info: DeviceInfo) => void> = new Set();

  constructor() {
    // Empty constructor
  }

  /**
   * Check if Health Connect is supported/installed on the device.
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const hc = getHealthConnectModule();
    if (!hc) return false;

    try {
      const status = await hc.getSdkStatus();
      return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (e) {
      console.warn('[HealthConnectService] Error checking SDK status:', e);
      return false;
    }
  }

  /**
   * Initialize Health Connect.
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const hc = getHealthConnectModule();
    if (!hc) return false;

    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        this.updateStatus('Desconectado');
        return false;
      }
      const initialized = await hc.initialize();
      if (initialized) {
        this.deviceInfo.connectedSince = new Date().toISOString();
        this.notifyDeviceInfoListeners();
      }
      return initialized;
    } catch (e) {
      console.error('[HealthConnectService] Initialization failed:', e);
      this.updateStatus('Desconectado');
      return false;
    }
  }

  /**
   * Request read permissions for HeartRate and OxygenSaturation.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const hc = getHealthConnectModule();
    if (!hc) return false;

    try {
      this.updateStatus('Conectando');
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        this.updateStatus('Desconectado');
        return false;
      }

      await hc.initialize();

      const grantedPermissions = await hc.requestPermission([
        { accessType: 'read', recordType: RecordTypes.HeartRate },
        { accessType: 'read', recordType: RecordTypes.OxygenSaturation },
      ]);

      console.log('[HealthConnectService] Permissions granted:', grantedPermissions);

      // Check if both permissions were granted
      const hasHr = grantedPermissions.some((p: any) => p.recordType === RecordTypes.HeartRate);
      const hasO2 = grantedPermissions.some((p: any) => p.recordType === RecordTypes.OxygenSaturation);

      if (hasHr && hasO2) {
        this.updateStatus('Conectado');
        return true;
      } else {
        this.updateStatus('Desconectado');
        return false;
      }
    } catch (e) {
      console.error('[HealthConnectService] Error requesting permissions:', e);
      this.updateStatus('Desconectado');
      return false;
    }
  }

  /**
   * Query the latest 24 hours of data from Health Connect for HeartRate and OxygenSaturation.
   */
  /**
   * Helper function to save heart rate reading to database.
   * Includes a guard clause to return early if bpm is null/undefined to avoid DB constraints.
   */
  private async saveHeartRateToDB(
    db: any,
    rut: string,
    bpm: number | null | undefined,
    time: string | null,
    fallbackTimestamp: string
  ): Promise<void> {
    if (bpm === null || bpm === undefined) {
      return; // Return temprano para omitir el guardado
    }

    try {
      await db.runAsync(
        "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, 'ble', ?)",
        [rut, bpm, time || fallbackTimestamp]
      );
    } catch (dbErr) {
      console.error('[HealthConnectService] Error saving HR to DB:', dbErr);
    }
  }

  /**
   * CP-10: Check if heart rate is out of normal range (>118 or <55 BPM) and trigger a database alert.
   */
  private async checkHeartRateAnomaly(db: any, rut: string, bpm: number, timestamp: string): Promise<void> {
    if (bpm > 118 || bpm < 55) {
      console.log(`[HealthConnectService] Cardiac anomaly detected: ${bpm} BPM for patient ${rut}. Triggering alert...`);
      try {
        await db.runAsync(
          "INSERT INTO alertas (tipo, pacienteId, mensaje, timestamp) VALUES (?, ?, ?, ?)",
          [
            'Anomalía Cardíaca',
            rut,
            `Ritmo cardíaco anómalo detectado: ${bpm} LPM`,
            timestamp
          ]
        );
      } catch (err) {
        console.error('[HealthConnectService] Error saving cardiac anomaly alert:', err);
      }
    }
  }

  /**
   * Query the latest 24 hours of data from Health Connect for HeartRate and OxygenSaturation.
   */
  async fetchLatestHealthData(rut: string): Promise<boolean> {
    if (this.isSimulated) {
      console.log('[HealthConnectService] In simulated mode, skipping Health Connect fetch.');
      return true;
    }

    if (Platform.OS !== 'android') {
      console.warn('[HealthConnectService] Health Connect only available on Android.');
      return false;
    }

    const hc = getHealthConnectModule();
    if (!hc) return false;

    this.activeRut = rut;

    try {
      const available = await this.isAvailable();
      if (!available) return false;

      // Ensure client is initialized
      await hc.initialize();

      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours

      console.log(`[HealthConnectService] Fetching latest vitals between ${startTime} and ${endTime}...`);

      // 1. Fetch Heart Rate Records
      const hrResult = await hc.readRecords(RecordTypes.HeartRate, {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      // 2. Fetch Oxygen Saturation Records
      const o2Result = await hc.readRecords(RecordTypes.OxygenSaturation, {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      let latestBpm: number | null = null;
      let latestBpmTime: string | null = null;

      // Extract the most recent BPM reading
      if (hrResult.records && hrResult.records.length > 0) {
        // Sort records by endTime descending to check most recent records first
        const sortedRecords = [...hrResult.records].sort(
          (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        );

        for (const record of sortedRecords) {
          if (record.samples && record.samples.length > 0) {
            // Sort samples in the record by time descending
            const sortedSamples = [...record.samples].sort(
              (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
            );
            latestBpm = sortedSamples[0].beatsPerMinute;
            latestBpmTime = sortedSamples[0].time;
            break;
          }
        }
      }

      let latestOxygen: number | null = null;
      let latestOxygenTime: string | null = null;

      // Extract the most recent SpO2 reading
      if (o2Result.records && o2Result.records.length > 0) {
        // Sort records by time descending
        const sortedRecords = [...o2Result.records].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        latestOxygen = sortedRecords[0].percentage;
        latestOxygenTime = sortedRecords[0].time;
      }

      const db = getDB();
      const timestamp = new Date().toISOString();

      // Update Heart Rate if available
      if (latestBpm !== null && latestBpm !== undefined) {
        this.currentBpm = latestBpm;
        this.notifyBpmListeners(latestBpm);

        // Save to SQLite using our helper containing the guard clause
        await this.saveHeartRateToDB(db, rut, latestBpm, latestBpmTime, timestamp);

        // CP-10 Check for cardiac anomaly
        await this.checkHeartRateAnomaly(db, rut, latestBpm, timestamp);
      }

      // Update Oxygen Saturation if available
      if (latestOxygen !== null) {
        this.currentOxygen = latestOxygen;
        this.notifyOxygenListeners(latestOxygen);

        try {
          await db.runAsync(
            "INSERT INTO oxigeno_sangre (adulto_rut, porcentaje, timestamp) VALUES (?, ?, ?)",
            [rut, latestOxygen, latestOxygenTime || timestamp]
          );
        } catch (dbErr) {
          console.error('[HealthConnectService] Error saving SpO2 to DB:', dbErr);
        }
      }

      // Calculate and save Stress level
      let stressLevel = 30;
      if (latestBpm !== null) {
        if (latestBpm > 90) {
          stressLevel = Math.min(100, Math.floor(65 + Math.random() * 20)); // High stress
        } else if (latestBpm > 75) {
          stressLevel = Math.floor(40 + Math.random() * 25); // Medium stress
        } else {
          stressLevel = Math.floor(15 + Math.random() * 25); // Low stress
        }
      } else {
        stressLevel = Math.floor(20 + Math.random() * 30);
      }

      this.currentStress = stressLevel;
      this.notifyStressListeners(stressLevel);

      try {
        await db.runAsync(
          "INSERT INTO estres (userId, valor, timestamp) VALUES (?, ?, ?)",
          [rut, stressLevel, timestamp]
        );
      } catch (dbErr) {
        console.error('[HealthConnectService] Error saving Stress to DB:', dbErr);
      }

      this.lastSyncTime = timestamp;
      this.updateStatus('Conectado');
      return true;
    } catch (e) {
      console.error('[HealthConnectService] Error fetching health data:', e);
      return false;
    }
  }

  /**
   * Start polling Health Connect periodically.
   */
  startSyncPolling(rut: string): void {
    if (this.syncPollInterval || this.isSimulated) return;
    this.activeRut = rut;

    // Run first sync immediately
    this.fetchLatestHealthData(rut);

    console.log('[HealthConnectService] Starting Health Connect polling every 30 seconds...');
    this.syncPollInterval = setInterval(() => {
      this.fetchLatestHealthData(rut);
    }, 30000);
  }

  /**
   * Stop polling Health Connect.
   */
  stopSyncPolling(): void {
    if (this.syncPollInterval) {
      clearInterval(this.syncPollInterval);
      this.syncPollInterval = null;
      console.log('[HealthConnectService] Stopped Health Connect polling.');
    }
  }

  /**
   * Auto reconnect (called on app startup).
   */
  async autoReconnect(rut: string): Promise<void> {
    if (this.activeRut && this.activeRut !== rut) {
      console.log(`[HealthConnectService] Active RUT changed from ${this.activeRut} to ${rut}. Resetting service state.`);
      this.stopSyncPolling();
      this.stopSimulatedMode();
      this.currentBpm = null;
      this.currentOxygen = null;
      this.currentStress = null;
      this.notifyBpmListeners(null);
      this.notifyOxygenListeners(null);
      this.notifyStressListeners(null);
    }
    this.activeRut = rut;

    // Check if we are on Android and Health Connect is available
    const available = await this.isAvailable();
    if (available) {
      const initialized = await this.initialize();
      if (initialized) {
        this.updateStatus('Conectado');
        this.startSyncPolling(rut);
      } else {
        // Fallback to simulation if not available/initialized
        console.log('[HealthConnectService] Health Connect failed to initialize. Starting simulated mode.');
        this.startSimulatedMode(rut);
      }
    } else {
      console.log('[HealthConnectService] Health Connect not available. Starting simulated mode automatically.');
      this.startSimulatedMode(rut);
    }
  }

  /**
   * Disconnect or trigger unpair.
   */
  async disconnectDevice(): Promise<void> {
    this.stopSyncPolling();
    this.stopSimulatedMode();
    this.currentBpm = null;
    this.currentOxygen = null;
    this.currentStress = null;
    this.updateStatus('Desconectado');
    this.notifyBpmListeners(null);
    this.notifyOxygenListeners(null);
    this.notifyStressListeners(null);
  }

  async unpairDevice(rut: string): Promise<void> {
    await this.disconnectDevice();
    const db = getDB();
    try {
      await db.runAsync("DELETE FROM dispositivo_ble WHERE adulto_rut = ?", [rut]);
      console.log(`[HealthConnectService] Removed pairing metadata in DB for RUT: ${rut}`);
    } catch (e) {
      console.error('Error deleting pairing from DB:', e);
    }
  }

  /**
   * Simulation mode.
   */
  startSimulatedMode(rut: string): void {
    if (this.simInterval) return;
    this.activeRut = rut;
    this.isSimulated = true;
    this.updateStatus('Conectado');

    console.log(`[HealthConnectService] Starting Simulated Mode for RUT: ${rut}`);

    this.simInterval = setInterval(async () => {
      // 1. Simulated BPM: 72 +- 5 lpm
      const hrVariation = Math.floor(Math.random() * 11) - 5; // -5 to +5
      const bpm = 72 + hrVariation;
      this.currentBpm = bpm;
      this.notifyBpmListeners(bpm);

      // 2. Simulated SpO2: 98% (between 95% and 100%)
      const o2Variation = Math.floor(Math.random() * 4) - 2; // -2 to +1
      const oxygen = Math.max(90, Math.min(100, 98 + o2Variation));
      this.currentOxygen = oxygen;
      this.notifyOxygenListeners(oxygen);

      // 3. Simulated Stress: 0-100 (typically 20-50, occasionally spike to 80)
      const stressVariation = Math.floor(Math.random() * 15) - 7;
      let stress = 35 + stressVariation; // base 35
      if (Math.random() > 0.95) {
        stress = 80 + Math.floor(Math.random() * 15); // spike
      }
      stress = Math.max(0, Math.min(100, stress));
      this.currentStress = stress;
      this.notifyStressListeners(stress);

      const db = getDB();
      const timestamp = new Date().toISOString();

      try {
        await db.runAsync(
          "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, 'simulado', ?)",
          [rut, bpm, timestamp]
        );
        // CP-10 Check for cardiac anomaly in simulated mode
        await this.checkHeartRateAnomaly(db, rut, bpm, timestamp);
      } catch (error) {
        console.error('Error saving simulated HR to DB:', error);
      }

      try {
        await db.runAsync(
          "INSERT INTO oxigeno_sangre (adulto_rut, porcentaje, timestamp) VALUES (?, ?, ?)",
          [rut, oxygen, timestamp]
        );
      } catch (error) {
        console.error('Error saving simulated SpO2 to DB:', error);
      }

      try {
        await db.runAsync(
          "INSERT INTO estres (userId, valor, timestamp) VALUES (?, ?, ?)",
          [rut, stress, timestamp]
        );
      } catch (error) {
        console.error('Error saving simulated Stress to DB:', error);
      }
    }, 3000);
  }

  stopSimulatedMode(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.isSimulated = false;
    console.log('[HealthConnectService] Stopped Simulated Mode.');
  }

  // Getters & Setters
  getIsSimulated(): boolean {
    return this.isSimulated;
  }

  getCurrentBpm(): number | null {
    return this.currentBpm;
  }

  getCurrentOxygen(): number | null {
    return this.currentOxygen;
  }

  getCurrentStress(): number | null {
    return this.currentStress;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  // Listeners registration
  addBpmListener(callback: (bpm: number | null) => void): () => void {
    this.bpmListeners.add(callback);
    callback(this.currentBpm);
    return () => this.bpmListeners.delete(callback);
  }

  addOxygenListener(callback: (oxygen: number | null) => void): () => void {
    this.oxygenListeners.add(callback);
    callback(this.currentOxygen);
    return () => this.oxygenListeners.delete(callback);
  }

  addStressListener(callback: (stress: number | null) => void): () => void {
    this.stressListeners.add(callback);
    callback(this.currentStress);
    return () => this.stressListeners.delete(callback);
  }

  addStatusListener(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);
    return () => this.statusListeners.delete(callback);
  }

  addDeviceInfoListener(callback: (info: DeviceInfo) => void): () => void {
    this.deviceInfoListeners.add(callback);
    callback({ ...this.deviceInfo });
    return () => this.deviceInfoListeners.delete(callback);
  }

  private notifyBpmListeners(bpm: number | null): void {
    this.bpmListeners.forEach(listener => listener(bpm));
  }

  private notifyOxygenListeners(oxygen: number | null): void {
    this.oxygenListeners.forEach(listener => listener(oxygen));
  }

  private notifyStressListeners(stress: number | null): void {
    this.stressListeners.forEach(listener => listener(stress));
  }

  private notifyDeviceInfoListeners(): void {
    this.deviceInfoListeners.forEach(listener => listener({ ...this.deviceInfo }));
  }

  private updateStatus(newStatus: ConnectionStatus): void {
    this.connectionStatus = newStatus;
    this.statusListeners.forEach(listener => listener(newStatus));
  }
}

export const healthConnectService = new HealthConnectService();
