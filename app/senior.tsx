import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { sha256 } from '@/db/controllers/authController';
import { getDB } from '@/db/dbInstance';
import { AdultoMayor, RegistroClinico } from '@/db/types';
import { activityService, ActivityState } from '@/services/activityService';
import { ConnectionStatus, DeviceInfo, healthConnectService } from '@/services/healthConnectService';
import { locationService } from '@/services/locationService';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistorialMedicosModal from '@/components/HistorialMedicosModal';

let MapView: any;
let Marker: any;
let Circle: any;

if (Platform.OS === 'web') {
  const WebMapMock = ({ children, style }: any) => {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2f0ef', borderWidth: 1, borderColor: '#99f6e4', borderRadius: 12, padding: 16 }]}>
        <Feather name="map" size={40} color="#0d9488" style={{ marginBottom: 6 }} />
        <Text style={{ color: '#0f766e', fontWeight: '700', fontSize: 14 }}>Mapa de Monitoreo</Text>
        <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2, textAlign: 'center' }}>Simulado en versión Web · Listo para teléfonos 📱</Text>
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

// ─── Paleta de Colores por Defecto ────────────────────────────────────────────
const DEFAULT_COLORS = {
  background: '#f2f9f9',     // mint-50
  surface: '#ffffff',
  primary: '#0d9488',        // teal-600
  primaryLight: '#ccfbf1',   // teal-100
  primaryDark: '#0f766e',    // teal-700
  primaryShadow: '#99f6e4',
  textPrimary: '#1e293b',    // slate-800
  textSecondary: '#64748b',  // slate-500
  textMuted: '#94a3b8',      // slate-400
  border: '#e2e8f0',        // slate-200
  cardBg: '#ffffff',

  // Colores temáticos
  heart: '#ec4899',          // pink-500
  heartLight: '#fce7f3',     // pink-100
  activity: '#f97316',       // orange-500
  activityLight: '#ffedd5',  // orange-100
  oxygen: '#6366f1',         // indigo-500
  oxygenLight: '#e0e7ff',    // indigo-100

  // Acciones rápidas modificadas
  emergency: '#ef4444',      // rojo
  emergencyBg: '#fee2e2',
  sos: '#ea580c',            // naranja fuerte
  sosBg: '#ffedd5',
  caregiver: '#10b981',      // verde
  caregiverBg: '#d1fae5',
} as const;

// ─── Paleta de Alto Contraste (Modo Daltonismo) ───────────────────────────────
const COLORBLIND_COLORS = {
  background: '#f8fafc',     // slate-50
  surface: '#ffffff',
  primary: '#1d4ed8',        // Royal Blue (Altamente contrastante y seguro)
  primaryLight: '#dbeafe',   // Blue-100
  primaryDark: '#1e40af',    // Blue-800
  primaryShadow: '#bfdbfe',
  textPrimary: '#0f172a',    // Charcoal (Negro suave)
  textSecondary: '#334155',  // Slate-700
  textMuted: '#64748b',      // Slate-500
  border: '#cbd5e1',        // Slate-300
  cardBg: '#ffffff',

  // Colores temáticos reconfigurados
  heart: '#d97706',          // Ámbar/Naranja de alto contraste
  heartLight: '#fef3c7',     // Ámbar claro
  activity: '#1e40af',       // Azul marino
  activityLight: '#dbeafe',
  oxygen: '#0f172a',         // Negro/carbón de alta lectura
  oxygenLight: '#e2e8f0',

  // Acciones rápidas accesibles
  emergency: '#b91c1c',      // Rojo oscuro de alto contraste
  emergencyBg: '#fee2e2',
  sos: '#c2410c',            // Naranja oscuro
  sosBg: '#ffedd5',
  caregiver: '#1e40af',      // Azul oscuro
  caregiverBg: '#dbeafe',
} as const;

// Dimensiones globales
const { width } = Dimensions.get('window');

// Helper de accesibilidad para cálculo dinámico del tamaño de fuente
const getFontSize = (baseSize: number, multiplier: number) => {
  return Math.round(baseSize * multiplier);
};

function getStressInfo(val: number | null | undefined) {
  if (val === null || val === undefined) return { category: 'Sin datos', emoji: '😐', color: '#94a3b8' };
  if (val <= 25) return { category: 'Relajado', emoji: '😊', color: '#4EECD6' };
  if (val <= 50) return { category: 'Leve', emoji: '😐', color: '#A3E635' };
  if (val <= 80) return { category: 'Moderado', emoji: '😟', color: '#FB923C' };
  return { category: 'Severo', emoji: '😭', color: '#EF4444' };
}

