import { getDB } from '@/db/dbInstance';
import { Accelerometer } from 'expo-sensors';

export type ActivityState = 'En movimiento' | 'Sedentario';

class ActivityService {
  private subscription: any = null;
  private magnitudes: number[] = [];
  private currentState: ActivityState = 'Sedentario';
  private stateStartedAt: number = Date.now();
  private activeRut: string | null = null;
  private listeners: Set<(state: ActivityState) => void> = new Set();
  private inactivityTimer: any = null;

  /**
   * Start tracking the device accelerometer.
   */
  async startTracking(rut: string): Promise<void> {
    this.activeRut = rut;
    this.currentState = 'Sedentario';
    this.stateStartedAt = Date.now();
    this.magnitudes = [];

    // Check availability
    const isAvailable = await Accelerometer.isAvailableAsync();
    if (!isAvailable) {
      console.warn('[ActivityService] Accelerometer is not available on this device.');
      // Fail gracefully and default to Sedentario
      return;
    }

    Accelerometer.setUpdateInterval(200); // 200ms sample interval (5Hz)

    this.stopTracking();

    console.log(`[ActivityService] Starting accelerometer monitoring for ${rut}`);

    this.startInactivityTimer();

    this.subscription = Accelerometer.addListener(data => {
      this.processAccelerometerData(data);
    });
  }

  /**
   * Stop tracking the accelerometer.
   */
  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('[ActivityService] Accelerometer monitoring stopped.');
    }

    // Save current active state duration if active before stopping
    if (this.activeRut) {
      this.saveStateChangeToDB(this.activeRut, this.currentState, Date.now());
    }

    this.clearInactivityTimer();
    this.activeRut = null;
  }

  /**
   * Register a listener for real-time state changes.
   */
  addListener(callback: (state: ActivityState) => void): () => void {
    this.listeners.add(callback);
    // Call immediately with current state
    callback(this.currentState);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Process incoming accelerometer readings.
   */
  private processAccelerometerData(data: { x: number; y: number; z: number }): void {
    const { x, y, z } = data;
    // Magnitude in Gs
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    this.magnitudes.push(magnitude);

    // With 200ms interval, 10 seconds of history is 50 samples
    if (this.magnitudes.length > 50) {
      this.magnitudes.shift();
    }

    // We need at least 15 samples (3 seconds of data) to classify reliably
    if (this.magnitudes.length >= 15) {
      this.classifyState();
    }
  }

  /**
   * Compute standard deviation of magnitude array to classify state.
   */
  private classifyState(): void {
    const n = this.magnitudes.length;
    const mean = this.magnitudes.reduce((sum, val) => sum + val, 0) / n;
    const variance = this.magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Threshold of 0.15G for movement classification
    const newState: ActivityState = stdDev >= 0.15 ? 'En movimiento' : 'Sedentario';

    if (newState !== this.currentState) {
      const now = Date.now();
      const previousState = this.currentState;
      const durationSeconds = Math.round((now - this.stateStartedAt) / 1000);

      console.log(`[ActivityService] State transition: ${previousState} -> ${newState} (Duration: ${durationSeconds}s)`);

      // 1. Update active state metadata
      this.currentState = newState;
      this.stateStartedAt = now;

      // Inactivity Timer logic (CP-09)
      if (newState === 'Sedentario') {
        this.startInactivityTimer();
      } else {
        this.clearInactivityTimer();
      }

      // 2. Persist the state change including duration of the previous state
      if (this.activeRut) {
        this.saveStateChangeToDB(this.activeRut, previousState, now, durationSeconds);
      }

      // 3. Notify all reactive listeners
      this.listeners.forEach(listener => listener(newState));
    }
  }

  /**
   * Save activity logs to SQLite.
   */
  private async saveStateChangeToDB(rut: string, state: ActivityState, timestampMs: number, durationSeconds?: number): Promise<void> {
    const db = getDB();
    const timestampIso = new Date(timestampMs).toISOString();
    try {
      await db.runAsync(
        "INSERT INTO actividad_registro (adulto_rut, estado, timestamp, duracion_segundos) VALUES (?, ?, ?, ?)",
        [rut, state, timestampIso, durationSeconds !== undefined ? durationSeconds : null]
      );
      console.log(`[ActivityService] Saved activity state '${state}' to DB (Duration: ${durationSeconds}s)`);
    } catch (error) {
      console.error('Error saving activity log to DB:', error);
    }
  }

  /**
   * Get the current state.
   */
  getCurrentState(): ActivityState {
    return this.currentState;
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    if (!this.activeRut) return;

    const rut = this.activeRut;
    console.log(`[ActivityService] Starting inactivity timer (15s) for ${rut}`);

    this.inactivityTimer = setTimeout(async () => {
      console.log(`[ActivityService] Inactivity alert triggered (15s sedentario) for ${rut}`);
      const db = getDB();
      const timestampIso = new Date().toISOString();
      try {
        await db.runAsync(
          "INSERT INTO alertas (tipo, pacienteId, mensaje, timestamp) VALUES (?, ?, ?, ?)",
          [
            'Inactividad Prolongada',
            rut,
            'El paciente ha permanecido inactivo por un periodo superior al recomendado.',
            timestampIso
          ]
        );
        console.log('[ActivityService] Saved CP-09 inactivity alert to SQLite.');
      } catch (err) {
        console.error('[ActivityService] Error saving inactivity alert:', err);
      }
    }, 15000);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
      console.log('[ActivityService] Inactivity timer cleared.');
    }
  }
}

export const activityService = new ActivityService();
