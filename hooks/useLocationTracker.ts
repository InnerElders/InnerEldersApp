import { useEffect } from 'react';
import * as Location from 'expo-location';
import { getDB } from '@/db/dbInstance';

export function useLocationTracker(adultoRut: string | null) {
  useEffect(() => {
    if (!adultoRut) return;

    let intervalId: ReturnType<typeof setInterval>;

    const saveLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[LocationTracker] Permission denied for adulto:', adultoRut);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = location.coords;
        const timestamp = new Date().toISOString();
        const db = getDB();
        await db.runAsync(
          'INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)',
          [adultoRut, latitude, longitude, timestamp]
        );
        console.log('[LocationTracker] Location saved for', adultoRut, latitude, longitude);
      } catch (error) {
        console.error('[LocationTracker] Error saving location:', error);
      }
    };

    saveLocation(); // Save immediately on mount
    intervalId = setInterval(saveLocation, 5 * 60 * 1000); // Then every 5 minutes

    return () => clearInterval(intervalId);
  }, [adultoRut]);
}
