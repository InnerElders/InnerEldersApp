import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getDB } from '@/db/dbInstance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let MapView: any;
let Marker: any;
let Circle: any;

if (Platform.OS === 'web') {
  const WebMapMock = ({ children, style }: any) => {
    return (
      <View style={[style, styles.webMapContainer]}>
        <Feather name="map" size={44} color="#10b981" style={{ marginBottom: 8 }} />
        <Text style={styles.webMapTitle}>Mapa de Última Ubicación</Text>
        <Text style={styles.webMapSubtitle}>
          Simulado en versión Web · Listo para teléfonos móviles 📱
        </Text>
        {children}
      </View>
    );
  };
  const WebMarkerMock = ({ children }: any) => <View>{children}</View>;
  const WebCircleMock = () => null;

  MapView = WebMapMock;
  Marker = WebMarkerMock;
  Circle = WebCircleMock;
} else {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
}

interface PacienteUbicacion {
  rut: string;
  nombres: string;
  apellidos: string;
  latitud: number | null;
  longitud: number | null;
  timestamp: string | null;
  latitud_segura?: number;
  longitud_segura?: number;
  radio_seguro?: number;
}

export default function UltimaUbicacionScreen() {
  const insets = useSafeAreaInsets();
  const { userSession } = useAuth();
  const caregiverRut = userSession?.rut || '98.765.432-1';

  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<PacienteUbicacion[]>([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const fetchLocations = async () => {
    setLoading(true);
    const db = getDB();
    try {
      // 1. Obtener todos los pacientes vinculados al cuidador con su configuración de zona segura
      const linkedSeniors = await db.getAllAsync<{
        rut: string;
        nombres: string;
        apellidos: string;
        latitud_segura: number;
        longitud_segura: number;
        radio_seguro: number;
      }>(
        `SELECT am.rut, am.nombres, am.apellidos, am.latitud_segura, am.longitud_segura, am.radio_seguro
         FROM adulto_mayor am
         JOIN adulto_cuidador ac ON am.rut = ac.adulto_rut
         WHERE ac.cuidador_rut = ?`,
        [caregiverRut]
      );

      const ubicaciones: PacienteUbicacion[] = [];

      // 2. Para cada paciente, obtener el último registro de GPS
      for (const senior of linkedSeniors) {
        const gpsRecord = await db.getFirstAsync<{
          latitud: number;
          longitud: number;
          timestamp: string;
        }>(
          `SELECT latitud, longitud, timestamp
           FROM gps_registro
           WHERE adulto_rut = ?
           ORDER BY timestamp DESC
           LIMIT 1`,
          [senior.rut]
        );

        ubicaciones.push({
          rut: senior.rut,
          nombres: senior.nombres,
          apellidos: senior.apellidos,
          latitud: gpsRecord ? gpsRecord.latitud : null,
          longitud: gpsRecord ? gpsRecord.longitud : null,
          timestamp: gpsRecord ? gpsRecord.timestamp : null,
          latitud_segura: senior.latitud_segura,
          longitud_segura: senior.longitud_segura,
          radio_seguro: senior.radio_seguro,
        });
      }

      setPacientes(ubicaciones);

      // 3. Ajustar la región inicial de la cámara para enfocar los marcadores
      const validCoords = ubicaciones.filter(
        (p) => p.latitud !== null && p.longitud !== null
      ) as { latitud: number; longitud: number }[];

      if (validCoords.length > 0) {
        if (validCoords.length === 1) {
          setMapRegion({
            latitude: validCoords[0].latitud,
            longitude: validCoords[0].longitud,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          });
        } else {
          const avgLat = validCoords.reduce((sum, p) => sum + p.latitud, 0) / validCoords.length;
          const avgLng = validCoords.reduce((sum, p) => sum + p.longitud, 0) / validCoords.length;

          let maxLatDiff = 0.004;
          let maxLngDiff = 0.004;
          validCoords.forEach((p) => {
            maxLatDiff = Math.max(maxLatDiff, Math.abs(p.latitud - avgLat));
            maxLngDiff = Math.max(maxLngDiff, Math.abs(p.longitud - avgLng));
          });

          setMapRegion({
            latitude: avgLat,
            longitude: avgLng,
            latitudeDelta: maxLatDiff * 2.5,
            longitudeDelta: maxLngDiff * 2.5,
          });
        }
      }
    } catch (error) {
      console.error('[UltimaUbicacionScreen] Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [caregiverRut]);

  const formatTimestamp = (isoString: string | null) => {
    if (!isoString) return 'Sin ubicación registrada';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1b4332" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 12 : 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapa de Pacientes</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchLocations} activeOpacity={0.7} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Feather name="refresh-cw" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Contenedor del Mapa */}
      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={mapRegion} onRegionChangeComplete={setMapRegion}>
          {pacientes
            .filter((p) => p.latitud !== null && p.longitud !== null)
            .map((p) => (
              <React.Fragment key={p.rut}>
                <Marker
                  coordinate={{ latitude: p.latitud!, longitude: p.longitud! }}
                  title={`${p.nombres} ${p.apellidos}`}
                  description={`Última ubicación: ${formatTimestamp(p.timestamp)}`}
                >
                  <View style={styles.customMarker}>
                    <View style={styles.markerCircle}>
                      <Text style={styles.markerText}>👴</Text>
                    </View>
                    <View style={styles.markerTriangle} />
                  </View>
                </Marker>
                {p.latitud_segura !== undefined && p.longitud_segura !== undefined && p.radio_seguro !== undefined && p.latitud_segura !== 0 && (
                  <Circle
                    center={{ latitude: p.latitud_segura, longitude: p.longitud_segura }}
                    radius={p.radio_seguro}
                    strokeColor="rgba(16, 185, 129, 0.6)"
                    fillColor="rgba(16, 185, 129, 0.08)"
                  />
                )}
              </React.Fragment>
            ))}
        </MapView>
      </View>

      {/* Lista de Pacientes Inferior */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Estado de Ubicación</Text>
        <Text style={styles.listSubtitle}>Últimos registros conocidos</Text>
      </View>

      <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && pacientes.length === 0 ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 30 }} />
        ) : pacientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color="#94a3b8" />
            <Text style={styles.emptyStateText}>No tienes pacientes vinculados todavía.</Text>
          </View>
        ) : (
          pacientes.map((p) => {
            const hasLocation = p.latitud !== null && p.longitud !== null;
            return (
              <View key={p.rut} style={[styles.patientCard, !hasLocation && styles.patientCardNoLocation]}>
                <View style={[styles.avatarContainer, { backgroundColor: hasLocation ? '#d1fae5' : '#fee2e2' }]}>
                  <Text style={styles.avatarEmoji}>👴</Text>
                </View>

                <View style={styles.patientDetails}>
                  <Text style={styles.patientName}>{`${p.nombres} ${p.apellidos}`}</Text>
                  <View style={styles.locationRow}>
                    <Feather
                      name={hasLocation ? 'map-pin' : 'alert-circle'}
                      size={12}
                      color={hasLocation ? '#10b981' : '#ef4444'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.locationTime, !hasLocation && styles.locationTimeAlert]}>
                      {hasLocation
                        ? `Última vez visto: ${formatTimestamp(p.timestamp)}`
                        : 'Sin ubicación registrada'}
                    </Text>
                  </View>
                  {hasLocation && (
                    <Text style={styles.coordinatesText}>
                      Coordenadas: {p.latitud?.toFixed(5)}, {p.longitud?.toFixed(5)}
                    </Text>
                  )}
                </View>

                {hasLocation && (
                  <TouchableOpacity
                    style={styles.focusButton}
                    onPress={() =>
                      setMapRegion({
                        latitude: p.latitud!,
                        longitude: p.longitud!,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Feather name="eye" size={16} color="#047857" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f9f9',
  },
  header: {
    height: 60,
    backgroundColor: '#1b4332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  refreshButton: {
    padding: 6,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1.2,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 16,
  },
  webMapTitle: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  webMapSubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: 18,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#10b981',
    marginTop: -1,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  listSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  scrollList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientCardNoLocation: {
    borderColor: '#fee2e2',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  patientDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  locationTimeAlert: {
    color: '#ef4444',
  },
  coordinatesText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 3,
  },
  focusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
