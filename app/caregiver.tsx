import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
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
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistorialMedicosModal from '@/components/HistorialMedicosModal';

import { useAuth } from '@/contexts/AuthContext';
import { sha256 } from '@/db/controllers/authController';
import { getDB } from '@/db/dbInstance';
import { cleanRut, formatRut } from '@/utils/rutFormatter';
import Svg, { Line, Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';

// ─── Helpers para GPS, Edad y Tiempos Geográficos ─────────────────────────────
function calculateAge(birthdayStr: string): number {
  if (!birthdayStr) return 75;
  try {
    const birthDate = new Date(birthdayStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return 75;
  }
}

function getRelativeTimeString(isoString: string): string {
  if (!isoString) return 'sin datos';
  try {
    const past = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'ahora mismo';
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    return `hace ${Math.floor(diffHours / 24)} días`;
  } catch (e) {
    return 'hace poco';
  }
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
let MapView: any;
let Marker: any;
let Circle: any;

if (Platform.OS === 'web') {
  const WebMapMock = ({ children, style }: any) => {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, padding: 16 }]}>
        <Feather name="map" size={40} color="#10b981" style={{ marginBottom: 6 }} />
        <Text style={{ color: '#047857', fontWeight: '700', fontSize: 14 }}>Mapa de Pacientes</Text>
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

// ─── Paleta de Colores por Defecto (Tema Verde Bosque / Esmeralda) ─────────────
const DEFAULT_COLORS = {
  background: '#f2f9f9',       // mint-50
  surface: '#ffffff',
  primary: '#10b981',          // esmeralda-500
  primaryLight: '#d1fae5',     // esmeralda-100
  primaryDark: '#047857',      // esmeralda-700
  primaryShadow: '#a7f3d0',
  textPrimary: '#1e293b',      // slate-800
  textSecondary: '#64748b',    // slate-500
  textMuted: '#94a3b8',        // slate-400
  border: '#e2e8f0',          // slate-200
  cardBg: '#ffffff',
  headerBg: '#1b4332',         // Verde Bosque Profundo para Cuidador

  // Colores temáticos
  heart: '#ec4899',            // pink-500
  heartLight: '#fce7f3',       // pink-100
  activity: '#f97316',         // orange-500
  activityLight: '#ffedd5',    // orange-100
  oxygen: '#6366f1',           // indigo-500
  oxygenLight: '#e0e7ff',      // indigo-100

  // Alertas
  emergency: '#ef4444',        // rojo
  emergencyBg: '#fee2e2',
  sos: '#ea580c',              // naranja fuerte
  sosBg: '#ffedd5',
} as const;

// ─── Paleta de Alto Contraste (Modo Daltonismo) ───────────────────────────────
const COLORBLIND_COLORS = {
  background: '#f8fafc',       // slate-50
  surface: '#ffffff',
  primary: '#1d4ed8',          // Royal Blue (Altamente contrastante y seguro)
  primaryLight: '#dbeafe',     // Blue-100
  primaryDark: '#1e40af',      // Blue-800
  primaryShadow: '#bfdbfe',
  textPrimary: '#0f172a',      // Charcoal (Negro suave)
  textSecondary: '#334155',    // Slate-700
  textMuted: '#64748b',        // Slate-500
  border: '#cbd5e1',          // Slate-300
  cardBg: '#ffffff',
  headerBg: '#0f172a',         // Carbón oscuro para alto contraste

  // Colores temáticos reconfigurados
  heart: '#d97706',            // Ámbar/Naranja de alto contraste
  heartLight: '#fef3c7',
  activity: '#1e40af',         // Azul marino
  activityLight: '#dbeafe',
  oxygen: '#0f172a',
  oxygenLight: '#e2e8f0',

  // Alertas accesibles
  emergency: '#b91c1c',        // Rojo oscuro
  emergencyBg: '#fee2e2',
  sos: '#c2410c',
  sosBg: '#ffedd5',
} as const;

// Dimensiones globales
const { width } = Dimensions.get('window');

// Helper de accesibilidad para cálculo dinámico del tamaño de fuente
const getFontSize = (baseSize: number, multiplier: number) => {
  return Math.round(baseSize * multiplier);
};

// Estructura de Datos de Pacientes Hardcodeados
interface Paciente {
  id: number;
  nombre: string;
  rut: string;
  edad: number;
  avatar: string;
  estado: string;
  lpm: number;
  esSimulado?: boolean;
  direccion: string;
  tiempoDato: string;
  alertaActiva: boolean;
  alertaTitulo?: string;
  alertaDesc?: string;
  alertaGravedad?: 'alta' | 'media' | 'baja';
  presion: string;
  glucosa: number | null;
  temperatura: number | null;
  oxigeno: number;
  estres: number;
  oxigenoHistorico: number[];
  estresHistorico: number[];
  hasGps?: boolean;
  coordenadas: {
    latitude: number;
    longitude: number;
  };
  pulsoHistorico: number[];
  actividadSemana: number[]; // horas activas lun-dom
  latitud_segura?: number;
  longitud_segura?: number;
  radio_seguro?: number;
}

const PACIENTES_DATA: Paciente[] = [
  {
    id: 1,
    nombre: 'Acdiel Bombin',
    rut: '12.345.678-9',
    edad: 78,
    avatar: '👴',
    estado: 'Alerta',
    lpm: 89,
    direccion: 'Av. Principal 345',
    tiempoDato: 'hace 2 min',
    alertaActiva: true,
    alertaTitulo: 'Alerta: Pulso elevado',
    alertaDesc: '89 lpm detectado hace 15 min · umbral: 85 lpm',
    alertaGravedad: 'alta',
    presion: '128/82',
    glucosa: 118,
    temperatura: 36.5,
    oxigeno: 94,
    estres: 75,
    oxigenoHistorico: [98, 97, 98, 96, 98, 97, 94],
    estresHistorico: [35, 40, 38, 45, 30, 35, 75],
    coordenadas: { latitude: -33.4489, longitude: -70.6693 },
    pulsoHistorico: [72, 75, 70, 89, 72, 74, 72],
    actividadSemana: [6, 8, 5, 2, 6, 7, 6.5],
  },
  {
    id: 2,
    nombre: 'Rosa Vega',
    rut: '99.999.999-9',
    edad: 71,
    avatar: '👵',
    estado: 'Normal',
    lpm: 68,
    direccion: 'Zona Segura',
    tiempoDato: 'hace 5 min',
    alertaActiva: false,
    presion: '120/75',
    glucosa: 105,
    temperatura: 36.4,
    oxigeno: 98,
    estres: 35,
    oxigenoHistorico: [98, 97, 98, 96, 98, 97, 98],
    estresHistorico: [35, 40, 38, 45, 30, 35, 33],
    coordenadas: { latitude: -33.4515, longitude: -70.6650 },
    pulsoHistorico: [66, 68, 67, 69, 68, 70, 68],
    actividadSemana: [5, 6, 7, 8, 6.5, 7, 7.5],
  },
  {
    id: 3,
    nombre: 'Pedro Soto',
    rut: '88.888.888-8',
    edad: 83,
    avatar: '👴',
    estado: 'Normal',
    lpm: 74,
    direccion: 'Casa',
    tiempoDato: 'hace 12 min',
    alertaActiva: false,
    presion: '132/85',
    glucosa: 122,
    temperatura: 36.6,
    oxigeno: 97,
    estres: 42,
    oxigenoHistorico: [97, 98, 97, 97, 96, 98, 97],
    estresHistorico: [40, 42, 45, 38, 41, 43, 42],
    coordenadas: { latitude: -33.4450, longitude: -70.6720 },
    pulsoHistorico: [70, 72, 73, 71, 74, 73, 74],
    actividadSemana: [4, 5, 5.5, 4.5, 5, 5, 4.8],
  },
];

// Estructura de Datos de Alertas Hardcodeadas
interface AlertaItem {
  id: number;
  paciente: string;
  avatar: string;
  tipo: string;
  desc: string;
  tiempo: string;
  fuente: string;
  gravedad: 'alta' | 'media' | 'baja';
  activa: boolean;
}

const ALERTAS_DATA: AlertaItem[] = [
  {
    id: 1,
    paciente: 'Carlos Ruiz',
    avatar: '👴',
    tipo: 'Pulso elevado',
    desc: '89 lpm · supera umbral configurado (85 lpm)',
    tiempo: 'Hoy, 14:32',
    fuente: 'Wearable BLE',
    gravedad: 'alta',
    activa: true,
  },
  {
    id: 2,
    paciente: 'Carlos Ruiz',
    avatar: '👴',
    tipo: 'Inactividad prolongada',
    desc: 'Sin movimiento registrado por 4h (horario diurno)',
    tiempo: 'Hoy, 10:15',
    fuente: 'Acelerómetro GPS',
    gravedad: 'media',
    activa: true,
  },
  {
    id: 3,
    paciente: 'Rosa Vega',
    avatar: '👵',
    tipo: 'Salida de zona segura',
    desc: 'El paciente salió del área delimitada',
    tiempo: 'Ayer, 16:50',
    fuente: 'GPS',
    gravedad: 'alta',
    activa: false,
  },
  {
    id: 4,
    paciente: 'Pedro Soto',
    avatar: '👴',
    tipo: 'Pulso bajo',
    desc: '52 lpm detectado durante el sueño',
    tiempo: 'Ayer, 02:14',
    fuente: 'Wearable BLE',
    gravedad: 'baja',
    activa: false,
  },
];

export default function CaregiverApp() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const [tab, setTab] = useState<'inicio' | 'pacientes' | 'alertas' | 'configuracion'>('inicio');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { userSession } = useAuth();
  const cgRut = userSession?.rut || '98.765.432-1';

  // ─── Estados de Perfil Editables del Cuidador ──────────────────────────────
  const [name, setName] = useState('María');
  const [email, setEmail] = useState('maria.cuidadora@innercore.cl');
  const [avatar, setAvatar] = useState('👩‍⚕️');

  // ─── Estados Clínicos y Pacientes SQLite ──────────────────────────────────
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [alerts, setAlerts] = useState<AlertaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Estados de Accesibilidad Globales ────────────────────────────────────
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0); // 1.0, 1.2, 1.4
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Obtener colores basados en el modo de daltonismo activo
  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

  const loadPatientsAndAlerts = async () => {
    const db = getDB();
    try {
      // 1. Fetch caregiver details
      const cg = await db.getFirstAsync<{ nombres: string; email: string }>(
        "SELECT nombres, email FROM cuidador WHERE rut = ?", [cgRut]
      );
      if (cg) {
        setName(cg.nombres);
        setEmail(cg.email || '');
      }

      // 2. Fetch linked senior patients
      const seniors = await db.getAllAsync<{
        rut: string;
        nombres: string;
        apellidos: string;
        nacimiento: string;
        residencia: string;
        latitud_segura: number;
        longitud_segura: number;
        radio_seguro: number;
        vinculado_en: string;
      }>(
        `SELECT am.*, ac.vinculado_en FROM adulto_mayor am
         JOIN adulto_cuidador ac ON am.rut = ac.adulto_rut
         WHERE ac.cuidador_rut = ?`,
        [cgRut]
      );

      const loadedPatients: Paciente[] = [];
      const newAlerts: AlertaItem[] = [];
      let alertCount = 1;

      for (const s of seniors) {
        const idVal = parseInt(s.rut.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 100000);

        // Fetch latest heart rate
        const latestHr = await db.getFirstAsync<{ bpm: number; fuente: string; timestamp: string }>(
          "SELECT bpm, fuente, timestamp FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch last 7 heart rates for historical curve
        const hrHistory = await db.getAllAsync<{ bpm: number }>(
          "SELECT bpm FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 7",
          [s.rut]
        );
        const pulsoHistorico = hrHistory.reverse().map(h => h.bpm);
        if (pulsoHistorico.length === 0) {
          pulsoHistorico.push(...[70, 72, 71, 73, 72, 74, 72]); // standard fallback
        }

        // Fetch latest SpO2
        const latestO2 = await db.getFirstAsync<{ porcentaje: number; timestamp: string }>(
          "SELECT porcentaje, timestamp FROM oxigeno_sangre WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch latest Stress
        const latestStress = await db.getFirstAsync<{ nivel: number; timestamp: string }>(
          "SELECT valor AS nivel, timestamp FROM estres WHERE userId = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch last 7 SpO2 for historical curve
        const o2History = await db.getAllAsync<{ porcentaje: number }>(
          "SELECT porcentaje FROM oxigeno_sangre WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 7",
          [s.rut]
        );
        const oxigenoHistorico = o2History.reverse().map(o => o.porcentaje);
        if (oxigenoHistorico.length === 0) {
          oxigenoHistorico.push(...[98, 97, 98, 96, 98, 97, 98]);
        }

        // Fetch last 7 Stress for historical curve
        const stressHistory = await db.getAllAsync<{ nivel: number }>(
          "SELECT valor AS nivel FROM estres WHERE userId = ? ORDER BY timestamp DESC LIMIT 7",
          [s.rut]
        );
        const estresHistorico = stressHistory.reverse().map(e => e.nivel);
        if (estresHistorico.length === 0) {
          estresHistorico.push(...[35, 40, 38, 45, 30, 35, 33]);
        }

        // Fetch latest GPS coordinate
        const latestGps = await db.getFirstAsync<{ latitud: number; longitud: number; timestamp: string }>(
          "SELECT latitud, longitud, timestamp FROM gps_registro WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch latest activity state
        const latestAct = await db.getFirstAsync<{ estado: string; timestamp: string }>(
          "SELECT estado, timestamp FROM actividad_registro WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch latest clinical record (pressure, glucose, temperature)
        const latestClin = await db.getFirstAsync<{ sistolica: number; diastolica: number; glucosa: number; temperatura: number; timestamp: string }>(
          "SELECT sistolica, diastolica, glucosa, temperatura, timestamp FROM registro_clinico WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Calculations & Statuses
        const age = calculateAge(s.nacimiento);
        const lpm = latestHr?.bpm ?? 72;
        const currentLat = latestGps?.latitud ?? s.latitud_segura;
        const currentLon = latestGps?.longitud ?? s.longitud_segura;
        const hasGps = latestGps !== null;

        // Check if out of safe zone
        let isOut = false;
        let distance = 0;
        if (latestGps && s.latitud_segura !== 0 && s.longitud_segura !== 0) {
          distance = getDistanceMeters(latestGps.latitud, latestGps.longitud, s.latitud_segura, s.longitud_segura);
          if (distance > s.radio_seguro) {
            isOut = true;
          }
        }

        // Safe alert check variables
        const vinculacionTime = s.vinculado_en || '1970-01-01T00:00:00.000Z';

        // Check alerts
        let alertaActiva = false;
        let alertaTitulo = '';
        let alertaDesc = '';
        let alertaGravedad: 'alta' | 'media' | 'baja' = 'baja';

        // 1. High pulse alert
        if (latestHr && latestHr.timestamp >= vinculacionTime && lpm > 85) {
          alertaActiva = true;
          alertaTitulo = 'Alerta: Pulso elevado';
          alertaDesc = `${lpm} lpm detectado · supera el umbral configurado (85 lpm)`;
          alertaGravedad = 'alta';

          newAlerts.push({
            id: alertCount++,
            paciente: `${s.nombres} ${s.apellidos}`,
            avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
            tipo: 'Pulso elevado',
            desc: alertaDesc,
            tiempo: latestHr ? getRelativeTimeString(latestHr.timestamp) : 'Reciente',
            fuente: latestHr?.fuente === 'simulado' ? 'Wearable (Simulado)' : 'Wearable BLE',
            gravedad: 'alta',
            activa: true
          });
        }

        // 2. Safe zone alert
        if (latestGps && latestGps.timestamp >= vinculacionTime && isOut) {
          alertaActiva = true;
          alertaTitulo = 'Alerta: Salida de zona segura';
          alertaDesc = `El paciente se encuentra a ${Math.round(distance)}m del centro (límite: ${s.radio_seguro}m)`;
          alertaGravedad = 'alta';

          newAlerts.push({
            id: alertCount++,
            paciente: `${s.nombres} ${s.apellidos}`,
            avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
            tipo: 'Salida de zona segura',
            desc: alertaDesc,
            tiempo: latestGps ? getRelativeTimeString(latestGps.timestamp) : 'Reciente',
            fuente: 'GPS Celular',
            gravedad: 'alta',
            activa: true
          });
        }

        // 3. Inactivity alert
        if (latestAct && latestAct.timestamp >= vinculacionTime && latestAct.estado === 'Sedentario') {
          const isAcdiel = s.nombres === 'Acdiel';
          if (isAcdiel) {
            alertaActiva = true;
            alertaTitulo = 'Alerta: Inactividad prolongada';
            alertaDesc = 'Sin movimiento registrado por más de 4 horas';
            alertaGravedad = 'media';

            newAlerts.push({
              id: alertCount++,
              paciente: `${s.nombres} ${s.apellidos}`,
              avatar: '👴',
              tipo: 'Inactividad prolongada',
              desc: alertaDesc,
              tiempo: latestAct ? getRelativeTimeString(latestAct.timestamp) : 'Reciente',
              fuente: 'Acelerómetro',
              gravedad: 'media',
              activa: true
            });
          }
        }

        // Parse historical alerts (older than the latest ones)
        // 1. Historical High / Low Pulses
        const pastHrs = await db.getAllAsync<{ bpm: number; fuente: string; timestamp: string }>(
          `SELECT bpm, fuente, timestamp FROM frecuencia_cardiaca 
           WHERE adulto_rut = ? AND (bpm > 85 OR bpm < 55) AND timestamp >= ?
           ORDER BY timestamp DESC LIMIT 5`,
          [s.rut, vinculacionTime]
        );
        for (const pastHr of pastHrs) {
          // If this matches the latest active hr, skip so we don't duplicate
          if (latestHr && pastHr.timestamp === latestHr.timestamp && lpm > 85) {
            continue;
          }
          newAlerts.push({
            id: alertCount++,
            paciente: `${s.nombres} ${s.apellidos}`,
            avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
            tipo: pastHr.bpm > 85 ? 'Pulso elevado' : 'Pulso bajo',
            desc: pastHr.bpm > 85
              ? `${pastHr.bpm} lpm detectado · supera el umbral configurado (85 lpm)`
              : `${pastHr.bpm} lpm detectado · por debajo del umbral de sueño (55 lpm)`,
            tiempo: getRelativeTimeString(pastHr.timestamp),
            fuente: pastHr.fuente === 'simulado' ? 'Wearable (Simulado)' : 'Wearable BLE',
            gravedad: pastHr.bpm > 85 ? 'alta' : 'baja',
            activa: false
          });
        }

        // 2. Historical GPS out-of-bounds
        const pastGps = await db.getAllAsync<{ latitud: number; longitud: number; timestamp: string }>(
          `SELECT latitud, longitud, timestamp FROM gps_registro 
           WHERE adulto_rut = ? AND timestamp >= ?
           ORDER BY timestamp DESC LIMIT 5`,
          [s.rut, vinculacionTime]
        );
        for (const pg of pastGps) {
          if (latestGps && pg.timestamp === latestGps.timestamp && isOut) {
            continue;
          }
          if (s.latitud_segura !== 0 && s.longitud_segura !== 0) {
            const dist = getDistanceMeters(pg.latitud, pg.longitud, s.latitud_segura, s.longitud_segura);
            if (dist > s.radio_seguro) {
              newAlerts.push({
                id: alertCount++,
                paciente: `${s.nombres} ${s.apellidos}`,
                avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
                tipo: 'Salida de zona segura',
                desc: `El paciente se encontraba a ${Math.round(dist)}m del centro (límite: ${s.radio_seguro}m)`,
                tiempo: getRelativeTimeString(pg.timestamp),
                fuente: 'GPS Celular',
                gravedad: 'alta',
                activa: false
              });
            }
          }
        }

        // 3. Historical Inactivity
        const pastActs = await db.getAllAsync<{ estado: string; timestamp: string }>(
          `SELECT estado, timestamp FROM actividad_registro 
           WHERE adulto_rut = ? AND estado = 'Sedentario' AND timestamp >= ?
           ORDER BY timestamp DESC LIMIT 3`,
          [s.rut, vinculacionTime]
        );
        for (const pa of pastActs) {
          if (latestAct && pa.timestamp === latestAct.timestamp && latestAct.estado === 'Sedentario' && s.nombres === 'Acdiel') {
            continue;
          }
          if (s.nombres === 'Acdiel') {
            newAlerts.push({
              id: alertCount++,
              paciente: `${s.nombres} ${s.apellidos}`,
              avatar: '👴',
              tipo: 'Inactividad prolongada',
              desc: 'Sin movimiento registrado por más de 4 horas',
              tiempo: getRelativeTimeString(pa.timestamp),
              fuente: 'Acelerómetro',
              gravedad: 'media',
              activa: false
            });
          }
        }

        // Parse clinical values
        const presion = latestClin ? `${latestClin.sistolica}/${latestClin.diastolica}` : 'Sin datos registrados';
        const glucosa = latestClin ? latestClin.glucosa : null;
        const temperatura = latestClin ? latestClin.temperatura : null;

        // Calculate location label
        let direccion = 'Zona Segura';
        if (!hasGps) {
          direccion = 'Ubicación no disponible aún';
        } else if (isOut) {
          direccion = 'Fuera de Zona Segura';
        } else if (latestAct?.estado === 'Sedentario') {
          direccion = 'En Reposo';
        } else if (latestAct?.estado === 'En movimiento') {
          direccion = 'En Movimiento';
        }

        const tiempoDato = latestHr
          ? getRelativeTimeString(latestHr.timestamp)
          : latestGps
            ? getRelativeTimeString(latestGps.timestamp)
            : 'hace unos momentos';

        // Load hours active sum grouped by day for last 7 days
        const actHistory = await db.getAllAsync<{ day: string; active_seconds: number }>(
          `SELECT date(timestamp) as day, SUM(duracion_segundos) as active_seconds
           FROM actividad_registro
           WHERE adulto_rut = ? AND estado = 'En movimiento' AND timestamp >= date('now', '-7 days')
           GROUP BY day
           ORDER BY day ASC`,
          [s.rut]
        );
        const activeHours = [0, 0, 0, 0, 0, 0, 0];
        const baseTime = Date.now();
        const days = (d: number) => d * 24 * 60 * 60 * 1000;
        for (let i = 0; i < 7; i++) {
          const targetDayStr = new Date(baseTime - days(6 - i)).toISOString().split('T')[0];
          const record = actHistory.find(h => h.day === targetDayStr);
          activeHours[i] = record ? parseFloat((record.active_seconds / 3600).toFixed(1)) : 0.0;
        }

        loadedPatients.push({
          id: idVal,
          rut: s.rut,
          nombre: `${s.nombres} ${s.apellidos}`,
          edad: age,
          avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
          estado: alertaActiva ? 'Alerta' : 'Normal',
          lpm,
          esSimulado: latestHr?.fuente === 'simulado',
          direccion,
          tiempoDato,
          alertaActiva,
          alertaTitulo: alertaActiva ? alertaTitulo : undefined,
          alertaDesc: alertaActiva ? alertaDesc : undefined,
          alertaGravedad: alertaActiva ? alertaGravedad : undefined,
          presion,
          glucosa,
          temperatura,
          oxigeno: latestO2?.porcentaje ?? 98,
          estres: latestStress?.nivel ?? 35,
          oxigenoHistorico,
          estresHistorico,
          hasGps,
          coordenadas: {
            latitude: currentLat,
            longitude: currentLon
          },
          pulsoHistorico,
          actividadSemana: activeHours,
          latitud_segura: s.latitud_segura,
          longitud_segura: s.longitud_segura,
          radio_seguro: s.radio_seguro
        });
      }

      // 3. Fetch alerts directly from the SQLite alertas table
      try {
        const sqliteAlerts = await db.getAllAsync<{ id: number; tipo: string; pacienteId: string; mensaje: string; timestamp: string }>(
          "SELECT * FROM alertas ORDER BY timestamp DESC LIMIT 20"
        );
        for (const sa of sqliteAlerts) {
          const patientMatch = loadedPatients.find(p => p.rut === sa.pacienteId);
          const patientName = patientMatch ? patientMatch.nombre : 'Adulto Mayor';
          const patientAvatar = patientMatch ? patientMatch.avatar : '👴';

          const isRecent = (Date.now() - new Date(sa.timestamp).getTime()) < 5 * 60 * 1000;

          newAlerts.unshift({
            id: alertCount++,
            paciente: patientName,
            avatar: patientAvatar,
            tipo: sa.tipo,
            desc: sa.mensaje,
            tiempo: getRelativeTimeString(sa.timestamp),
            fuente: sa.tipo === 'Anomalía Cardíaca' ? 'Smartwatch (Wearable)' : 'Acelerómetro (Físico)',
            gravedad: sa.tipo === 'Anomalía Cardíaca' ? 'alta' : 'media',
            activa: isRecent
          });

          if (patientMatch && isRecent) {
            patientMatch.alertaActiva = true;
            patientMatch.alertaTitulo = sa.tipo;
            patientMatch.alertaDesc = sa.mensaje;
            patientMatch.alertaGravedad = sa.tipo === 'Anomalía Cardíaca' ? 'alta' : 'media';
          }
        }
      } catch (alertErr) {
        console.error('Error fetching SQLite table alerts:', alertErr);
      }

      setPatients(loadedPatients);
      setAlerts(newAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading caregiver dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientsAndAlerts();

    // Poll data every 10 seconds to keep charts and alerts updated reactively
    const interval = setInterval(() => {
      loadPatientsAndAlerts();
    }, 10000);

    return () => clearInterval(interval);
  }, [cgRut]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir del perfil de Cuidador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', onPress: () => router.replace('/') },
      ]
    );
  };

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    setDetailOpen(true);
  };



  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const handleLinkPatient = async (rut: string) => {
    if (!rut.trim()) {
      Alert.alert('Error', 'Por favor ingresa un RUT válido.');
      return;
    }

    const cleanRutVal = cleanRut(rut.trim());
    const db = getDB();
    try {
      // 1. Buscar en la tabla adulto_mayor si existe un registro con ese RUT
      const senior = await db.getFirstAsync<{ nombres: string; apellidos: string }>(
        "SELECT nombres, apellidos FROM adulto_mayor WHERE rut = ?", [cleanRutVal]
      );

      if (!senior) {
        Alert.alert('RUT no encontrado', 'No se encontró ningún Adulto Mayor con ese RUT.');
        return;
      }

      // 2. Verificar también en la tabla users que ese RUT tenga role = 'adulto_mayor'
      const user = await db.getFirstAsync<{ role: string }>(
        "SELECT role FROM users WHERE rut = ?", [cleanRutVal]
      );

      if (!user || user.role !== 'adulto_mayor') {
        Alert.alert('RUT inválido', 'El RUT ingresado no corresponde a un Adulto Mayor.');
        return;
      }

      // 3. Verificar que no exista ya una entrada en adulto_cuidador con esa combinación
      const linked = await db.getFirstAsync<{ adulto_rut: string }>(
        "SELECT adulto_rut FROM adulto_cuidador WHERE adulto_rut = ? AND cuidador_rut = ?",
        [cleanRutVal, cgRut]
      );

      if (linked) {
        Alert.alert('Ya Vinculado', 'Este paciente ya está vinculado a tu cuenta.');
        return;
      }

      // 4. Insertar en adulto_cuidador
      await db.runAsync(
        "INSERT INTO adulto_cuidador (adulto_rut, cuidador_rut, vinculado_en) VALUES (?, ?, ?)",
        [cleanRutVal, cgRut, new Date().toISOString()]
      );

      // 5. Actualizar el campo pacientes en la tabla cuidador
      const cg = await db.getFirstAsync<{ pacientes: string }>(
        "SELECT pacientes FROM cuidador WHERE rut = ?", [cgRut]
      );
      let pacientesArr: string[] = [];
      if (cg && cg.pacientes) {
        try {
          pacientesArr = JSON.parse(cg.pacientes);
          if (!Array.isArray(pacientesArr)) {
            pacientesArr = [];
          }
        } catch (e) {
          pacientesArr = [];
        }
      }
      if (!pacientesArr.includes(cleanRutVal)) {
        pacientesArr.push(cleanRutVal);
      }
      await db.runAsync(
        "UPDATE cuidador SET pacientes = ? WHERE rut = ?",
        [JSON.stringify(pacientesArr), cgRut]
      );

      Alert.alert(
        'Vinculación Exitosa',
        `El paciente ${senior.nombres} ${senior.apellidos} ha sido vinculado con éxito a tu cuenta.`,
        [{
          text: 'Aceptar', onPress: () => {
            setLinkModalOpen(false);
            loadPatientsAndAlerts();
          }
        }]
      );
    } catch (err) {
      console.error('Error linking patient:', err);
      Alert.alert('Error', 'Hubo un problema al vincular el paciente.');
    }
  };

  const handleDesvincular = async (rut: string, name: string) => {
    Alert.alert(
      'Desvincular Paciente',
      `¿Estás seguro de que quieres desvincular a ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            const db = getDB();
            try {
              // 1. Eliminar de adulto_cuidador
              await db.runAsync(
                "DELETE FROM adulto_cuidador WHERE adulto_rut = ? AND cuidador_rut = ?",
                [rut, cgRut]
              );

              // 2. Actualizar el campo pacientes en cuidador
              const cg = await db.getFirstAsync<{ pacientes: string }>(
                "SELECT pacientes FROM cuidador WHERE rut = ?", [cgRut]
              );
              let pacientesArr: string[] = [];
              if (cg && cg.pacientes) {
                try {
                  pacientesArr = JSON.parse(cg.pacientes);
                  if (!Array.isArray(pacientesArr)) {
                    pacientesArr = [];
                  }
                } catch (e) {
                  pacientesArr = [];
                }
              }
              pacientesArr = pacientesArr.filter(r => r !== rut);
              await db.runAsync(
                "UPDATE cuidador SET pacientes = ? WHERE rut = ?",
                [JSON.stringify(pacientesArr), cgRut]
              );

              Alert.alert('Desvinculado', 'Paciente desvinculado con éxito.');
              setDetailOpen(false);
              setSelectedPatientId(null);
              loadPatientsAndAlerts();
            } catch (err) {
              console.error('Error desvinculando paciente:', err);
              Alert.alert('Error', 'No se pudo desvincular al paciente.');
            }
          }
        }
      ]
    );
  };

  // Renderizado condicional si la vista de detalle está abierta
  if (detailOpen && selectedPatientId !== null) {
    const p = patients.find((x) => x.id === selectedPatientId) || patients[0];
    if (!p) return null;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={activeColors.surface} />
        <CaregiverDetalle
          patient={p}
          onBack={() => setDetailOpen(false)}
          fontSizeMultiplier={fontSizeMultiplier}
          activeColors={activeColors}
          onDesvincular={handleDesvincular}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
      <StatusBar
        barStyle={tab === 'inicio' ? 'light-content' : 'dark-content'}
        backgroundColor={tab === 'inicio' ? activeColors.headerBg : activeColors.background}
      />

      {/* Header flotante de logout superior */}
      <View style={[
        styles.topLogoutHeader, 
        tab === 'inicio' && { borderBottomWidth: 0, backgroundColor: activeColors.headerBg },
        {
          height: undefined,
          paddingTop: insets.top + (Platform.OS === 'android' && isTablet ? 15 : 0),
          paddingBottom: 10
        }
      ]}>
        {tab === 'inicio' ? (
          <Text style={[styles.appTitleHeader, { color: '#ffffff' }]}>Innercore</Text>
        ) : (
          <View style={styles.headerTitleRow}>
            <Text style={[styles.appTitle, { color: activeColors.textPrimary }]}>Innercore</Text>
            <Text style={[styles.roleTag, { backgroundColor: activeColors.primaryLight, color: activeColors.primaryDark }]}>
              Cuidador
            </Text>
          </View>
        )}
        <TouchableOpacity style={[styles.logoutButtonTop, tab === 'inicio' && { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={18} color={tab === 'inicio' ? '#ffffff' : activeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Contenido Principal con Tab Switcher */}
      <View style={styles.content}>
        {tab === 'inicio' && (
          <CaregiverInicio
            onSelectPatient={handleSelectPatient}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            name={name}
            patients={patients}
            alerts={alerts}
            onOpenLinkModal={() => setLinkModalOpen(true)}
          />
        )}
        {tab === 'pacientes' && (
          <CaregiverPacientes
            onSelectPatient={handleSelectPatient}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            patients={patients}
            onOpenLinkModal={() => setLinkModalOpen(true)}
          />
        )}
        {tab === 'alertas' && (
          <CaregiverAlertas
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            alerts={alerts}
          />
        )}
        {tab === 'configuracion' && (
          <CaregiverConfiguracion
            userRut={cgRut}
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
            onProfileUpdated={loadPatientsAndAlerts}
          />
        )}
      </View>

      {/* Navbar Inferior de 4 Pestañas */}
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
          icon="users"
          label="Pacientes"
          isActive={tab === 'pacientes'}
          color={colorblindMode ? activeColors.primaryDark : '#4f46e5'}
          onPress={() => setTab('pacientes')}
          activeColors={activeColors}
        />
        <NavButton
          icon="bell"
          label="Alertas"
          isActive={tab === 'alertas'}
          color={activeColors.heart}
          onPress={() => setTab('alertas')}
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

      {/* Modal para vincular nuevo paciente */}
      <VincularPacienteModal
        visible={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={handleLinkPatient}
        fontSizeMultiplier={fontSizeMultiplier}
        activeColors={activeColors}
      />
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
        <Feather name={icon} size={18} color={isActive ? color : activeColors.textMuted} />
      </View>
      <Text style={[styles.navText, { color: isActive ? color : activeColors.textMuted }, isActive && { fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ===============================================================================
// 1. SUB-PANTALLA: INICIO CUIDADOR
// ===============================================================================
interface CaregiverTabProps {
  fontSizeMultiplier: number;
  activeColors: any;
  onSelectPatient?: (id: number) => void;
  name?: string;
  patients?: Paciente[];
  alerts?: AlertaItem[];
  onOpenLinkModal?: () => void;
}

function CaregiverInicio({ onSelectPatient, fontSizeMultiplier, activeColors, name, patients = [], alerts = [], onOpenLinkModal }: CaregiverTabProps) {
  const activeAlertsCount = alerts.filter(a => a.activa).length;

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>

      {/* Deep Green Header (Adaptado a React Native con bordes y degradado simulado) */}
      <View style={[styles.greenHeader, { backgroundColor: activeColors.headerBg }]}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={[styles.welcomeTitle, { fontSize: getFontSize(22, fontSizeMultiplier) }]}>
              Hola, {name} <Text style={{ fontSize: 20 }}>👩‍⚕️</Text>
            </Text>
            <Text style={[styles.welcomeSubtitle, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Panel de monitoreo — Hoy, 25 Abr
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                styles.alertBellHeader,
                { 
                  backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryLight,
                  marginRight: 8
                }
              ]}
              onPress={() => router.push('/caregiver-map' as any)}
              activeOpacity={0.7}
            >
              <Feather name="map" size={18} color={activeColors.primary === '#10b981' ? '#ffffff' : activeColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.alertBellHeader, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryLight }]} activeOpacity={0.7}>
              <Feather name="bell" size={18} color={activeColors.primary === '#10b981' ? '#fde047' : activeColors.primary} />
              {activeAlertsCount > 0 && <View style={styles.bellRedDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen de Métricas */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>{patients.length}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Pacientes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#374151' : activeColors.border }]}>
            <Text style={[styles.summaryValue, { color: activeColors.primary === '#10b981' ? '#ffffff' : activeColors.textPrimary }]}>{activeAlertsCount}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier), color: activeColors.primary === '#10b981' ? '#e5e7eb' : activeColors.textSecondary }]}>{activeAlertsCount === 1 ? 'Alerta' : 'Alertas'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>{patients.length}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Activos Hoy</Text>
          </View>
        </View>
      </View>

      {/* Sección Mis Pacientes */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          MIS PACIENTES
        </Text>

        <View style={styles.patientsList}>
          {patients.map((p) => (
            <PacienteCard
              key={p.id}
              patient={p}
              onPress={() => onSelectPatient && onSelectPatient(p.id)}
              fontSizeMultiplier={fontSizeMultiplier}
              activeColors={activeColors}
            />
          ))}
        </View>

        {/* Vincular Nuevo Paciente */}
        <TouchableOpacity
          style={[styles.linkBtn, { borderColor: activeColors.primary }]}
          onPress={onOpenLinkModal}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={activeColors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.linkBtnText, { color: activeColors.primary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
            Vincular nuevo paciente
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Sub-componente: Tarjeta de Paciente
interface PacienteCardProps {
  patient: Paciente;
  onPress: () => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function PacienteCard({ patient, onPress, fontSizeMultiplier, activeColors }: PacienteCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.patientCard,
        { backgroundColor: activeColors.surface, borderColor: activeColors.border },
        patient.alertaActiva && { borderColor: activeColors.emergency, borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.patientAvatar, { backgroundColor: patient.alertaActiva ? '#fef08a' : activeColors.background }]}>
        <Text style={styles.patientAvatarText}>{patient.avatar}</Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={[styles.patientName, { color: activeColors.textPrimary, fontSize: getFontSize(16, fontSizeMultiplier) }]}>
          {patient.nombre}, {patient.edad}
        </Text>
        <View style={styles.patientLocationRow}>
          <Feather name="map-pin" size={12} color={activeColors.heart} style={{ marginRight: 4 }} />
          <Text style={[styles.patientLocationText, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
            {patient.direccion} · {patient.tiempoDato}
          </Text>
        </View>
      </View>

      <View style={styles.patientStatusCol}>
        {patient.alertaActiva ? (
          <View style={[styles.alertTag, { backgroundColor: activeColors.emergencyBg }]}>
            <Feather name="alert-triangle" size={10} color={activeColors.emergency} style={{ marginRight: 2 }} />
            <Text style={[styles.alertTagText, { color: activeColors.emergency, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              Alerta
            </Text>
          </View>
        ) : (
          <View style={[styles.normalTag, { backgroundColor: '#e6f4f1' }]}>
            <Text style={[styles.normalTagText, { color: '#0f766e', fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              ✓ Normal
            </Text>
          </View>
        )}
        <View style={styles.heartRateRow}>
          <Feather name="heart" size={12} color={activeColors.heart} style={{ marginRight: 4 }} />
          <Text style={[styles.heartRateValue, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
            {patient.lpm} lpm {patient.esSimulado && <Text style={{ color: activeColors.textSecondary, fontSize: 10 }}> (Simulado)</Text>}
          </Text>
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={activeColors.textMuted} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ===============================================================================
// 2. SUB-PANTALLA: PACIENTES CUIDADOR
// ===============================================================================
function CaregiverPacientes({ onSelectPatient, fontSizeMultiplier, activeColors, patients = [], onOpenLinkModal }: CaregiverTabProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 }}>
        <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
          Mis Pacientes
        </Text>
        <TouchableOpacity
          style={[
            styles.alertBellHeader,
            { 
              backgroundColor: activeColors.primaryLight,
              marginTop: 16
            }
          ]}
          onPress={() => router.push('/caregiver-map' as any)}
          activeOpacity={0.7}
        >
          <Feather name="map" size={18} color={activeColors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.patientsList}>
        {patients.map((p) => (
          <PacienteCard
            key={p.id}
            patient={p}
            onPress={() => onSelectPatient && onSelectPatient(p.id)}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
          />
        ))}
      </View>

      {/* Vincular Nuevo Paciente */}
      <TouchableOpacity
        style={[styles.linkBtnFull, { borderColor: activeColors.primary }]}
        onPress={onOpenLinkModal}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={18} color={activeColors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.linkBtnFullText, { color: activeColors.primary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
          Vincular nuevo paciente
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ===============================================================================
// 3. SUB-PANTALLA: ALERTAS Y NOTIFICACIONES CUIDADOR
// ===============================================================================
function CaregiverAlertas({ fontSizeMultiplier, activeColors, alerts = [] }: CaregiverTabProps) {
  const activas = alerts.filter((a) => a.activa);
  const historial = alerts.filter((a) => !a.activa);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.alertsHeaderRow}>
        <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier), marginBottom: 0 }]}>
          Alertas
        </Text>
        <View style={[styles.alertsCountTag, { backgroundColor: activeColors.emergency }]}>
          <Text style={[styles.alertsCountText, { fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            {activas.length} nuevas
          </Text>
        </View>
      </View>

      {/* Alertas Activas */}
      <View style={styles.alertSection}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          ACTIVAS
        </Text>
        <View style={styles.alertsList}>
          {activas.length > 0 ? (
            activas.map((a) => (
              <AlertCard
                key={a.id}
                item={a}
                fontSizeMultiplier={fontSizeMultiplier}
                activeColors={activeColors}
              />
            ))
          ) : (
            <Text style={{ color: activeColors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
              No hay alertas activas en este momento.
            </Text>
          )}
        </View>
      </View>

      {/* Historial Reciente */}
      <View style={styles.alertSection}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier), marginTop: 14 }]}>
          HISTORIAL RECIENTE
        </Text>
        <View style={styles.alertsList}>
          {historial.length > 0 ? (
            historial.map((a) => (
              <AlertCard
                key={a.id}
                item={a}
                fontSizeMultiplier={fontSizeMultiplier}
                activeColors={activeColors}
              />
            ))
          ) : (
            <Text style={{ color: activeColors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
              Sin alertas recientes
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-componente: Tarjeta de Alerta
interface AlertCardProps {
  item: AlertaItem;
  fontSizeMultiplier: number;
  activeColors: any;
}

function AlertCard({ item, fontSizeMultiplier, activeColors }: AlertCardProps) {
  // Determinar icono e iconoBg basado en el tipo de alerta
  let iconName: keyof typeof Feather.glyphMap = 'bell';
  let iconColor = activeColors.primary;
  let bgIcon = activeColors.primaryLight;

  if (item.tipo.includes('Pulso elevado')) {
    iconName = 'alert-triangle';
    iconColor = activeColors.activity;
    bgIcon = activeColors.activityLight;
  } else if (item.tipo.includes('Inactividad')) {
    iconName = 'bell';
    iconColor = activeColors.emergency;
    bgIcon = activeColors.emergencyBg;
  } else if (item.tipo.includes('zona segura')) {
    iconName = 'map-pin';
    iconColor = activeColors.heart;
    bgIcon = activeColors.heartLight;
  } else if (item.tipo.includes('Pulso bajo')) {
    iconName = 'heart';
    iconColor = activeColors.heart;
    bgIcon = activeColors.heartLight;
  }

  return (
    <View style={[styles.alertCardItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <View style={[styles.alertIconCircle, { backgroundColor: bgIcon }]}>
        <Feather name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.alertItemContent}>
        <Text style={[styles.alertItemTitle, { color: activeColors.textPrimary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          {item.tipo} — {item.paciente} {item.avatar}
        </Text>
        <Text style={[styles.alertItemDesc, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          {item.desc}
        </Text>
        <Text style={[styles.alertItemTime, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          {item.tiempo} · {item.fuente}
        </Text>
      </View>
    </View>
  );
}

// ===============================================================================
// 4. DETALLE DEL PACIENTE (PANTALLA AUXILIAR CUIDADOR)
// ===============================================================================
interface CaregiverDetalleProps {
  patient: Paciente;
  onBack: () => void;
  fontSizeMultiplier: number;
  activeColors: any;
  onDesvincular: (rut: string, name: string) => void;
}

function CaregiverDetalle({ patient, onBack, fontSizeMultiplier, activeColors, onDesvincular }: CaregiverDetalleProps) {
  const insets = useSafeAreaInsets();
  const [daysRange, setDaysRange] = useState<7 | 30>(7);
  const [pulsoHistorico, setPulsoHistorico] = useState<number[]>(patient.pulsoHistorico || []);
  const [oxigenoHistorico, setOxigenoHistorico] = useState<number[]>(patient.oxigenoHistorico || []);
  const [estresHistorico, setEstresHistorico] = useState<number[]>(patient.estresHistorico || []);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Manejador de llamadas rápidas
  const handleCall = () => {
    Alert.alert(
      'Llamar Paciente',
      `¿Deseas realizar una llamada directa al celular de ${patient.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => console.log(`Llamando a ${patient.nombre}...`) },
      ]
    );
  };

  useEffect(() => {
    const fetchRangeData = async () => {
      const db = getDB();
      try {
        const limit = daysRange;
        // 1. Fetch heart rate history
        const hrRes = await db.getAllAsync<{ bpm: number }>(
          "SELECT bpm FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT ?",
          [patient.rut, limit]
        );
        const hrs = hrRes.reverse().map(h => h.bpm);
        setPulsoHistorico(hrs.length > 0 ? hrs : [70, 72, 71, 73, 72, 74, 72]);

        // 2. Fetch oxygen history
        const o2Res = await db.getAllAsync<{ porcentaje: number }>(
          "SELECT porcentaje FROM oxigeno_sangre WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT ?",
          [patient.rut, limit]
        );
        const o2s = o2Res.reverse().map(o => o.porcentaje);
        setOxigenoHistorico(o2s.length > 0 ? o2s : [98, 97, 98, 96, 98, 97, 98]);

        // 3. Fetch stress history (userId and valor)
        const strRes = await db.getAllAsync<{ valor: number }>(
          "SELECT valor FROM estres WHERE userId = ? ORDER BY timestamp DESC LIMIT ?",
          [patient.rut, limit]
        );
        const strs = strRes.reverse().map(s => s.valor);
        setEstresHistorico(strs.length > 0 ? strs : [35, 40, 38, 45, 30, 35, 33]);
      } catch (err) {
        console.error('[CaregiverDetalle] Error fetching temporal range metrics:', err);
      }
    };
    fetchRangeData();
  }, [patient.rut, daysRange]);

  // Averages calculations for CP-12
  const avgBpm = Math.round(pulsoHistorico.reduce((a, b) => a + b, 0) / pulsoHistorico.length) || 72;
  const avgO2 = Math.round(oxigenoHistorico.reduce((a, b) => a + b, 0) / oxigenoHistorico.length) || 98;
  const avgStress = Math.round(estresHistorico.reduce((a, b) => a + b, 0) / estresHistorico.length) || 35;

  // Coordenadas simuladas para mostrar en el mapa interactivo real
  const region = {
    latitude: patient.coordenadas.latitude,
    longitude: patient.coordenadas.longitude,
    latitudeDelta: 0.004,
    longitudeDelta: 0.004,
  };

  // Cálculos dinámicos para los gráficos de curvas SVG (Pulsos de 7/30 días)
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = Math.max(...pulsoHistorico, 100);
  const minVal = Math.min(...pulsoHistorico, 50);
  const valRange = maxVal - minVal || 10;

  const points = pulsoHistorico.map((val, idx) => {
    const x = (idx / (pulsoHistorico.length - 1)) * svgWidth;
    // Invertido porque en SVG y = 0 es arriba
    const y = svgHeight - 12 - ((val - minVal) / valRange) * (svgHeight - 24);
    return { x, y, val };
  });

  let dPath = '';
  if (points.length > 0) {
    dPath = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
      dPath += `L ${points[i].x} ${points[i].y} `;
    }
  }

  // Encontrar el valor más alto para marcarlo
  const peakIdx = pulsoHistorico.indexOf(Math.max(...pulsoHistorico));

  // SpO2 Calculations
  const maxO2 = Math.max(...oxigenoHistorico, 100);
  const minO2 = Math.min(...oxigenoHistorico, 85);
  const o2Range = maxO2 - minO2 || 10;
  const o2Points = oxigenoHistorico.map((val, idx) => {
    const x = (idx / (oxigenoHistorico.length - 1)) * svgWidth;
    const y = svgHeight - 12 - ((val - minO2) / o2Range) * (svgHeight - 24);
    return { x, y, val };
  });
  let dPathO2 = '';
  if (o2Points.length > 0) {
    dPathO2 = `M ${o2Points[0].x} ${o2Points[0].y} `;
    for (let i = 1; i < o2Points.length; i++) {
      dPathO2 += `L ${o2Points[i].x} ${o2Points[i].y} `;
    }
  }
  const minO2Val = Math.min(...oxigenoHistorico);
  const minO2Idx = oxigenoHistorico.lastIndexOf(minO2Val);

  // Stress Calculations
  const maxStr = Math.max(...estresHistorico, 100);
  const minStr = Math.min(...estresHistorico, 0);
  const strRange = maxStr - minStr || 100;
  const strPoints = estresHistorico.map((val, idx) => {
    const x = (idx / (estresHistorico.length - 1)) * svgWidth;
    const y = svgHeight - 12 - ((val - minStr) / strRange) * (svgHeight - 24);
    return { x, y, val };
  });
  let dPathStr = '';
  if (strPoints.length > 0) {
    dPathStr = `M ${strPoints[0].x} ${strPoints[0].y} `;
    for (let i = 1; i < strPoints.length; i++) {
      dPathStr += `L ${strPoints[i].x} ${strPoints[i].y} `;
    }
  }
  const peakStrVal = Math.max(...estresHistorico);
  const peakStrIdx = estresHistorico.lastIndexOf(peakStrVal);

  return (
    <View style={[styles.detailContainer, { backgroundColor: activeColors.background }]}>
      {/* Header Detalle */}
      <View style={[styles.detailHeader, { backgroundColor: activeColors.surface, borderBottomColor: activeColors.border }]}>
        <View style={styles.detailHeaderLeft}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={activeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: activeColors.textPrimary, fontSize: getFontSize(18, fontSizeMultiplier) }]}>
            {patient.nombre} {patient.avatar}
          </Text>
        </View>
        <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#e6f4f1' }]} onPress={handleCall} activeOpacity={0.8}>
          <Feather name="phone" size={14} color="#0f766e" style={{ marginRight: 6 }} />
          <Text style={[styles.callBtnText, { color: '#0f766e', fontSize: getFontSize(12, fontSizeMultiplier) }]}>
            Llamar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.detailScroll} contentContainerStyle={[styles.detailScrollPadding, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>

        {/* Segmento de Mapa Real con react-native-maps */}
        <View style={[styles.mapDetailContainer, { borderColor: activeColors.primaryLight }]}>
          <MapView
            style={styles.mapDetail}
            region={region}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {patient.hasGps && (
              <Marker coordinate={patient.coordenadas}>
                <View style={[styles.markerBg, { backgroundColor: patient.alertaActiva ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)' }]}>
                  <View style={[styles.markerDot, { backgroundColor: patient.alertaActiva ? activeColors.emergency : activeColors.primary }]} />
                </View>
              </Marker>
            )}
            {patient.hasGps && (
              <Circle
                center={patient.coordenadas}
                radius={30}
                strokeColor={patient.alertaActiva ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}
                fillColor={patient.alertaActiva ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}
              />
            )}
            {patient.latitud_segura !== undefined && patient.longitud_segura !== undefined && patient.radio_seguro !== undefined && (
              <Circle
                center={{ latitude: patient.latitud_segura, longitude: patient.longitud_segura }}
                radius={patient.radio_seguro}
                strokeColor="rgba(16, 185, 129, 0.6)"
                fillColor="rgba(16, 185, 129, 0.08)"
              />
            )}
          </MapView>

          <View style={[styles.mapLabelTag, { backgroundColor: activeColors.surface }]}>
            <Feather name="map-pin" size={12} color={activeColors.heart} style={{ marginRight: 4 }} />
            <Text style={[styles.mapLabelTagText, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              {patient.hasGps ? `Última ubicación de ${patient.nombre}` : 'Ubicación no disponible aún'}
            </Text>
          </View>
        </View>

        {/* Banner de Alerta si tiene activa */}
        {patient.alertaActiva && (
          <View style={[styles.detailAlertBanner, { backgroundColor: activeColors.emergencyBg, borderColor: activeColors.emergency }]}>
            <Feather name="alert-triangle" size={22} color={activeColors.emergency} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailAlertTitle, { color: activeColors.emergency, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
                {patient.alertaTitulo}
              </Text>
              <Text style={[styles.detailAlertDesc, { color: activeColors.emergency, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
                {patient.alertaDesc}
              </Text>
            </View>
          </View>
        )}

        {/* CP-12: Rango Temporal Segmentado */}
        <View style={[styles.rangeSegmentContainer, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <TouchableOpacity
            style={[styles.rangeSegment, daysRange === 7 && { backgroundColor: activeColors.primary }]}
            onPress={() => setDaysRange(7)}
          >
            <Text style={[styles.rangeSegmentText, { color: daysRange === 7 ? '#ffffff' : activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Últimos 7 días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeSegment, daysRange === 30 && { backgroundColor: activeColors.primary }]}
            onPress={() => setDaysRange(30)}
          >
            <Text style={[styles.rangeSegmentText, { color: daysRange === 30 ? '#ffffff' : activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Últimos 30 días
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gráfico de Pulso Cardíaco Interactiva - Renderizado directo en SVG */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="heart" size={15} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier), flex: 1 }]}>
              Pulso cardíaco — últimos {daysRange} días
            </Text>
            <Text style={{ fontSize: getFontSize(11, fontSizeMultiplier), color: activeColors.primaryDark, fontWeight: '700' }}>
              Promedio: {avgBpm} LPM
            </Text>
          </View>

          <View style={styles.svgContainer}>
            <Svg width={svgWidth} height={svgHeight}>
              {/* Línea horizontal discontinua de umbral (85 lpm) */}
              {maxVal >= 85 && (
                <>
                  <Line
                    x1="0"
                    y1={svgHeight - 12 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                    x2={svgWidth}
                    y2={svgHeight - 12 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                    stroke={activeColors.emergency}
                    strokeDasharray="4, 4"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={svgWidth - 25}
                    y={svgHeight - 16 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                    fill={activeColors.emergency}
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    Lím: 85
                  </SvgText>
                </>
              )}

              {/* Trazado de Curva principal */}
              <Path d={dPath} fill="none" stroke={activeColors.primary} strokeWidth="2.5" />

              {/* Dibujar puntos de datos */}
              {points.map((p, i) => (
                <React.Fragment key={i}>
                  <SvgCircle
                    cx={p.x}
                    cy={p.y}
                    r={i === peakIdx ? '4' : '2.5'}
                    fill={i === peakIdx ? activeColors.emergency : activeColors.primary}
                  />
                  {i === peakIdx && (
                    <SvgText
                      x={p.x}
                      y={p.y - 7}
                      fill={activeColors.emergency}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.val}
                    </SvgText>
                  )}
                </React.Fragment>
              ))}
            </Svg>
          </View>
        </View>

        {/* Gráfico de Saturación de Oxígeno (SpO2) */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={15} color={activeColors.oxygen} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier), flex: 1 }]}>
              Saturación de oxígeno (SpO2) — últimos {daysRange} días
            </Text>
            <Text style={{ fontSize: getFontSize(11, fontSizeMultiplier), color: activeColors.primaryDark, fontWeight: '700' }}>
              Promedio: {avgO2}%
            </Text>
          </View>

          <View style={styles.svgContainer}>
            <Svg width={svgWidth} height={svgHeight}>
              {/* Línea horizontal discontinua de umbral (95%) */}
              <Line
                x1="0"
                y1={svgHeight - 12 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                x2={svgWidth}
                y2={svgHeight - 12 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                stroke={activeColors.emergency}
                strokeDasharray="4, 4"
                strokeWidth="1"
              />
              <SvgText
                x={svgWidth - 35}
                y={svgHeight - 16 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                fill={activeColors.emergency}
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                Lím: 95%
              </SvgText>

              <Path d={dPathO2} fill="none" stroke={activeColors.oxygen} strokeWidth="2.5" />

              {o2Points.map((pt, i) => (
                <React.Fragment key={i}>
                  <SvgCircle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === minO2Idx ? 4 : 2.5}
                    fill={i === minO2Idx ? activeColors.emergency : activeColors.oxygen}
                  />
                  {i === minO2Idx && (
                    <SvgText
                      x={pt.x}
                      y={pt.y - 7}
                      fill={activeColors.emergency}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.val}%
                    </SvgText>
                  )}
                </React.Fragment>
              ))}
            </Svg>
          </View>
        </View>

        {/* Gráfico de Nivel de Estrés */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="zap" size={15} color="#eab308" style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier), flex: 1 }]}>
              Nivel de estrés — últimos {daysRange} días
            </Text>
            <Text style={{ fontSize: getFontSize(11, fontSizeMultiplier), color: activeColors.primaryDark, fontWeight: '700' }}>
              Promedio: {avgStress}%
            </Text>
          </View>

          <View style={styles.svgContainer}>
            <Svg width={svgWidth} height={svgHeight}>
              {/* Línea horizontal discontinua de umbral (70) */}
              <Line
                x1="0"
                y1={svgHeight - 12 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                x2={svgWidth}
                y2={svgHeight - 12 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                stroke={activeColors.emergency}
                strokeDasharray="4, 4"
                strokeWidth="1"
              />
              <SvgText
                x={svgWidth - 35}
                y={svgHeight - 16 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                fill={activeColors.emergency}
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                Alto: 70
              </SvgText>

              <Path d={dPathStr} fill="none" stroke="#eab308" strokeWidth="2.5" />

              {strPoints.map((pt, i) => (
                <React.Fragment key={i}>
                  <SvgCircle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === peakStrIdx ? 4 : 2.5}
                    fill={i === peakStrIdx ? activeColors.emergency : '#eab308'}
                  />
                  {i === peakStrIdx && (
                    <SvgText
                      x={pt.x}
                      y={pt.y - 7}
                      fill={activeColors.emergency}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.val}
                    </SvgText>
                  )}
                </React.Fragment>
              ))}
            </Svg>
          </View>
        </View>

        {/* Gráfico de Actividad Física - Simulado con hermosos componentes de Views responsivos */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={15} color={activeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Horas de actividad física semanal
            </Text>
          </View>

          {/* Gráfico de barras */}
          <View style={styles.customBarGraph}>
            {patient.actividadSemana.map((hours, idx) => {
              // Altura máxima es 50
              const barHeight = (hours / 9) * 50;
              const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'];
              const isToday = idx === 6;
              const isAlertDay = hours < 3; // Jueves de Carlos bajo en actividad

              let barColor = activeColors.primaryLight;
              if (isToday) barColor = activeColors.primary;
              if (isAlertDay) barColor = activeColors.activity;

              return (
                <View key={idx} style={styles.barItemCol}>
                  <View style={[styles.barBackgroundContainer]}>
                    <View style={[styles.barValueFill, { height: barHeight, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.barDayText, isToday && { color: activeColors.primaryDark, fontWeight: 'bold' }, isAlertDay && { color: activeColors.activity }, { fontSize: getFontSize(8, fontSizeMultiplier) }]}>
                    {days[idx]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Métricas Wearables (Smartwatch) */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier), marginBottom: 10 }]}>
            Métricas Wearable (Smartwatch)
          </Text>
          <View style={styles.statDoubleCol}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                SATURACIÓN DE OXÍGENO
              </Text>
              <Text style={[styles.statBoxValue, { color: patient.oxigeno < 95 ? activeColors.emergency : activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.oxigeno}%
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.oxigeno < 95 ? activeColors.emergency : activeColors.primaryDark, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.oxigeno < 95 ? '↓ Baja (Umbral 95%)' : '✓ Óptima'}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                NIVEL DE ESTRÉS
              </Text>
              <Text style={[styles.statBoxValue, { color: patient.estres > 80 ? activeColors.emergency : activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.estres} / 100
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.estres > 80 ? activeColors.emergency : activeColors.primaryDark, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.estres > 80 ? '↑ Elevado' : patient.estres > 40 ? '⚠ Moderado' : '✓ Normal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Métricas Clínicas de Registro Manual */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier), marginBottom: 10 }]}>
            Métricas Clínicas de Registro Manual
          </Text>
          <View style={styles.statDoubleCol}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                PRESIÓN ARTERIAL
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.presion}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                mmHg · Manual
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                GLUCOSA
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.glucosa !== null ? `${patient.glucosa} mg/dL` : 'Sin datos registrados'}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                mg/dL · Manual
              </Text>
            </View>
          </View>

          <View style={[styles.statDoubleCol, { marginTop: 12 }]}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border, flex: 0.5 }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                TEMPERATURA CORPOREA
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.temperatura !== null ? `${patient.temperatura} °C` : 'Sin datos registrados'}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                °C · Manual
              </Text>
            </View>
          </View>
        </View>

        {/* Botón de Historial Clínico Completo */}
        <TouchableOpacity
          style={[styles.historialBtn, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow }]}
          onPress={() => setShowHistoryModal(true)}
          activeOpacity={0.85}
        >
          <Feather name="file-text" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={[styles.historialBtnText, { color: '#ffffff', fontSize: getFontSize(13, fontSizeMultiplier) }]}>
            Historial Completo
          </Text>
        </TouchableOpacity>

        {/* Botón de Desvinculación */}
        <TouchableOpacity
          style={[styles.desvincularBtn, { borderColor: activeColors.emergency }]}
          onPress={() => onDesvincular(patient.rut, patient.nombre)}
          activeOpacity={0.8}
        >
          <Feather name="user-x" size={16} color={activeColors.emergency} style={{ marginRight: 6 }} />
          <Text style={[styles.desvincularBtnText, { color: activeColors.emergency, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
            Desvincular Paciente
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <HistorialMedicosModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        userId={patient.rut}
        avatar={patient.avatar}
        activeColors={activeColors}
        fontSizeMultiplier={fontSizeMultiplier}
      />
    </View>
  );
}

// ===============================================================================
// 5. SUB-PANTALLA: CONFIGURACIÓN CUIDADOR (AJUSTES)
// ===============================================================================
interface CaregiverConfigProps {
  userRut: string;
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

function CaregiverConfiguracion({
  userRut,
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
}: CaregiverConfigProps) {
  const { updateSessionName } = useAuth();
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['👩‍⚕️', '👨‍⚕️', '👩', '👨', '👤', '❤️'];

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
      // 1. Update nombres and email in cuidador table
      await db.runAsync(
        "UPDATE cuidador SET nombres = ?, email = ? WHERE rut = ?",
        [name, email, userRut]
      );

      // 2. If password was entered, hash it and update users table
      if (pass) {
        const hashedPassword = sha256(pass);
        await db.runAsync(
          "UPDATE users SET psswd_hash = ? WHERE rut = ?",
          [hashedPassword, userRut]
        );
      }

      // 3. Update reactive context name
      updateSessionName(name);

      // 4. Trigger profile re-fetch to update caregiver dashboard
      onProfileUpdated();

      Alert.alert(
        'Configuración Guardada',
        'Tus cambios de perfil y accesibilidad se han guardado con éxito.',
        [{ text: 'Aceptar' }]
      );

      setPass('');
      setConfirmPass('');
    } catch (error) {
      console.error('Error saving caregiver profile changes:', error);
      Alert.alert('Error', 'Hubo un problema al guardar los cambios en la base de datos.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
        Configuración
      </Text>

      {/* SECCIÓN 1: PERFIL */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        PERFIL DE CUIDADOR
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Selector de Avatar */}
        <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 8 }]}>
          Identificador Visual (Avatar)
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
              <Text style={{ fontSize: 24 }}>{av}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Nombre */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
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
          <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
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
          <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
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
          <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
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

      {/* Guardar Ajustes */}
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
  topLogoutHeader: {
    height: 56,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  appTitleHeader: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
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
  logoutButtonTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingBottom: 110, // Espacio para el Navbar flotante inferior
  },
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
  greenHeader: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontWeight: '800',
    color: '#ffffff',
  },
  welcomeSubtitle: {
    color: '#a7f3d0', // esmeralda-200
    marginTop: 2,
    fontWeight: '500',
  },
  alertBellHeader: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellRedDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#065f46',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryLabel: {
    color: '#a7f3d0',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  sectionTitleLabel: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  patientsList: {
    gap: 12,
    marginBottom: 16,
  },
  patientCard: {
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  patientAvatarText: {
    fontSize: 24,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: '800',
  },
  patientLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  patientLocationText: {
    fontWeight: '500',
  },
  patientStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  alertTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTagText: {
    fontWeight: '800',
  },
  normalTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  normalTagText: {
    fontWeight: '800',
  },
  heartRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  heartRateValue: {
    fontWeight: '700',
  },
  linkBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 20,
  },
  linkBtnText: {
    fontWeight: '700',
  },

  // 2. PACIENTES PANTALLA STYLES
  pageTitle: {
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  linkBtnFull: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 20,
  },
  linkBtnFullText: {
    fontWeight: '700',
  },

  // 3. ALERTAS PANTALLA STYLES
  alertsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 10,
  },
  alertsCountTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 16,
  },
  alertsCountText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  alertSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  alertsList: {
    gap: 12,
  },
  alertCardItem: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  alertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  alertItemContent: {
    flex: 1,
  },
  alertItemTitle: {
    fontWeight: '800',
    lineHeight: 16,
  },
  alertItemDesc: {
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 14,
  },
  alertItemTime: {
    marginTop: 6,
    fontWeight: '500',
  },

  // 4. DETALLE PACIENTE STYLES
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  detailTitle: {
    fontWeight: '800',
  },
  callBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  callBtnText: {
    fontWeight: '800',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollPadding: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  mapDetailContainer: {
    height: 190,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    marginBottom: 16,
  },
  mapDetail: {
    ...StyleSheet.absoluteFillObject,
  },
  markerBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLabelTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapLabelTagText: {
    fontWeight: '700',
  },
  detailAlertBanner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailAlertTitle: {
    fontWeight: '800',
  },
  detailAlertDesc: {
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 14,
  },
  detailChartCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartCardTitle: {
    fontWeight: '700',
  },
  svgContainer: {
    height: 70,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBarGraph: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 70,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  barItemCol: {
    alignItems: 'center',
    flex: 1,
  },
  barBackgroundContainer: {
    height: 50,
    width: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barValueFill: {
    width: '100%',
    borderRadius: 4,
  },
  barDayText: {
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  statsContainer: {
    marginBottom: 16,
  },
  statDoubleCol: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  statBoxLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statBoxValue: {
    fontWeight: '800',
    marginTop: 4,
  },
  statBoxSub: {
    fontWeight: '500',
    marginTop: 1,
  },

  // 5. CONFIGURACIÓN STYLES
  settingsGroupTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 18,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  settingsCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  formLabelText: {
    fontWeight: '700',
  },
  avatarPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  avatarPickerItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsFormRow: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginTop: 6,
  },
  formInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontWeight: '600',
  },
  settingsOptionRow: {
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
    height: 44,
    marginTop: 6,
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
  settingsOptionSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginHorizontal: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // oscurecer fondo
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLabel: {
    fontWeight: '500',
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1.5,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalInputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  modalFormInput: {
    fontWeight: '600',
    width: '100%',
  },

  // desvincularBtn
  desvincularBtn: {
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    flexDirection: 'row',
  },
  desvincularBtnText: {
    fontWeight: '800',
  },
  rangeSegmentContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  rangeSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  rangeSegmentText: {
    fontWeight: '700',
  },
  historialBtn: {
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  historialBtnText: {
    fontWeight: '800',
  },
}) as any;

interface VincularPacienteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rut: string) => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function VincularPacienteModal({ visible, onClose, onSubmit, fontSizeMultiplier, activeColors }: VincularPacienteModalProps) {
  const [rut, setRut] = useState('');

  const handlePressSubmit = () => {
    onSubmit(rut);
    setRut('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: activeColors.textPrimary, fontSize: getFontSize(18, fontSizeMultiplier) }]}>
              Vincular Nuevo Paciente
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={activeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
            Ingresa el RUT del Adulto Mayor que deseas agregar a tu panel de monitoreo.
          </Text>

          <View style={[styles.modalInputContainer, { borderColor: activeColors.border, marginVertical: 16 }]}>
            <TextInput
              style={[styles.modalFormInput, { fontSize: getFontSize(15, fontSizeMultiplier), color: activeColors.textPrimary }]}
              placeholder="RUT (Ej: 12.345.678-9)"
              placeholderTextColor={activeColors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={rut}
              onChangeText={(text) => setRut(formatRut(text))}
            />
          </View>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: activeColors.border }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelBtnText, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: activeColors.primary }]}
              onPress={handlePressSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalSubmitBtnText, { fontSize: getFontSize(13, fontSizeMultiplier) }]}>
                Vincular
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