export default function SeniorApp() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const [tab, setTab] = useState<'inicio' | 'salud' | 'registro' | 'dispositivo' | 'configuracion'>('inicio');
  const { userSession, logout: authLogout } = useAuth();
  const rut = userSession?.rut || '12.345.678-9';

  // ─── Estados de Perfil Editables ──────────────────────────────────────────
  const [name, setName] = useState(userSession?.nombres || 'Acdiel');
  const [email, setEmail] = useState('acdiel@innercore.cl');
  const [avatar, setAvatar] = useState('👴');

  // ─── Estados Clínicos e Historiales Dinámicos ─────────────────────────────
  const [clinicalRecords, setClinicalRecords] = useState<RegistroClinico[]>([]);
  const [heartRateRecords, setHeartRateRecords] = useState<number[]>([]);
  const [glucoseHistory, setGlucoseHistory] = useState<{ value: number; label: string }[]>([]);
  const [averageBpmHistory, setAverageBpmHistory] = useState<{ value: number; label: string }[]>([]);
  const [averageOxygenHistory, setAverageOxygenHistory] = useState<{ value: number; label: string }[]>([]);
  const [averageStressHistory, setAverageStressHistory] = useState<{ value: number; label: string }[]>([]);

  // ─── Estados de Sensores y Ubicación ──────────────────────────────────────
  const [safeZone, setSafeZone] = useState({ latitude: -33.4489, longitude: -70.6693, radius: 150 });
  const [activityState, setActivityState] = useState<ActivityState>('Sedentario');
  const [bpm, setBpm] = useState<number | null>(null);
  const [oxygen, setOxygen] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [latestO2, setLatestO2] = useState<number | null>(null);
  const [latestStress, setLatestStress] = useState<number | null>(null);
  const [bleStatus, setBleStatus] = useState<ConnectionStatus>('Desconectado');
  const [bleDevice, setBleDevice] = useState<any>(null);

  // ─── Estados de Accesibilidad Globales ────────────────────────────────────
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0); // 1.0, 1.2, 1.4
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // ─── Estados Persistidos del Mapa ─────────────────────────────────────────
  const [showsLocation, setShowsLocation] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  });

  const handleLocationPermission = async () => {
    const hasPermission = await locationService.requestPermissions();
    if (hasPermission) {
      setShowsLocation(true);
      const loc = await locationService.getCurrentLocation();
      if (loc) {
        const newLat = loc.coords.latitude;
        const newLng = loc.coords.longitude;
        setMapRegion(prev => ({
          ...prev,
          latitude: newLat,
          longitude: newLng
        }));

        // Check if safe zone is unconfigured
        if (safeZone.latitude === 0 && safeZone.longitude === 0 && safeZone.radius === 0) {
          const db = getDB();
          const newRadius = 200; // 200m default
          try {
            await db.runAsync(
              "UPDATE adulto_mayor SET latitud_segura = ?, longitud_segura = ?, radio_seguro = ? WHERE rut = ?",
              [newLat, newLng, newRadius, rut]
            );
            setSafeZone({
              latitude: newLat,
              longitude: newLng,
              radius: newRadius
            });
            Alert.alert(
              'Zona Segura Auto-Configurada',
              'Se ha configurado automáticamente una zona segura de 200 metros a tu alrededor.',
              [{ text: 'Aceptar' }]
            );
          } catch (dbErr) {
            console.error('[SeniorApp] Error auto-configuring safe zone:', dbErr);
          }
        } else {
          Alert.alert(
            'Permiso de Ubicación',
            'Se ha activado el acceso al GPS del teléfono. El mapa mostrará tu ubicación real en tiempo real.',
            [{ text: 'Aceptar' }]
          );
        }
      }
    } else {
      Alert.alert(
        'Permiso Denegado',
        'No se pudo acceder al posicionamiento GPS. Por favor, habilítalo en los ajustes.'
      );
    }
  };

  // Carga inicial de datos de SQLite
  const loadProfileAndHistory = async () => {
    const db = getDB();
    try {
      // 1. Cargar datos del perfil
      const profile = await db.getFirstAsync<AdultoMayor>(
        "SELECT * FROM adulto_mayor WHERE rut = ?", [rut]
      );
      if (profile) {
        setName(profile.nombres);
        setEmail(profile.email || '');

        let safeLat = profile.latitud_segura;
        let safeLng = profile.longitud_segura;
        let safeRad = profile.radio_seguro;

        if (safeLat === 0 && safeLng === 0 && safeRad === 0) {
          console.log('[SeniorApp] Safe zone not configured. Checking location permission for auto-geofencing...');
          if (Platform.OS !== 'web') {
            try {
              const LocationApi = require('expo-location');
              const { status } = await LocationApi.getForegroundPermissionsAsync();
              if (status === 'granted') {
                const loc = await locationService.getCurrentLocation();
                if (loc) {
                  safeLat = loc.coords.latitude;
                  safeLng = loc.coords.longitude;
                  safeRad = 200;

                  await db.runAsync(
                    "UPDATE adulto_mayor SET latitud_segura = ?, longitud_segura = ?, radio_seguro = ? WHERE rut = ?",
                    [safeLat, safeLng, safeRad, rut]
                  );
                  console.log(`[SeniorApp] Auto-configured safe zone at (${safeLat}, ${safeLng}) with 200m radius.`);
                }
              }
            } catch (permErr) {
              console.error('[SeniorApp] Error reading/checking foreground permissions on startup:', permErr);
            }
          }
        }

        setSafeZone({
          latitude: safeLat,
          longitude: safeLng,
          radius: safeRad
        });

        setMapRegion(prev => ({
          ...prev,
          latitude: safeLat !== 0 ? safeLat : -33.4489,
          longitude: safeLng !== 0 ? safeLng : -70.6693
        }));
      }

      // 2. Cargar historial clínico (últimas 7 mediciones manuales raw para el grid)
      const clinicos = await db.getAllAsync<RegistroClinico>(
        "SELECT * FROM registro_clinico WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 7",
        [rut]
      );
      setClinicalRecords(clinicos.reverse()); // Orden cronológico (más antiguo a más nuevo)

      // 3. Cargar pulso semanal promedio
      const cardiacosAvg = await db.getAllAsync<{ day: string; avg_bpm: number }>(
        `SELECT date(timestamp) as day, AVG(bpm) as avg_bpm
         FROM frecuencia_cardiaca
         WHERE adulto_rut = ? AND timestamp >= date('now', '-7 days')
         GROUP BY day
         ORDER BY day ASC`,
        [rut]
      );
      const mappedCardiacos = cardiacosAvg.map(c => {
        const dateObj = new Date(c.day + 'T00:00:00');
        const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = dayLabels[dateObj.getDay()];
        return { value: Math.round(c.avg_bpm), label };
      });
      setAverageBpmHistory(mappedCardiacos);

      // 4. Cargar glucosa semanal promedio
      const glucosaAvg = await db.getAllAsync<{ day: string; avg_glucosa: number }>(
        `SELECT date(timestamp) as day, AVG(glucosa) as avg_glucosa
         FROM registro_clinico
         WHERE adulto_rut = ? AND timestamp >= date('now', '-7 days')
         GROUP BY day
         ORDER BY day ASC`,
        [rut]
      );
      const mappedGlucose = glucosaAvg.map(c => {
        const dateObj = new Date(c.day + 'T00:00:00');
        const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = dayLabels[dateObj.getDay()];
        return { value: Math.round(c.avg_glucosa), label };
      });
      setGlucoseHistory(mappedGlucose);

      // 5. Cargar SpO2 y Estrés más recientes e historias de SQLite
      const latestO2Record = await db.getFirstAsync<{ porcentaje: number }>(
        "SELECT porcentaje FROM oxigeno_sangre WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
        [rut]
      );
      setLatestO2(latestO2Record ? latestO2Record.porcentaje : null);

      const latestStressRecord = await db.getFirstAsync<{ nivel: number }>(
        "SELECT valor AS nivel FROM estres WHERE userId = ? ORDER BY timestamp DESC LIMIT 1",
        [rut]
      );
      setLatestStress(latestStressRecord ? latestStressRecord.nivel : null);

      const oxigenoAvg = await db.getAllAsync<{ day: string; avg_oxygen: number }>(
        `SELECT date(timestamp) as day, AVG(porcentaje) as avg_oxygen
         FROM oxigeno_sangre
         WHERE adulto_rut = ? AND timestamp >= date('now', '-7 days')
         GROUP BY day
         ORDER BY day ASC`,
        [rut]
      );
      const mappedOxygen = oxigenoAvg.map(c => {
        const dateObj = new Date(c.day + 'T00:00:00');
        const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = dayLabels[dateObj.getDay()];
        return { value: Math.round(c.avg_oxygen), label };
      });
      setAverageOxygenHistory(mappedOxygen);

      const estresAvg = await db.getAllAsync<{ day: string; avg_stress: number }>(
        `SELECT date(timestamp) as day, AVG(valor) as avg_stress
         FROM estres
         WHERE userId = ? AND timestamp >= date('now', '-7 days')
         GROUP BY day
         ORDER BY day ASC`,
        [rut]
      );
      const mappedStress = estresAvg.map(c => {
        const dateObj = new Date(c.day + 'T00:00:00');
        const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = dayLabels[dateObj.getDay()];
        return { value: Math.round(c.avg_stress), label };
      });
      setAverageStressHistory(mappedStress);

    } catch (err) {
      console.error('Error al cargar datos de SQLite en SeniorApp:', err);
    }
  };

  useEffect(() => {
    loadProfileAndHistory();

    // Check location permission initially to restore showsLocation and track GPS if granted
    const checkInitialLocation = async () => {
      if (Platform.OS === 'web') return;
      try {
        const LocationApi = require('expo-location');
        const { status } = await LocationApi.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setShowsLocation(true);
          const loc = await locationService.getCurrentLocation();
          if (loc) {
            setMapRegion(prev => ({
              ...prev,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            }));
          }
        }
      } catch (err) {
        console.error('[SeniorApp] Error checking startup location permissions:', err);
      }
    };
    checkInitialLocation();

    // Iniciar servicios nativos del Adulto Mayor
    locationService.startTracking(rut);
    activityService.startTracking(rut);
    healthConnectService.autoReconnect(rut);

    // Suscribirse a actualizaciones de sensores de forma reactiva
    const unsubscribeActivity = activityService.addListener((state) => {
      setActivityState(state);
    });

    const unsubscribeBpm = healthConnectService.addBpmListener((val) => {
      setBpm(val);
      // Al recibir un nuevo latido de Health Connect, recargar el historial de gráfico
      if (val !== null) {
        const db = getDB();
        db.getAllAsync<{ bpm: number }>(
          "SELECT bpm FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 7",
          [rut]
        ).then(res => {
          setHeartRateRecords(res.reverse().map(c => c.bpm));
        });
      }
    });

    const unsubscribeOxygen = healthConnectService.addOxygenListener((val) => {
      setOxygen(val);
      if (val !== null) {
        setLatestO2(val);
        const db = getDB();
        db.getAllAsync<{ day: string; avg_oxygen: number }>(
          `SELECT date(timestamp) as day, AVG(porcentaje) as avg_oxygen
           FROM oxigeno_sangre
           WHERE adulto_rut = ? AND timestamp >= date('now', '-7 days')
           GROUP BY day
           ORDER BY day ASC`,
          [rut]
        ).then(res => {
          const mapped = res.map(c => {
            const dateObj = new Date(c.day + 'T00:00:00');
            const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const label = dayLabels[dateObj.getDay()];
            return { value: Math.round(c.avg_oxygen), label };
          });
          setAverageOxygenHistory(mapped);
        });
      }
    });

    const unsubscribeStress = healthConnectService.addStressListener((val) => {
      setStress(val);
      if (val !== null) {
        setLatestStress(val);
        const db = getDB();
        db.getAllAsync<{ day: string; avg_stress: number }>(
          `SELECT date(timestamp) as day, AVG(valor) as avg_stress
           FROM estres
           WHERE userId = ? AND timestamp >= date('now', '-7 days')
           GROUP BY day
           ORDER BY day ASC`,
          [rut]
        ).then(res => {
          const mapped = res.map(c => {
            const dateObj = new Date(c.day + 'T00:00:00');
            const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const label = dayLabels[dateObj.getDay()];
            return { value: Math.round(c.avg_stress), label };
          });
          setAverageStressHistory(mapped);
        });
      }
    });

    const unsubscribeBleStatus = healthConnectService.addStatusListener((status) => {
      setBleStatus(status);
    });

    const unsubscribeBleDevice = healthConnectService.addDeviceInfoListener((info) => {
      // Keep bleDevice as a simple mock to avoid UI crashes
      if (info.connectedSince) {
        setBleDevice({ name: `${info.manufacturer} ${info.model}` } as any);
      } else {
        setBleDevice(null);
      }
    });

    return () => {
      locationService.stopTracking();
      activityService.stopTracking();
      healthConnectService.stopSyncPolling();
      unsubscribeActivity();
      unsubscribeBpm();
      unsubscribeOxygen();
      unsubscribeStress();
      unsubscribeBleStatus();
      unsubscribeBleDevice();
    };
  }, [rut]);

  // Obtener colores basados en el modo de daltonismo activo
  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir del perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          onPress: () => {
            locationService.stopTracking();
            activityService.stopTracking();
            healthConnectService.disconnectDevice();
            authLogout();
            router.replace('/');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={activeColors.background} />

      {/* Encabezado Principal */}
      <View style={[styles.header, { 
        borderBottomColor: activeColors.border, 
        backgroundColor: activeColors.surface,
        height: undefined,
        paddingTop: insets.top + (Platform.OS === 'android' && isTablet ? 15 : 0),
        paddingBottom: 10
      }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.appTitle, { color: activeColors.textPrimary }]}>Innercore</Text>
          <Text style={[styles.roleTag, { backgroundColor: activeColors.primaryLight, color: activeColors.primaryDark }]}>
            Adulto Mayor
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={20} color={activeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Contenido Principal con Tab Switcher */}
      <View style={styles.content}>
        {tab === 'inicio' && (
          <SeniorInicio
            setTab={setTab}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            name={name}
            avatar={avatar}
            safeZone={safeZone}
            activityState={activityState}
            bpm={bpm}
            oxygen={oxygen}
            stress={stress}
            bleStatus={bleStatus}
            bleDevice={bleDevice}
            clinicalRecords={clinicalRecords}
            mapRegion={mapRegion}
            showsLocation={showsLocation}
            handleLocationPermission={handleLocationPermission}
          />
        )}
        {tab === 'salud' && (
          <SeniorSalud
            setTab={setTab}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            clinicalRecords={clinicalRecords}
            heartRateRecords={heartRateRecords}
            averageBpmHistory={averageBpmHistory}
            averageOxygenHistory={averageOxygenHistory}
            averageStressHistory={averageStressHistory}
            latestO2={latestO2}
            latestStress={latestStress}
          />
        )}
        {tab === 'registro' && (
          <SeniorRegistro
            setTab={setTab}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            rut={rut}
            refreshClinicalData={loadProfileAndHistory}
            bpm={bpm}
            oxygen={oxygen}
            stress={stress}
            activityState={activityState}
            avatar={avatar}
          />
        )}
        {tab === 'dispositivo' && (
          <SeniorDispositivo
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            rut={rut}
            bleStatus={bleStatus}
            bleDevice={bleDevice}
            bpm={bpm}
            oxygen={oxygen}
          />
        )}
        {tab === 'configuracion' && (
          <SeniorConfiguracion
            rut={rut}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            avatar={avatar}
            setAvatar={setAvatar}
            fontSizeMultiplier={fontSizeMultiplier}
            setFontSizeMultiplier={setFontSizeMultiplier}
            colorblindMode={colorblindMode}
            setColorblindMode={setColorblindMode}
            activeColors={activeColors}
            onProfileUpdated={loadProfileAndHistory}
          />
        )}
      </View>

      {/* Navbar Inferior Típico Modificado (5 Pestañas Responsivas) */}
      <View style={[
        styles.navbar,
        {
          backgroundColor: activeColors.surface,
          borderColor: activeColors.border,
          bottom: insets.bottom > 0 ? insets.bottom + 6 : 20
        }
      ]}>
        <NavButton
          icon="home"
          label="Inicio"
          isActive={tab === 'inicio'}
          color={activeColors.primary}
          onPress={() => setTab('inicio')}
          activeColors={activeColors}
        />
        <NavButton
          icon="heart"
          label="Salud"
          isActive={tab === 'salud'}
          color={activeColors.heart}
          onPress={() => setTab('salud')}
          activeColors={activeColors}
        />
        <NavButton
          icon="edit-3"
          label="Registro"
          isActive={tab === 'registro'}
          color={activeColors.activity}
          onPress={() => setTab('registro')}
          activeColors={activeColors}
        />
        <NavButton
          icon="watch"
          label="Equipos"
          isActive={tab === 'dispositivo'}
          color={activeColors.oxygen}
          onPress={() => setTab('dispositivo')}
          activeColors={activeColors}
        />
        <NavButton
          icon="settings"
          label="Ajustes"
          isActive={tab === 'configuracion'}
          color={activeColors.primaryDark}
          onPress={() => setTab('configuracion')}
          activeColors={activeColors}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-componente: Botón de Navbar ───────────────────────────────────────────
interface NavButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isActive: boolean;
  color: string;
  onPress: () => void;
  activeColors: any;
}

