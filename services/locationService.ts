import * as Location from 'expo-location';
import { getDB } from '@/db/dbInstance';

// Default interval of 15 minutes (15 * 60 * 1000 ms)
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

class LocationService {
  private intervalId: any = null;
  private currentIntervalMs: number = DEFAULT_INTERVAL_MS;
  private activeRut: string | null = null;

  /**
   * Request location permissions from the device.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get the current GPS location with Balanced accuracy (better battery usage).
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Location permission denied.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Log the current location to the gps_registro database table.
   */
  async logLocationToDB(rut: string, latitude: number, longitude: number): Promise<void> {
    const db = getDB();
    const timestamp = new Date().toISOString();
    try {
      await db.runAsync(
        "INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)",
        [rut, latitude, longitude, timestamp]
      );
      console.log(`[LocationService] Logged GPS coordinate for ${rut}: (${latitude}, ${longitude})`);
    } catch (error) {
      console.error('Error saving GPS coordinate to DB:', error);
    }
  }

  /**
   * Start tracking the location periodically.
   */
  async startTracking(rut: string, customIntervalMs?: number): Promise<void> {
    this.activeRut = rut;
    if (customIntervalMs) {
      this.currentIntervalMs = customIntervalMs;
    }

    // Stop any existing tracking loop first
    this.stopTracking();

    console.log(`[LocationService] Starting periodic tracking for ${rut} every ${this.currentIntervalMs / 1000}s`);

    // Perform immediate first capture
    this.captureAndSave();

    // Set up the periodic interval loop
    this.intervalId = setInterval(() => {
      this.captureAndSave();
    }, this.currentIntervalMs);
  }

  /**
   * Perform a single location capture and save it.
   */
  private async captureAndSave(): Promise<void> {
    if (!this.activeRut) return;

    const location = await this.getCurrentLocation();
    if (location) {
      const { latitude, longitude } = location.coords;
      await this.logLocationToDB(this.activeRut, latitude, longitude);
    }
  }

  /**
   * Stop the periodic tracking loop.
   */
  stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[LocationService] Periodic tracking stopped.');
    }
    this.activeRut = null;
  }

  /**
   * Get the current tracking interval.
   */
  getInterval(): number {
    return this.currentIntervalMs;
  }

  /**
   * Update the tracking interval dynamically.
   */
  async updateInterval(rut: string, newIntervalMs: number): Promise<void> {
    console.log(`[LocationService] Updating tracking interval to ${newIntervalMs / 1000}s`);
    this.currentIntervalMs = newIntervalMs;
    if (this.activeRut === rut) {
      // Re-trigger with new interval
      await this.startTracking(rut, newIntervalMs);
    }
  }
}

export const locationService = new LocationService();