function NavButton({ icon, label, isActive, color, onPress, activeColors }: NavButtonProps) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.navIconContainer, isActive && { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={20} color={isActive ? color : activeColors.textMuted} />
      </View>
      <Text style={[styles.navText, { color: isActive ? color : activeColors.textMuted }, isActive && { fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ===============================================================================
// 1. SUB-PANTALLA: INICIO
// ===============================================================================
interface SeniorTabProps {
  setTab?: (t: any) => void;
  fontSizeMultiplier: number;
  activeColors: any;
  name?: string;
  avatar?: string;
  safeZone?: { latitude: number; longitude: number; radius: number };
  activityState?: ActivityState;
  bpm?: number | null;
  oxygen?: number | null;
  stress?: number | null;
  bleStatus?: ConnectionStatus;
  bleDevice?: any;
  clinicalRecords?: RegistroClinico[];
  heartRateRecords?: number[];
  mapRegion?: any;
  showsLocation?: boolean;
  handleLocationPermission?: () => Promise<void>;
  averageBpmHistory?: any[];
}

function SeniorInicio({
  setTab,
  fontSizeMultiplier,
  activeColors,
  name,
  avatar,
  safeZone,
  activityState,
  bpm,
  oxygen,
  stress,
  bleStatus,
  bleDevice,
  clinicalRecords,
  mapRegion: propMapRegion,
  showsLocation: propShowsLocation,
  handleLocationPermission: propHandleLocationPermission
}: SeniorTabProps) {
  const insets = useSafeAreaInsets();
  const latestClinico = clinicalRecords && clinicalRecords.length > 0
    ? clinicalRecords[clinicalRecords.length - 1]
    : null;

  const [sosActive, setSosActive] = useState(false);

  const mapRegion = propMapRegion || {
    latitude: safeZone?.latitude || -33.4489,
    longitude: safeZone?.longitude || -70.6693,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  };
  const showsLocation = propShowsLocation || false;
  const handleLocationPermission = propHandleLocationPermission || (async () => { });

  const handleEmergencyCall = () => {
    Alert.alert(
      'Llamada de Emergencia',
      '¿Deseas realizar una llamada directa al número de emergencia (131)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => console.log('Llamando a emergencias...') },
      ]
    );
  };

  const handleSosPress = () => {
    setSosActive(!sosActive);
    Alert.alert(
      sosActive ? 'Alerta SOS Cancelada' : 'Alerta SOS Enviada',
      sosActive
        ? 'Se ha notificado a tus cuidadores que te encuentras a salvo.'
        : 'Se ha enviado una alerta de pánico inmediata a todos tus cuidadores registrados.',
      [{ text: 'Entendido' }]
    );
  };

  const handleContactCaregiver = () => {
    Alert.alert(
      'Contactar Cuidador',
      '¿Deseas llamar a tu cuidador principal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => console.log('Llamando al cuidador...') },
      ]
    );
  };

  const handleDeviceAction = () => {
    if (bleStatus === 'Conectado') {
      healthConnectService.disconnectDevice();
    } else {
      if (setTab) setTab('dispositivo'); // Redirigir a pestaña de vinculación
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>

      {/* Mapa Interactivos */}
      <View style={[styles.mapContainer, { borderColor: activeColors.primaryLight }]}>
        <MapView
          style={styles.map}
          region={mapRegion}
          showsUserLocation={showsLocation}
          followsUserLocation={showsLocation}
          scrollEnabled={showsLocation}
          zoomEnabled={showsLocation}
          pitchEnabled={showsLocation}
          rotateEnabled={showsLocation}
        >
          {safeZone && safeZone.latitude !== 0 && safeZone.longitude !== 0 && safeZone.radius !== 0 && (
            <Marker coordinate={{ latitude: safeZone.latitude, longitude: safeZone.longitude }} title="Mi Zona Segura">
              <View style={[styles.radarCenter, { backgroundColor: `${activeColors.primary}40`, borderColor: activeColors.primary }]}>
                <View style={[styles.radarDot, { backgroundColor: activeColors.primary }]} />
              </View>
            </Marker>
          )}
          {safeZone && safeZone.latitude !== 0 && safeZone.longitude !== 0 && safeZone.radius !== 0 && (
            <Circle
              center={{ latitude: safeZone.latitude, longitude: safeZone.longitude }}
              radius={safeZone.radius}
              strokeColor={`${activeColors.primary}80`}
              fillColor={`${activeColors.primary}15`}
            />
          )}
        </MapView>
        {safeZone && safeZone.latitude === 0 && safeZone.longitude === 0 && safeZone.radius === 0 && (
          <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: activeColors.border }}>
            <Text style={{ color: activeColors.textSecondary, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>
              Zona segura no configurada
            </Text>
          </View>
        )}

        {showsLocation ? (
          <View style={[styles.locationTag, { backgroundColor: activeColors.surface }]}>
            <Feather name="map-pin" size={14} color={activeColors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: activeColors.primaryDark, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Ubicación GPS Real Activa
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.locationTag, { backgroundColor: activeColors.surface }]} onPress={handleLocationPermission} activeOpacity={0.8}>
            <Feather name="map-pin" size={14} color={activeColors.heart} style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: activeColors.primaryDark, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              📍 Activar Ubicación Real
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Perfil del Usuario */}
      <View style={[styles.userCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatar}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              Hola, {name}
            </Text>
            <Text style={[styles.userUpdate, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Perfil conectado · Dispositivo activo
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7} disabled>
          <Feather name="bell" size={20} color={activeColors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Estado del Dispositivo */}
      <View style={[styles.deviceStatusCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.sectionTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          ESTADO DEL DISPOSITIVO
        </Text>
        <View style={styles.deviceTagsRow}>
          <View style={[
            styles.statusTag,
            { borderColor: activeColors.border },
            bleStatus === 'Conectado' && { backgroundColor: activeColors.primaryLight },
            bleStatus === 'Conectando' && { backgroundColor: '#f59e0b' },
            bleStatus === 'Desconectado' && { backgroundColor: activeColors.background }
          ]}>
            <View style={[
              styles.onlineDot,
              bleStatus === 'Conectado' && { backgroundColor: activeColors.primary },
              bleStatus === 'Conectando' && { backgroundColor: '#f59e0b' },
              bleStatus === 'Desconectado' && { backgroundColor: activeColors.textMuted }
            ]} />
            <Text style={[
              styles.deviceTagText,
              { fontSize: getFontSize(12, fontSizeMultiplier) },
              bleStatus === 'Conectado' && { color: activeColors.primaryDark, fontWeight: '700' },
              bleStatus === 'Conectando' && { color: activeColors.oxygen, fontWeight: '700' },
              bleStatus === 'Desconectado' && { color: activeColors.textSecondary }
            ]}>
              {bleStatus === 'Conectado' ? (bpm !== null || healthConnectService.getIsSimulated() ? 'Conectado' : 'Conectado - esperando datos') : bleStatus}
            </Text>
          </View>
          {bleStatus === 'Conectado' ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeColors.primaryLight,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: activeColors.primary,
              marginLeft: 'auto'
            }}>
              <Feather name="check" size={14} color={activeColors.primaryDark} style={{ marginRight: 4 }} />
              <Text style={{ color: activeColors.primaryDark, fontSize: getFontSize(12, fontSizeMultiplier), fontWeight: '700' }}>
                Permisos Activos
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.updateBtn} onPress={handleDeviceAction} activeOpacity={0.7}>
              <Text style={[styles.updateBtnText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
                Vincular
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.wearableInfoRow}>
          <Feather name="watch" size={14} color={bleStatus === 'Conectado' ? activeColors.primary : activeColors.textMuted} />
          <Text style={[
            styles.wearableText,
            { fontSize: getFontSize(12, fontSizeMultiplier) },
            bleStatus === 'Conectado' ? { color: activeColors.textPrimary, fontWeight: '600' } : { color: activeColors.textSecondary }
          ]}>
            {bleStatus === 'Conectado'
              ? (bleDevice?.name || 'Xiaomi Redmi Watch 5 Active')
              : 'Ningún smartwatch vinculado'}
          </Text>
        </View>
      </View>

      {/* Tarjetas de Métricas de Salud */}
      <View style={styles.metricsContainer}>
        <Text style={[styles.sectionTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          SALUD — SENSORES EN TIEMPO REAL
        </Text>
        <View style={styles.metricsGrid}>
          {/* Pulso */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.heartLight }]}>
              <Feather name="heart" size={22} color={activeColors.heart} />
            </View>
            <Text style={[styles.metricValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
              {bpm !== null ? bpm : '--'}
            </Text>
            <Text style={[styles.metricUnit, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>lpm</Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              {bpm !== null ? (healthConnectService.getIsSimulated() ? 'Pulso (Simulado)' : 'Pulso (Real)') : 'Sin Conexión'}
            </Text>
          </View>

          {/* Actividad */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.activityLight }]}>
              <Feather name="activity" size={22} color={activeColors.activity} />
            </View>
            <Text style={[styles.metricValueText, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '700', textAlign: 'center', marginTop: 4 }]}>
              {activityState}
            </Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier), marginTop: 4 }]}>
              Actividad
            </Text>
          </View>

          {/* Oxígeno */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.oxygenLight }]}>
              <Feather name="wind" size={22} color={activeColors.oxygen} />
            </View>
            <Text style={[styles.metricValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
              {oxygen !== null ? `${oxygen}%` : '--'}
            </Text>
            <Text style={[styles.metricUnit, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>SpO2</Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              {oxygen !== null ? (healthConnectService.getIsSimulated() ? 'Oxígeno (Simulado)' : 'Oxígeno (Real)') : 'Oxígeno'}
            </Text>
          </View>

          {/* Estrés */}
          {(() => {
            const stressInfo = getStressInfo(stress);
            return (
              <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={[styles.metricIconBg, { backgroundColor: stressInfo.color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{stressInfo.emoji}</Text>
                </View>
                <Text style={[styles.metricValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                  {stress !== null ? `${stress}%` : '--'}
                </Text>
                <Text style={[styles.metricUnit, { color: stressInfo.color, fontSize: getFontSize(10, fontSizeMultiplier), fontWeight: '700' }]}>
                  {stressInfo.category}
                </Text>
                <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                  {stress !== null ? (healthConnectService.getIsSimulated() ? 'Estrés (Simulado)' : 'Estrés (Real)') : 'Estrés'}
                </Text>
              </View>
            );
          })()}
        </View>
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          ACCIONES CRÍTICAS DE AYUDA
        </Text>
        <View style={styles.emergencyGrid}>

          {/* Llamada de Emergencia */}
          <TouchableOpacity
            style={[styles.emergencyActionCard, { borderColor: activeColors.emergency, backgroundColor: activeColors.surface }]}
            onPress={handleEmergencyCall}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: activeColors.emergencyBg }]}>
              <Feather name="phone-call" size={26} color={activeColors.emergency} />
            </View>
            <Text style={[styles.actionCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Llamada{'\n'}Emergencia
            </Text>
            <Text style={[styles.actionCardSub, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              Marca directa 131
            </Text>
          </TouchableOpacity>

          {/* Alerta SOS */}
          <TouchableOpacity
            style={[
              styles.emergencyActionCard,
              { borderColor: activeColors.sos, backgroundColor: activeColors.surface },
              sosActive && { backgroundColor: '#fff7ed' }
            ]}
            onPress={handleSosPress}
            activeOpacity={0.8}
          >
            <View style={[
              styles.actionIconCircle,
              { backgroundColor: activeColors.sosBg },
              sosActive && { backgroundColor: '#ffedd5' }
            ]}>
              <Feather
                name="alert-triangle"
                size={26}
                color={sosActive ? '#c2410c' : activeColors.sos}
              />
            </View>
            <Text style={[styles.actionCardTitle, { fontSize: getFontSize(12, fontSizeMultiplier) }, sosActive && { color: '#c2410c' }]}>
              {sosActive ? 'SOS ACTIVO' : 'Alerta SOS'}
            </Text>
            <Text style={[styles.actionCardSub, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              Aviso a cuidadores
            </Text>
          </TouchableOpacity>

          {/* Contactar Cuidador */}
          <TouchableOpacity
            style={[styles.emergencyActionCard, { borderColor: activeColors.caregiver, backgroundColor: activeColors.surface }]}
            onPress={handleContactCaregiver}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: activeColors.caregiverBg }]}>
              <Feather name="users" size={26} color={activeColors.caregiver} />
            </View>
            <Text style={[styles.actionCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Contactar{'\n'}Cuidador
            </Text>
            <Text style={[styles.actionCardSub, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              Llamar ayuda
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </ScrollView>
  );
}

// ===============================================================================
// 2. SUB-PANTALLA: SALUD (CON GRÁFICOS REALES E INTERACTIVOS)
// ===============================================================================
function SeniorSalud({
  setTab,
  fontSizeMultiplier,
  activeColors,
  clinicalRecords,
  heartRateRecords,
  averageBpmHistory = [],
  averageOxygenHistory = [],
  averageStressHistory = [],
  latestO2 = null,
  latestStress = null
}: SeniorTabProps & {
  averageOxygenHistory?: any[];
  averageStressHistory?: any[];
  latestO2?: number | null;
  latestStress?: number | null;
}) {
  const insets = useSafeAreaInsets();

  // Datos dinámicos para LineChart (Gifted Charts) desde frecuencia cardíaca SQLite
  const lineData = averageBpmHistory;

  // Obtener la última medición clínica real de SQLite
  const latestClinico = clinicalRecords && clinicalRecords.length > 0
    ? clinicalRecords[clinicalRecords.length - 1]
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Mi Salud
      </Text>

      {/* Gráfico 1: Pulso Semanal Promedio (Curva lpm) */}
      <View style={[styles.chartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.chartLabel, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          Pulso Semanal Promedio (Curva lpm)
        </Text>
        <View style={styles.giftedChartWrapper}>
          {lineData.length > 0 ? (
            <LineChart
              data={lineData}
              color={activeColors.heart}
              thickness={3.5}
              noOfSections={3}
              areaChart
              startFillColor={`${activeColors.heart}35`}
              endFillColor={`${activeColors.heart}01`}
              dataPointsColor={activeColors.heart}
              yAxisColor="transparent"
              xAxisColor={activeColors.border}
              yAxisTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              height={110}
              width={width - 100}
              spacing={34}
              initialSpacing={14}
              hideDataPoints={false}
              dataPointsRadius={4.5}
              curved
            />
          ) : (
            <View style={{ height: 110, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: activeColors.textMuted, fontSize: 13 }}>Esperando datos...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Gráfico 2: Saturación de Oxígeno Semanal Promedio (SpO2 %) */}
      <View style={[styles.chartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.chartLabel, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          Saturación de Oxígeno Semanal Promedio (SpO2 %)
        </Text>
        <View style={styles.giftedChartWrapper}>
          {averageOxygenHistory.length > 0 ? (
            <LineChart
              data={averageOxygenHistory}
              color={activeColors.oxygen}
              thickness={3.5}
              noOfSections={3}
              areaChart
              startFillColor={`${activeColors.oxygen}35`}
              endFillColor={`${activeColors.oxygen}01`}
              dataPointsColor={activeColors.oxygen}
              yAxisColor="transparent"
              xAxisColor={activeColors.border}
              yAxisTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              height={110}
              width={width - 100}
              spacing={34}
              initialSpacing={14}
              hideDataPoints={false}
              dataPointsRadius={4.5}
              curved
            />
          ) : (
            <View style={{ height: 110, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: activeColors.textMuted, fontSize: 13 }}>Esperando datos...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Gráfico 3: Nivel de Estrés Semanal Promedio (Nivel %) */}
      <View style={[styles.chartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.chartLabel, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          Nivel de Estrés Semanal Promedio (Nivel %)
        </Text>
        <View style={styles.giftedChartWrapper}>
          {averageStressHistory.length > 0 ? (
            <BarChart
              data={averageStressHistory.map((item, idx) => ({
                ...item,
                frontColor: idx === averageStressHistory.length - 1 ? '#ef4444' : '#fee2e2'
              }))}
              barWidth={18}
              noOfSections={3}
              barBorderRadius={4}
              yAxisColor="transparent"
              xAxisColor={activeColors.border}
              yAxisTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: activeColors.textMuted, fontSize: 9 }}
              height={110}
              width={width - 100}
              spacing={20}
              initialSpacing={14}
            />
          ) : (
            <View style={{ height: 110, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: activeColors.textMuted, fontSize: 13 }}>Esperando datos...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Grilla de Métricas Detalladas */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              PRESIÓN ARTERIAL
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              {latestClinico ? `${latestClinico.sistolica}/${latestClinico.diastolica}` : '-- / --'}
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              mmHg · Manual
            </Text>
            <Text style={[
              styles.gridStatusOk,
              { fontSize: getFontSize(11, fontSizeMultiplier) },
              latestClinico ? { color: activeColors.primaryDark, fontWeight: '700' } : { color: activeColors.textSecondary }
            ]}>
              {latestClinico ? 'Medido recientemente' : 'Esperando datos...'}
            </Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              GLUCOSA
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              {latestClinico ? `${latestClinico.glucosa}` : '--'}
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              mg/dL · Manual
            </Text>
            <Text style={[
              styles.gridStatusOk,
              { fontSize: getFontSize(11, fontSizeMultiplier) },
              latestClinico ? { color: activeColors.primaryDark, fontWeight: '700' } : { color: activeColors.textSecondary }
            ]}>
              {latestClinico ? 'Medido recientemente' : 'Esperando datos...'}
            </Text>
          </View>

        </View>

        <View style={styles.gridRow}>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              OXÍGENO
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              {latestO2 !== null ? `${latestO2}%` : '--'}
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              SpO2 · Wearable
            </Text>
            <Text style={[
              styles.gridStatusOk,
              { fontSize: getFontSize(11, fontSizeMultiplier) },
              latestO2 !== null ? { color: activeColors.primaryDark, fontWeight: '700' } : { color: activeColors.textSecondary }
            ]}>
              {latestO2 !== null ? 'Estable' : 'Esperando datos...'}
            </Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              TEMPERATURA
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              {latestClinico ? `${latestClinico.temperatura} °C` : '--'}
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              Celsius · Manual
            </Text>
            <Text style={[
              styles.gridStatusOk,
              { fontSize: getFontSize(11, fontSizeMultiplier) },
              latestClinico ? { color: activeColors.primaryDark, fontWeight: '700' } : { color: activeColors.textSecondary }
            ]}>
              {latestClinico ? 'Normal' : 'Esperando datos...'}
            </Text>
          </View>

        </View>

        <View style={styles.gridRow}>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border, flex: 1 }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              ESTRÉS
            </Text>
            {(() => {
              const stressInfo = getStressInfo(latestStress);
              return (
                <>
                  <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                    {latestStress !== null ? `${latestStress}% ${stressInfo.emoji}` : '--'}
                  </Text>
                  <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                    Nivel · Wearable
                  </Text>
                  <Text style={[
                    styles.gridStatusOk,
                    { fontSize: getFontSize(11, fontSizeMultiplier), color: stressInfo.color, fontWeight: '700' }
                  ]}>
                    {latestStress !== null ? stressInfo.category : 'Esperando datos...'}
                  </Text>
                </>
              );
            })()}
          </View>

        </View>
      </View>

      {/* Botón para navegar a Registro */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow }]}
        onPress={() => setTab && setTab('registro')}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={20} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={[styles.actionButtonText, { fontSize: getFontSize(16, fontSizeMultiplier) }]}>
          Ingresar nuevos datos
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface SeniorRegistroProps extends SeniorTabProps {
  rut: string;
  refreshClinicalData: () => void;
  bpm: number | null;
  oxygen: number | null;
  stress: number | null;
  activityState: ActivityState;
  avatar?: string;
}

// ===============================================================================
// 3. SUB-PANTALLA: REGISTRO DE DATOS
// ===============================================================================
function SeniorRegistro({ 
  setTab, 
  fontSizeMultiplier, 
  activeColors, 
  rut, 
  refreshClinicalData,
  bpm,
  oxygen,
  stress,
  activityState,
  avatar = '👴'
}: SeniorRegistroProps) {
  const insets = useSafeAreaInsets();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const getFontSize = (base: number, mult: number) => Math.round(base * mult);

  const handleSave = async () => {
    const sist = parseInt(systolic, 10);
    const diast = parseInt(diastolic, 10);
    const gluc = parseInt(glucose, 10);
    const tempVal = parseFloat(temp);

    if (isNaN(sist) || isNaN(diast) || isNaN(gluc) || isNaN(tempVal)) {
      Alert.alert('Faltan Datos o Son Inválidos', 'Por favor ingresa todos tus valores de salud con valores numéricos válidos antes de guardar.');
      return;
    }

    const db = getDB();
    const timestamp = new Date().toISOString();

    try {
      // 1. Save manual clinical record
      await db.runAsync(
        `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rut, sist, diast, gluc, tempVal, notes.trim() || null, timestamp]
      );

      // 2. Save health snapshot into registro_medico_historico
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fechaStr = `${day}/${month}/${year}`;
      const horaStr = `${hours}:${minutes}`;

      await db.runAsync(
        `INSERT INTO registro_medico_historico (userId, fecha, hora, bpm, spo2, estres, actividad, comentarios)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rut,
          fechaStr,
          horaStr,
          bpm || 72,
          oxygen || 98,
          stress !== null ? stress : 35,
          activityState || 'Sedentario',
          notes.trim() || 'Chequeo rutinario manual'
        ]
      );

      Alert.alert(
        'Registro Guardado',
        `Tus mediciones se han registrado con éxito localmente:\n\n· Presión: ${sist}/${diast} mmHg\n· Glucosa: ${gluc} mg/dL\n· Temperatura: ${tempVal} °C\n\nSnapshot de salud creado en tu historial.`,
        [{
          text: 'Excelente',
          onPress: () => {
            // Recargar datos y volver a la pestaña Salud
            refreshClinicalData();
            if (setTab) setTab('salud');

            // Limpiar inputs
            setSystolic('');
            setDiastolic('');
            setGlucose('');
            setTemp('');
            setNotes('');
          }
        }]
      );
    } catch (error) {
      console.error('Error saving clinical record and snapshot:', error);
      Alert.alert('Error', 'Hubo un problema al guardar las mediciones en la base de datos.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 110 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Ingresar Datos
      </Text>

      <View style={styles.infoBanner}>
        <Feather name="info" size={18} color="#0284c7" style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoBannerText, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>
          Ingresa tus valores medidos con tus dispositivos médicos personales (tensiómetro, glucómetro, termómetro).
        </Text>
      </View>

      <View style={[styles.formContainer, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Presión Sistólica */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="heart" size={16} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.formLabel, { color: activeColors.primaryDark, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
              Presión arterial sistólica
            </Text>
          </View>
          <View style={[styles.inputContainer, { borderColor: activeColors.primaryLight }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(16, fontSizeMultiplier), color: activeColors.textPrimary }]}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={activeColors.textMuted}
              value={systolic}
              onChangeText={setSystolic}
            />
            <Text style={[styles.unitText, { color: activeColors.textMuted, fontSize: getFontSize(12, fontSizeMultiplier) }]}>mmHg</Text>
          </View>
        </View>

        {/* Presión Diastólica */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="heart" size={16} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.formLabel, { color: activeColors.primaryDark, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
              Presión arterial diastólica
            </Text>
          </View>
          <View style={[styles.inputContainer, { borderColor: activeColors.primaryLight }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(16, fontSizeMultiplier), color: activeColors.textPrimary }]}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={activeColors.textMuted}
              value={diastolic}
              onChangeText={setDiastolic}
            />
            <Text style={[styles.unitText, { color: activeColors.textMuted, fontSize: getFontSize(12, fontSizeMultiplier) }]}>mmHg</Text>
          </View>
        </View>

        {/* Glucosa */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="droplet" size={16} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={[styles.formLabel, { color: activeColors.primaryDark, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
              Glucosa en sangre
            </Text>
          </View>
          <View style={[styles.inputContainer, { borderColor: activeColors.primaryLight }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(16, fontSizeMultiplier), color: activeColors.textPrimary }]}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={activeColors.textMuted}
              value={glucose}
              onChangeText={setGlucose}
            />
            <Text style={[styles.unitText, { color: activeColors.textMuted, fontSize: getFontSize(12, fontSizeMultiplier) }]}>mg/dL</Text>
          </View>
        </View>

        {/* Temperatura */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="thermometer" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
            <Text style={[styles.formLabel, { color: activeColors.primaryDark, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
              Temperatura corporal
            </Text>
          </View>
          <View style={[styles.inputContainer, { borderColor: activeColors.primaryLight }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(16, fontSizeMultiplier), color: activeColors.textPrimary }]}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={activeColors.textMuted}
              value={temp}
              onChangeText={setTemp}
            />
            <Text style={[styles.unitText, { color: activeColors.textMuted, fontSize: getFontSize(12, fontSizeMultiplier) }]}>°C</Text>
          </View>
        </View>

        {/* Notas y Síntomas */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="file-text" size={16} color={activeColors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.formLabel, { color: activeColors.primaryDark, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
              Notas / Síntomas adicionales
            </Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.textArea, { borderColor: activeColors.primaryLight, fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
            multiline
            numberOfLines={3}
            placeholder="Escribe cómo te sientes..."
            placeholderTextColor={activeColors.textMuted}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow }]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={[styles.saveButtonText, { fontSize: getFontSize(17, fontSizeMultiplier) }]}>
          Guardar Registro
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ===============================================================================
// 4. SUB-PANTALLA: DISPOSITIVO BLE
// ===============================================================================
interface SeniorDispositivosProps extends SeniorTabProps {
  rut: string;
  bleStatus: ConnectionStatus;
  bleDevice: any;
  bpm: number | null;
  oxygen: number | null;
}

function SeniorDispositivo({ fontSizeMultiplier, activeColors, rut, bleStatus, bleDevice, bpm, oxygen }: SeniorDispositivosProps) {
  const insets = useSafeAreaInsets();
  const [hcSupported, setHcSupported] = useState<boolean | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    manufacturer: null, model: null, firmware: null, batteryLevel: null,
    rssi: null, connectedSince: null, discoveredServices: []
  });

  useEffect(() => {
    // Check if Health Connect is supported/installed
    healthConnectService.isAvailable().then(avail => {
      setHcSupported(avail);
    });

    // Subscribe to device/service info
    const unsub = healthConnectService.addDeviceInfoListener((info) => {
      setDeviceInfo(info);
    });

    setLastSyncTime(healthConnectService.getLastSyncTime());

    return unsub;
  }, [bleStatus]);

  const handleRequestPermissions = async () => {
    const granted = await healthConnectService.requestPermissions();
    if (granted) {
      Alert.alert('Sincronización Iniciada', 'Permisos concedidos con éxito. Sincronizando datos...');
      await healthConnectService.fetchLatestHealthData(rut);
      setLastSyncTime(healthConnectService.getLastSyncTime());
    } else {
      Alert.alert(
        'Permiso Requerido',
        'No se concedieron los permisos necesarios. Habilita los permisos en la app de Health Connect.'
      );
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const success = await healthConnectService.fetchLatestHealthData(rut);
    setSyncing(false);
    setLastSyncTime(healthConnectService.getLastSyncTime());
    if (success) {
      Alert.alert('Datos Sincronizados', 'Los datos biométricos han sido importados con éxito desde Google Health Connect.');
    } else {
      Alert.alert('Sin Datos Nuevos', 'No se encontraron registros de las últimas 24 horas en Health Connect.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desvincular Health Connect',
      '¿Estás seguro de que deseas desconectar y desactivar la sincronización de Health Connect?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          onPress: async () => {
            await healthConnectService.unpairDevice(rut);
            setLastSyncTime(null);
            Alert.alert('Desvinculado', 'Se ha cancelado la sincronización con Health Connect.');
          }
        }
      ]
    );
  };

  const handleToggleSimulated = () => {
    if (healthConnectService.getIsSimulated()) {
      healthConnectService.stopSimulatedMode();
      Alert.alert('Simulador Desactivado', 'El simulador de signos vitales se ha apagado.');
    } else {
      healthConnectService.startSimulatedMode(rut);
      Alert.alert('Simulador Activado', 'Generando mediciones de pulso y oxígeno simulados.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Sincronización de Salud
      </Text>

      {/* Explicación de la sincronización nativa */}
      <View style={[styles.bleScannerCard, { backgroundColor: activeColors.primaryLight, borderColor: activeColors.border, padding: 18, borderRadius: 20 }]}>
        <View style={[styles.bleRadarCircle, { backgroundColor: activeColors.primary, shadowColor: activeColors.primary }]}>
          <Feather name="refresh-cw" size={28} color="#ffffff" />
        </View>
        <Text style={[styles.bleScanTitle, { color: activeColors.primaryDark, fontSize: getFontSize(16, fontSizeMultiplier), fontWeight: '700', textAlign: 'center', marginTop: 8 }]}>
          Google Health Connect
        </Text>
        <Text style={[styles.bleScanSub, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center', marginTop: 4, lineHeight: 18 }]}>
          Tu reloj se sincroniza de forma nativa con el sistema operativo a través de su propia aplicación (como Mi Fitness) y esta deposita los datos en Health Connect.
        </Text>
      </View>

      {/* Estado del Sincronizador */}
      <View style={styles.pairedContainer}>
        <Text style={[styles.bleSectionTitle, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          ESTADO DE LA CONEXIÓN
        </Text>

        {hcSupported === false ? (
          // Health Connect no disponible
          <View style={[styles.pairedCard, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
            <View style={styles.pairedRow}>
              <View style={[styles.watchIconContainer, { backgroundColor: '#fee2e2' }]}>
                <Feather name="alert-circle" size={20} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pairedName, { color: '#b91c1c', fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '700' }]}>
                  Health Connect No Disponible
                </Text>
                <Text style={[styles.pairedStatus, { color: '#b91c1c', fontSize: getFontSize(11, fontSizeMultiplier), marginTop: 2 }]}>
                  No compatible en este dispositivo (iOS o emulador sin soporte). Los signos vitales se simularán de forma automática.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.pairButton, { backgroundColor: healthConnectService.getIsSimulated() ? activeColors.emergency : activeColors.primary, marginTop: 12 }]}
              onPress={handleToggleSimulated}
            >
              <Text style={[styles.pairButtonText, { color: '#ffffff', fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center' }]}>
                {healthConnectService.getIsSimulated() ? 'Desactivar Simulador' : 'Activar Simulador'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : bleStatus === 'Conectado' ? (
          // Conectado y Sincronizado
          <View style={[styles.pairedCard, { backgroundColor: activeColors.primaryLight, borderColor: activeColors.primary }]}>
            <View style={styles.pairedRow}>
              <View style={[styles.watchIconContainer, { backgroundColor: activeColors.surface }]}>
                <Feather name="check-circle" size={20} color={activeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pairedName, { color: activeColors.primaryDark, fontSize: getFontSize(15, fontSizeMultiplier), fontWeight: '700' }]}>
                  {healthConnectService.getIsSimulated() ? 'Simulador Activo' : 'Sincronizado'}
                </Text>
                <Text style={[styles.pairedStatus, { color: activeColors.primaryDark, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
                  {healthConnectService.getIsSimulated()
                    ? 'Generando signos vitales simulados periódicamente.'
                    : 'Conexión establecida con Health Connect.'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {!healthConnectService.getIsSimulated() && (
                <TouchableOpacity
                  style={[styles.pairButton, { backgroundColor: activeColors.primary, flex: 1 }]}
                  onPress={handleSyncNow}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={[styles.pairButtonText, { color: '#ffffff', fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center' }]}>
                      Sincronizar Ahora
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.pairButton, { backgroundColor: activeColors.emergency, flex: healthConnectService.getIsSimulated() ? 1 : 0.8 }]}
                onPress={healthConnectService.getIsSimulated() ? handleToggleSimulated : handleDisconnect}
              >
                <Text style={[styles.pairButtonText, { color: '#ffffff', fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center' }]}>
                  {healthConnectService.getIsSimulated() ? 'Desactivar Simulador' : 'Desvincular'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : bleStatus === 'Conectando' ? (
          // Sincronizando en progreso
          <View style={[styles.pairedCard, { backgroundColor: activeColors.oxygenLight, borderColor: activeColors.border }]}>
            <View style={styles.pairedRow}>
              <ActivityIndicator size="small" color={activeColors.oxygen} style={{ marginRight: 10 }} />
              <View>
                <Text style={[styles.pairedName, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '700' }]}>
                  Sincronizando...
                </Text>
                <Text style={[styles.pairedStatus, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
                  Consultando base de datos de Google Health Connect...
                </Text>
              </View>
            </View>
          </View>
        ) : (
          // Desconectado o Requiere Permisos
          <View style={[styles.pairedCard, { backgroundColor: '#f1f5f9', borderColor: activeColors.border }]}>
            <View style={styles.pairedRow}>
              <View style={[styles.watchIconContainer, { backgroundColor: activeColors.surface }]}>
                <Feather name="refresh-cw" size={20} color={activeColors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pairedName, { color: activeColors.textSecondary, fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '600' }]}>
                  Sin Vinculación Activa
                </Text>
                <Text style={[styles.pairedStatus, { color: activeColors.textMuted, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
                  Requiere otorgar permisos de lectura de salud para funcionar.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.pairButton, { backgroundColor: activeColors.primary, flex: 1.2 }]}
                onPress={handleRequestPermissions}
              >
                <Text style={[styles.pairButtonText, { color: '#ffffff', fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center' }]}>
                  Vincular Health Connect
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pairButton, { backgroundColor: activeColors.textSecondary, flex: 0.8 }]}
                onPress={handleToggleSimulated}
              >
                <Text style={[styles.pairButtonText, { color: '#ffffff', fontSize: getFontSize(12, fontSizeMultiplier), textAlign: 'center' }]}>
                  Simular
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Visualización de Datos Biométricos Sincronizados */}
      <View style={styles.foundContainer}>
        <Text style={[styles.bleSectionTitle, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          ÚLTIMOS SIGNOS VITALES IMPORTADOS (24 HORAS)
        </Text>

        <View style={{ gap: 10, marginTop: 8 }}>
          {/* Card de Frecuencia Cardíaca */}
          <View style={[styles.deviceCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1 }]}>
            <View style={[styles.deviceCardLeft, { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }]}>
              <View style={[styles.deviceIconBg, { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: activeColors.heartLight }]}>
                <Feather name="heart" size={18} color={activeColors.heart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '700' }}>
                  Frecuencia Cardíaca (Pulso)
                </Text>
                <Text style={{ color: activeColors.textMuted, fontSize: getFontSize(11, fontSizeMultiplier), marginTop: 2 }}>
                  Health Connect · Últimas 24 horas
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: activeColors.heart, fontSize: getFontSize(22, fontSizeMultiplier), fontWeight: '800' }}>
                {bpm !== null ? `${bpm}` : '--'}
              </Text>
              <Text style={{ color: activeColors.textMuted, fontSize: getFontSize(9, fontSizeMultiplier) }}>
                lpm
              </Text>
            </View>
          </View>

          {/* Card de Saturación de Oxígeno (SpO2) */}
          <View style={[styles.deviceCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1 }]}>
            <View style={[styles.deviceCardLeft, { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }]}>
              <View style={[styles.deviceIconBg, { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: activeColors.oxygenLight }]}>
                <Feather name="wind" size={18} color={activeColors.oxygen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier), fontWeight: '700' }}>
                  Saturación de Oxígeno (SpO2)
                </Text>
                <Text style={{ color: activeColors.textMuted, fontSize: getFontSize(11, fontSizeMultiplier), marginTop: 2 }}>
                  Health Connect · Últimas 24 horas
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: activeColors.oxygen, fontSize: getFontSize(22, fontSizeMultiplier), fontWeight: '800' }}>
                {oxygen !== null ? `${oxygen}` : '--'}
              </Text>
              <Text style={{ color: activeColors.textMuted, fontSize: getFontSize(9, fontSizeMultiplier) }}>
                %
              </Text>
            </View>
          </View>

          {/* Banner de última sincronización */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 }}>
            <Feather name="clock" size={12} color={activeColors.textMuted} />
            <Text style={{ fontSize: getFontSize(11, fontSizeMultiplier), color: activeColors.textMuted }}>
              Última Sincronización: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Ninguna'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ===============================================================================
// 5. SUB-PANTALLA: CONFIGURACIÓN Y ACCESIBILIDAD (NUEVA PESTAÑA)
// ===============================================================================
interface SeniorConfiguracionProps {
  rut: string;
  name: string;
  setName: (n: string) => void;
  email: string;
  setEmail: (e: string) => void;
  avatar: string;
  setAvatar: (a: string) => void;
  fontSizeMultiplier: number;
  setFontSizeMultiplier: (m: number) => void;
  colorblindMode: boolean;
  setColorblindMode: (c: boolean) => void;
  activeColors: any;
  onProfileUpdated: () => void;
}

function SeniorConfiguracion({
  rut,
  name,
  setName,
  email,
  setEmail,
  avatar,
  setAvatar,
  fontSizeMultiplier,
  setFontSizeMultiplier,
  colorblindMode,
  setColorblindMode,
  activeColors,
  onProfileUpdated,
}: SeniorConfiguracionProps) {
  const insets = useSafeAreaInsets();
  const { updateSessionName } = useAuth();
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['👴', '👵', '👨', '👩', '👤', '❤️'];

  const handleSaveProfile = async () => {
    if (!name || !email) {
      Alert.alert('Datos Incompletos', 'El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (pass && pass.length < 6) {
      Alert.alert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pass && pass !== confirmPass) {
      Alert.alert('Seguridad', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    const db = getDB();
    try {
      // 1. Update nombres and email in adulto_mayor table
      await db.runAsync(
        "UPDATE adulto_mayor SET nombres = ?, email = ? WHERE rut = ?",
        [name, email, rut]
      );

      // 2. If password was typed, hash and update users table
      if (pass) {
        const hashedPassword = sha256(pass);
        await db.runAsync(
          "UPDATE users SET psswd_hash = ? WHERE rut = ?",
          [hashedPassword, rut]
        );
      }

      // 3. Update reactively in AuthContext so the top bar updates
      updateSessionName(name);

      // 4. Trigger profile re-fetch in senior.tsx
      onProfileUpdated();

      Alert.alert(
        'Configuración Guardada',
        'Tus cambios de perfil y accesibilidad se han guardado con éxito.',
        [{ text: 'Aceptar' }]
      );

      // Clear password fields
      setPass('');
      setConfirmPass('');
    } catch (error) {
      console.error('Error saving profile changes:', error);
      Alert.alert('Error', 'Hubo un problema al guardar los cambios en la base de datos.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 110 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Configuración
      </Text>

      {/* SECCIÓN 1: PERFIL */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        PERFIL DE USUARIO
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Selector de Avatar */}
        <Text style={[styles.formLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 8 }]}>
          Foto de Perfil (Selecciona tu Avatar)
        </Text>
        <View style={styles.avatarPickerRow}>
          {avataresDisponibles.map((av) => (
            <TouchableOpacity
              key={av}
              style={[
                styles.avatarPickerItem,
                avatar === av && { borderColor: activeColors.primary, backgroundColor: activeColors.primaryLight }
              ]}
              onPress={() => setAvatar(av)}
            >
              <Text style={{ fontSize: 26 }}>{av}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Nombre */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
            Nombre de Mostrar
          </Text>
          <View style={[styles.inputContainer, { borderColor: activeColors.border }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Input Correo */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
            Correo Electrónico
          </Text>
          <View style={[styles.inputContainer, { borderColor: activeColors.border }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
              value={email}
              keyboardType="email-address"
              onChangeText={setEmail}
            />
          </View>
        </View>
      </View>

      {/* SECCIÓN 2: ACCESIBILIDAD E INTERFAZ (REQUERIDO) */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        ACCESIBILIDAD E INTERFAZ
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Tamaño de Letra Segmentado */}
        <View style={styles.settingsOptionRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
              Tamaño de Letras
            </Text>
            <Text style={[styles.optionDesc, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Aumenta el tamaño de los textos para leer mejor.
            </Text>
          </View>
        </View>

        <View style={styles.fontScaleSegmentContainer}>
          <TouchableOpacity
            style={[
              styles.fontScaleSegment,
              fontSizeMultiplier === 1.0 && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }
            ]}
            onPress={() => setFontSizeMultiplier(1.0)}
          >
            <Text style={[
              styles.segmentText,
              { fontSize: 12 },
              fontSizeMultiplier === 1.0 && { color: '#ffffff', fontWeight: '700' }
            ]}>
              Normal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fontScaleSegment,
              fontSizeMultiplier === 1.2 && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }
            ]}
            onPress={() => setFontSizeMultiplier(1.2)}
          >
            <Text style={[
              styles.segmentText,
              { fontSize: 14 },
              fontSizeMultiplier === 1.2 && { color: '#ffffff', fontWeight: '700' }
            ]}>
              Grande
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fontScaleSegment,
              fontSizeMultiplier === 1.4 && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }
            ]}
            onPress={() => setFontSizeMultiplier(1.4)}
          >
            <Text style={[
              styles.segmentText,
              { fontSize: 16 },
              fontSizeMultiplier === 1.4 && { color: '#ffffff', fontWeight: '700' }
            ]}>
              Extra G.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Modo Daltonismo Switch */}
        <View style={styles.settingsOptionSwitchRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.optionTitle, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
              Modo Daltonismo
            </Text>
            <Text style={[styles.optionDesc, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Optimiza la paleta visual con alto contraste accesible azul-amarillo.
            </Text>
          </View>
          <Switch
            value={colorblindMode}
            onValueChange={setColorblindMode}
            trackColor={{ false: '#cbd5e1', true: activeColors.primaryLight }}
            thumbColor={colorblindMode ? activeColors.primary : '#f4f4f5'}
          />
        </View>

      </View>

      {/* SECCIÓN 3: SEGURIDAD (CONTRASENAS) */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        SEGURIDAD Y ACCESO
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Nueva Contraseña */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
            Nueva Contraseña
          </Text>
          <View style={[styles.inputContainer, { borderColor: activeColors.border }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
              placeholder="Min. 6 caracteres"
              placeholderTextColor={activeColors.textMuted}
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />
          </View>
        </View>

        {/* Confirmar Contraseña */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
            Confirmar Contraseña
          </Text>
          <View style={[styles.inputContainer, { borderColor: activeColors.border }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
              placeholder="Repite la contraseña"
              placeholderTextColor={activeColors.textMuted}
              secureTextEntry
              value={confirmPass}
              onChangeText={setConfirmPass}
            />
          </View>
        </View>
      </View>

      {/* Guardar Perfil */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow, marginTop: 10 }]}
        onPress={handleSaveProfile}
        activeOpacity={0.85}
      >
        <Text style={[styles.saveButtonText, { fontSize: getFontSize(17, fontSizeMultiplier) }]}>
          Guardar Ajustes
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Estilos Generales ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Espacio para el Navbar flotante de 5 botones
  },

  // Navbar inferior responsivo (5 Botones)
  navbar: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    height: 72,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconContainer: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },

  // 1. INICIO STYLES
  mapContainer: {
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  radarCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  radarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  locationTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontWeight: '700',
  },
  userCard: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffd166',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: {
    fontSize: 28,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontWeight: '800',
  },
  userUpdate: {
    marginTop: 1,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  deviceStatusCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  deviceTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusTag: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  deviceTagText: {
    fontWeight: '700',
  },
  updateBtn: {
    marginLeft: 'auto',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  updateBtnText: {
    fontWeight: '700',
  },
  wearableInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  wearableText: {
    fontWeight: '500',
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: (width - 50) / 2,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
    height: 128,
  },
  metricIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontWeight: '800',
  },
  metricValueText: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  metricUnit: {
    marginTop: -1,
  },
  metricLabel: {
    fontWeight: '500',
    marginTop: 4,
  },
  quickActionsContainer: {
    marginBottom: 12,
  },
  emergencyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  emergencyActionCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 15,
  },
  actionCardSub: {
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '500',
  },

  // 2. SALUD STYLES
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  chartCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartLabel: {
    fontWeight: '700',
    marginBottom: 14,
  },
  giftedChartWrapper: {
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    height: 135,
    overflow: 'hidden',
  },
  gridContainer: {
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  gridLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  gridValue: {
    fontWeight: '800',
    marginTop: 4,
  },
  gridSub: {
    marginTop: 1,
  },
  gridStatusOk: {
    fontWeight: '700',
    marginTop: 6,
  },
  actionButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // 3. REGISTRO STYLES
  infoBanner: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    color: '#0369a1',
    lineHeight: 16,
    fontWeight: '500',
  },
  formContainer: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 16,
  },
  formRow: {
    width: '100%',
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formLabel: {
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  formInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '600',
  },
  unitText: {
    fontWeight: '700',
    paddingRight: 16,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 80,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  historyBtn: {
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    fontWeight: '700',
  },

  // 4. BLE STYLES
  bleScannerCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bleRadarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bleScanTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  bleScanSub: {
    opacity: 0.8,
    textAlign: 'center',
  },
  pairedContainer: {
    marginBottom: 20,
  },
  bleSectionTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  pairedCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  pairedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  watchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairedName: {
    fontWeight: '700',
  },
  pairedStatus: {
    fontWeight: '500',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  foundContainer: {
    marginBottom: 12,
  },
  bleInfoCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    marginTop: 4,
    marginBottom: 20,
  },
  foundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 4,
  },
  scanBtnText: {
    fontWeight: '700',
  },
  devicesList: {
    gap: 10,
  },
  deviceCard: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  deviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontWeight: '700',
  },
  deviceDesc: {
    fontWeight: '500',
  },
  pairButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pairButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // 5. CONFIGURACIÓN STYLES
  settingsGroupTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 18,
    paddingLeft: 4,
  },
  settingsCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 8,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  avatarPickerItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsFormRow: {
    width: '100%',
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsOptionSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontWeight: '700',
  },
  optionDesc: {
    fontWeight: '500',
    marginTop: 2,
  },
  fontScaleSegmentContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    height: 48,
  },
  fontScaleSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  segmentText: {
    color: '#475569',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 4,
    width: '100%',
  },
});
