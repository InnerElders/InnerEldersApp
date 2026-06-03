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

// ─── Helpers Clínicos de Edad y Tiempo Geográfico ────────────────────────────
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

// ─── Paleta de Colores Centralizada (Tema Indigo/Púrpura Médico) ───────────────
const DEFAULT_COLORS = {
  background: '#f2f9f9',       // Menta suave de fondo
  surface: '#ffffff',
  primary: '#5e60ce',          // Púrpura/Índigo Clínico
  primaryLight: '#e0e7ff',     // Indigo claro
  primaryDark: '#4f46e5',      // Indigo oscuro
  primaryShadow: '#c7d2fe',
  textPrimary: '#1e293b',      // slate-800
  textSecondary: '#64748b',    // slate-500
  textMuted: '#94a3b8',        // slate-400
  border: '#e2e8f0',          // slate-200
  cardBg: '#ffffff',
  headerBg: '#5e60ce',         // Púrpura para cabecera clínica

  // Estados de Pacientes
  critical: '#ef4444',         // Rojo
  criticalBg: '#fee2e2',
  warning: '#eab308',          // Amarillo/Naranja
  warningBg: '#fef9c3',
  stable: '#10b981',           // Teal
  stableBg: '#d1fae5',

  // Métricas temáticas
  heart: '#ec4899',            // pink-500
  heartLight: '#fce7f3',       // pink-100
  activity: '#f97316',         // orange-500
  activityLight: '#ffedd5',    // orange-100
  oxygen: '#6366f1',           // indigo-500
  oxygenLight: '#e0e7ff',      // indigo-100
} as const;

// ─── Paleta de Alto Contraste (Modo Daltonismo) ───────────────────────────────
const COLORBLIND_COLORS = {
  background: '#f8fafc',       // slate-50
  surface: '#ffffff',
  primary: '#1d4ed8',          // Azul Real altamente accesible
  primaryLight: '#dbeafe',     // Blue-100
  primaryDark: '#1e40af',      // Blue-800
  primaryShadow: '#bfdbfe',
  textPrimary: '#0f172a',      // Carbón
  textSecondary: '#334155',    // Slate-700
  textMuted: '#64748b',        // Slate-500
  border: '#cbd5e1',          // Slate-300
  cardBg: '#ffffff',
  headerBg: '#0f172a',         // Cabecera oscura para alto contraste

  // Estados de Pacientes Daltonismo
  critical: '#b91c1c',
  criticalBg: '#fee2e2',
  warning: '#d97706',
  warningBg: '#fef3c7',
  stable: '#0f766e',
  stableBg: '#ccfbf1',

  heart: '#d97706',
  heartLight: '#fef3c7',
  activity: '#1e40af',
  activityLight: '#dbeafe',
  oxygen: '#0f172a',
  oxygenLight: '#e2e8f0',
} as const;

// Dimensiones globales
const { width } = Dimensions.get('window');

// Helper de accesibilidad para cálculo de tamaño de fuente
const getFontSize = (baseSize: number, multiplier: number) => {
  return Math.round(baseSize * multiplier);
};

// Estructura de Datos de Pacientes
// Estructura de Datos de Pacientes
interface Paciente {
  id: number;
  rut: string;
  nombre: string;
  edad: number;
  avatar: string;
  riesgo: 'Crítico' | 'Seguimiento' | 'Estable';
  lpm: number;
  presion: string;
  glucosa: number;
  oxigeno: number;
  estres: number;
  temperatura: number | null;
  esSimulado?: boolean;
  actividadStr: string;
  diagnostico: string;
  antecedentes: string;
  wearableActivo: boolean;
  alertaActiva: boolean;
  alertaTitulo?: string;
  alertaDesc?: string;
  pulsoHistorico: number[];
  oxigenoHistorico: number[];
  estresHistorico: number[];
  actividadSemana: number[]; // horas activas lun-dom
  ultimaActualizacion: string;
}

const INITIAL_PACIENTES: Paciente[] = [
  {
    id: 1,
    rut: '12.345.678-9',
    nombre: 'Acdiel Bombin',
    edad: 78,
    avatar: '👴',
    riesgo: 'Crítico',
    lpm: 89,
    presion: '128/82',
    glucosa: 118,
    oxigeno: 94,
    estres: 75,
    temperatura: 36.5,
    actividadStr: '4h inactivo',
    diagnostico: 'HTA · DM2',
    antecedentes: 'Hipertensión Arterial Crónica y Diabetes Tipo 2 en control manual.',
    wearableActivo: true,
    alertaActiva: true,
    alertaTitulo: 'Inactividad Prolongada',
    alertaDesc: 'Posible caída detectada. Dispositivo inmóvil por más de 4 horas.',
    pulsoHistorico: [72, 75, 78, 89, 74, 76, 73],
    oxigenoHistorico: [98, 97, 98, 96, 98, 97, 94],
    estresHistorico: [35, 40, 38, 45, 30, 35, 75],
    actividadSemana: [6, 8, 4, 1.5, 6, 7, 5],
    ultimaActualizacion: 'hace 2 min',
  },
  {
    id: 2,
    rut: '11.111.111-2',
    nombre: 'Ana Morales',
    edad: 75,
    avatar: '👵',
    riesgo: 'Crítico',
    lpm: 95,
    presion: '140/90',
    glucosa: 130,
    oxigeno: 92,
    estres: 68,
    temperatura: 36.8,
    actividadStr: 'Zona insegura',
    diagnostico: 'ICC · EPOC',
    antecedentes: 'Insuficiencia Cardíaca Congestiva y EPOC severo con requerimiento de oxígeno.',
    wearableActivo: true,
    alertaActiva: true,
    alertaTitulo: 'Zona Insegura & Pulso Alto',
    alertaDesc: 'Frecuencia cardíaca de 95 lpm fuera de los límites de geocerca programados.',
    pulsoHistorico: [85, 88, 92, 95, 87, 89, 90],
    oxigenoHistorico: [96, 97, 95, 92, 96, 94, 92],
    estresHistorico: [45, 50, 52, 68, 55, 60, 58],
    actividadSemana: [4, 3, 5, 2, 4, 3.5, 3],
    ultimaActualizacion: 'hace 5 min',
  },
  {
    id: 3,
    rut: '99.999.999-9',
    nombre: 'Rosa Vega',
    avatar: '👵',
    edad: 71,
    riesgo: 'Seguimiento',
    lpm: 68,
    presion: '120/75',
    glucosa: 105,
    oxigeno: 97,
    estres: 35,
    temperatura: 36.2,
    actividadStr: 'Activa',
    diagnostico: 'Artrosis',
    antecedentes: 'Artrosis severa de cadera. Paciente realiza kinesiología dos veces por semana.',
    wearableActivo: true,
    alertaActiva: false,
    pulsoHistorico: [66, 68, 67, 69, 68, 70, 68],
    oxigenoHistorico: [98, 97, 98, 96, 98, 97, 97],
    estresHistorico: [35, 40, 38, 45, 30, 35, 35],
    actividadSemana: [5, 6, 7, 8, 6.5, 7, 7.5],
    ultimaActualizacion: 'hace 10 min',
  },
  {
    id: 4,
    rut: '88.888.888-8',
    nombre: 'Pedro Soto',
    avatar: '👴',
    edad: 83,
    riesgo: 'Estable',
    lpm: 74,
    presion: '132/85',
    glucosa: 122,
    oxigeno: 96,
    estres: 42,
    temperatura: 36.6,
    actividadStr: 'Activo',
    diagnostico: 'Preventivo',
    antecedentes: 'Control preventivo general de geriatría. Buen estado cognitivo y motriz.',
    wearableActivo: false,
    alertaActiva: false,
    pulsoHistorico: [70, 72, 73, 71, 74, 73, 74],
    oxigenoHistorico: [97, 98, 97, 97, 96, 98, 96],
    estresHistorico: [40, 42, 45, 38, 41, 43, 42],
    actividadSemana: [4, 5, 5.5, 4.5, 5, 5, 4.8],
    ultimaActualizacion: 'hace 12 min',
  },
];

export default function DoctorApp() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const [tab, setTab] = useState<'inicio' | 'pacientes' | 'reportes' | 'configuracion'>('inicio');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [daysRangeReports, setDaysRangeReports] = useState<7 | 30>(7);

  const { userSession } = useAuth();
  const docRut = userSession?.rut || '11.111.111-1';

  // Datos locales de pacientes SQLite
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  // Estados de Perfil Médico
  const [docName, setDocName] = useState('Andrés López');
  const [docEmail, setDocEmail] = useState('andres.lopez@innercore.cl');
  const [docAvatar, setDocAvatar] = useState('🩺');

  // Estados de Accesibilidad
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0);
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Modal Agregar Paciente
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Estados de Reportes Clínicos
  const [alertasTotales, setAlertasTotales] = useState(0);
  const [adherenciaDispositivo, setAdherenciaDispositivo] = useState(0);
  const [estadoPoblacion, setEstadoPoblacion] = useState({ enMovimiento: 0, sedentario: 0 });
  const [frecuenciaCardiacaPromedio, setFrecuenciaCardiacaPromedio] = useState<number[]>([]);
  const [promedioOxigenoPoblacion, setPromedioOxigenoPoblacion] = useState(98);
  const [promedioEstresPoblacion, setPromedioEstresPoblacion] = useState(35);

  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

  const loadPacientes = async () => {
    const db = getDB();
    try {
      // 1. Fetch doctor details
      const doc = await db.getFirstAsync<{ nombres: string; apellidos: string; email: string }>(
        "SELECT nombres, apellidos, email FROM medico WHERE rut = ?", [docRut]
      );
      if (doc) {
        setDocName(`${doc.nombres} ${doc.apellidos}`);
        setDocEmail(doc.email || '');
      }

      // 2. Fetch linked seniors
      const seniors = await db.getAllAsync<{
        rut: string;
        nombres: string;
        apellidos: string;
        nacimiento: string;
        residencia: string;
        latitud_segura: number;
        longitud_segura: number;
        radio_seguro: number;
      }>(
        `SELECT am.* FROM adulto_mayor am
         JOIN adulto_medico amed ON am.rut = amed.adulto_rut
         WHERE amed.medico_rut = ?`,
        [docRut]
      );

      const loadedPatients: Paciente[] = [];

      for (const s of seniors) {
        const idVal = parseInt(s.rut.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 100000);

        // Fetch latest heart rate
        const latestHr = await db.getFirstAsync<{ bpm: number; timestamp: string; fuente?: string }>(
          "SELECT bpm, timestamp, fuente FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );

        // Fetch last 7 heart rates for historical curve
        const hrHistory = await db.getAllAsync<{ bpm: number }>(
          "SELECT bpm FROM frecuencia_cardiaca WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 7",
          [s.rut]
        );
        const pulsoHistorico = hrHistory.reverse().map(h => h.bpm);
        if (pulsoHistorico.length === 0) {
          pulsoHistorico.push(...[72, 75, 78, 70, 74, 76, 73]); // standard fallback
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

        // Fetch latest GPS coordinate (to check safe zone for warning)
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

        // Check for active cardiac anomalies in SQLite alertas table (active in the last 5 minutes)
        const thresholdTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const activeCardiacAnomaly = await db.getFirstAsync<{ mensaje: string }>(
          `SELECT mensaje FROM alertas 
           WHERE pacienteId = ? AND tipo = 'Anomalía Cardíaca' AND timestamp >= ? 
           ORDER BY timestamp DESC LIMIT 1`,
          [s.rut, thresholdTime]
        );
        const hasCardiacAnomaly = activeCardiacAnomaly !== null;

        // Calculations & Risk Classification
        const age = calculateAge(s.nacimiento);
        const lpm = latestHr?.bpm || 72;
        const glucosa = latestClin ? latestClin.glucosa : 95;
        const sistolica = latestClin ? latestClin.sistolica : null;
        const diastolica = latestClin ? latestClin.diastolica : null;
        const presion = latestClin ? `${sistolica}/${diastolica}` : 'Sin datos registrados';
        const oxigeno = latestO2?.porcentaje ?? 98;
        const estres = latestStress?.nivel ?? 35;
        const temperatura = latestClin ? latestClin.temperatura : null;

        let riesgo: 'Crítico' | 'Seguimiento' | 'Estable' = 'Estable';
        let alertaActiva = false;
        let alertaTitulo = '';
        let alertaDesc = '';

        if (lpm > 85 || oxigeno < 95 || estres > 80 || hasCardiacAnomaly) {
          riesgo = 'Crítico';
          alertaActiva = true;
          if (hasCardiacAnomaly) {
            alertaTitulo = 'Anomalía Cardíaca';
            alertaDesc = activeCardiacAnomaly.mensaje;
          } else {
            alertaTitulo = lpm > 85 ? 'Taquicardia Detectada' : oxigeno < 95 ? 'Hipoxia Detectada (SpO2 Baja)' : 'Estrés Extremo Detectado';
            alertaDesc = lpm > 85
              ? `Frecuencia cardíaca elevada a ${lpm} lpm en monitor.`
              : oxigeno < 95
                ? `Saturación de oxígeno en ${oxigeno}%, por debajo de niveles seguros.`
                : `Nivel de estrés crítico registrado en ${estres}/100.`;
          }
        } else if (glucosa !== null && glucosa > 115 || (sistolica !== null && sistolica > 130)) {
          riesgo = 'Seguimiento';
        }

        let actividadStr = 'Activo';
        if (latestAct?.estado === 'Sedentario') {
          actividadStr = 'En reposo';
          if (s.nombres === 'Acdiel' && !alertaActiva) {
            actividadStr = '4h inactivo';
            riesgo = 'Crítico';
            alertaActiva = true;
            alertaTitulo = 'Inactividad Prolongada';
            alertaDesc = 'Dispositivo inmóvil por más de 4 horas (posible caída o reposo profundo).';
          }
        }

        const ultimaActualizacion = latestHr
          ? getRelativeTimeString(latestHr.timestamp)
          : latestGps
            ? getRelativeTimeString(latestGps.timestamp)
            : 'hace poco';

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
        const daysHelper = (d: number) => d * 24 * 60 * 60 * 1000;
        for (let i = 0; i < 7; i++) {
          const targetDayStr = new Date(baseTime - daysHelper(6 - i)).toISOString().split('T')[0];
          const record = actHistory.find(h => h.day === targetDayStr);
          activeHours[i] = record ? parseFloat((record.active_seconds / 3600).toFixed(1)) : 0.0;
        }

        loadedPatients.push({
          id: idVal,
          rut: s.rut,
          nombre: `${s.nombres} ${s.apellidos}`,
          edad: age,
          avatar: s.nombres === 'Acdiel' ? '👴' : '👵',
          riesgo,
          lpm,
          esSimulado: latestHr?.fuente === 'simulado',
          presion,
          glucosa,
          oxigeno,
          estres,
          temperatura,
          actividadStr,
          diagnostico: s.nombres === 'Acdiel' ? 'HTA · DM2' : 'Artrosis',
          antecedentes: s.nombres === 'Acdiel'
            ? 'Hipertensión Arterial Crónica y Diabetes Tipo 2 en control.'
            : 'Artrosis de cadera. Paciente realiza kinesiología.',
          wearableActivo: latestHr ? true : false,
          alertaActiva,
          alertaTitulo: alertaActiva ? alertaTitulo : undefined,
          alertaDesc: alertaActiva ? alertaDesc : undefined,
          pulsoHistorico,
          oxigenoHistorico,
          estresHistorico,
          actividadSemana: activeHours,
          ultimaActualizacion
        });
      }

      setPacientes(loadedPatients);

      // 3. Load reports data
      // A. Count total alerts dynamically across all assigned seniors
      let totalAlerts = 0;
      for (const s of seniors) {
        // High pulse alert count
        const hrAlerts = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM frecuencia_cardiaca 
           WHERE adulto_rut = ? AND bpm > 85 AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (hrAlerts) totalAlerts += hrAlerts.count;

        // SpO2 alert count
        const o2Alerts = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM oxigeno_sangre 
           WHERE adulto_rut = ? AND porcentaje < 95 AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (o2Alerts) totalAlerts += o2Alerts.count;

        // Stress alert count
        const stressAlerts = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM estres 
           WHERE userId = ? AND valor > 70 AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (stressAlerts) totalAlerts += stressAlerts.count;

        // GPS Safe zone alert count
        const gpsAlerts = await db.getAllAsync<{ latitud: number; longitud: number }>(
          `SELECT latitud, longitud FROM gps_registro 
           WHERE adulto_rut = ? AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (s.latitud_segura !== 0 && s.longitud_segura !== 0 && s.radio_seguro !== 0) {
          for (const ga of gpsAlerts) {
            const dist = getDistanceMeters(ga.latitud, ga.longitud, s.latitud_segura, s.longitud_segura);
            if (dist > s.radio_seguro) {
              totalAlerts += 1;
            }
          }
        }

        // Inactivity alerts count
        const actAlerts = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM actividad_registro 
           WHERE adulto_rut = ? AND estado = 'Sedentario' AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (actAlerts && s.nombres === 'Acdiel') totalAlerts += actAlerts.count;
      }
      setAlertasTotales(totalAlerts);

      // B. Device Adherence Percentage
      let totalAdherenceSum = 0;
      for (const s of seniors) {
        const activeDaysRes = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(DISTINCT date(timestamp)) as count 
           FROM frecuencia_cardiaca 
           WHERE adulto_rut = ? AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        const activeDays = activeDaysRes?.count ?? 0;
        const adherencePct = (activeDays / daysRangeReports) * 100;
        totalAdherenceSum += adherencePct;
      }
      const overallAdherence = seniors.length > 0 ? Math.round(totalAdherenceSum / seniors.length) : 0;
      setAdherenciaDispositivo(overallAdherence);

      // C. SpO2 and Stress averages for population
      let totalO2Sum = 0;
      let totalO2Count = 0;
      let totalStrSum = 0;
      let totalStrCount = 0;

      for (const s of seniors) {
        const avgO2Res = await db.getFirstAsync<{ avg_val: number }>(
          `SELECT AVG(porcentaje) as avg_val FROM oxigeno_sangre 
           WHERE adulto_rut = ? AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (avgO2Res && avgO2Res.avg_val !== null) {
          totalO2Sum += avgO2Res.avg_val;
          totalO2Count++;
        }

        const avgStrRes = await db.getFirstAsync<{ avg_val: number }>(
          `SELECT AVG(valor) as avg_val FROM estres 
           WHERE userId = ? AND timestamp >= date('now', ?)`,
          [s.rut, `-${daysRangeReports} days`]
        );
        if (avgStrRes && avgStrRes.avg_val !== null) {
          totalStrSum += avgStrRes.avg_val;
          totalStrCount++;
        }
      }

      setPromedioOxigenoPoblacion(totalO2Count > 0 ? Math.round(totalO2Sum / totalO2Count) : 98);
      setPromedioEstresPoblacion(totalStrCount > 0 ? Math.round(totalStrSum / totalStrCount) : 35);

      // C. Population State Distribution
      let movingCount = 0;
      let restingCount = 0;
      for (const s of seniors) {
        const latestAct = await db.getFirstAsync<{ estado: string }>(
          "SELECT estado FROM actividad_registro WHERE adulto_rut = ? ORDER BY timestamp DESC LIMIT 1",
          [s.rut]
        );
        if (latestAct) {
          if (latestAct.estado === 'En movimiento') {
            movingCount++;
          } else {
            restingCount++;
          }
        }
      }
      setEstadoPoblacion({ enMovimiento: movingCount, sedentario: restingCount });

      // D. Combined Heart Rate Average per Day
      const dailyHrs = await db.getAllAsync<{ day: string; avg_bpm: number }>(
        `SELECT date(fc.timestamp) as day, AVG(fc.bpm) as avg_bpm
         FROM frecuencia_cardiaca fc
         INNER JOIN adulto_medico amed ON fc.adulto_rut = amed.adulto_rut
         WHERE amed.medico_rut = ? AND fc.timestamp >= date('now', ?)
         GROUP BY day
         ORDER BY day ASC`,
        [docRut, `-${daysRangeReports} days`]
      );
      const combinedHrs: number[] = [];
      const baseTime = Date.now();
      const daysHelper = (d: number) => d * 24 * 60 * 60 * 1000;
      for (let i = 0; i < daysRangeReports; i++) {
        const targetDayStr = new Date(baseTime - daysHelper((daysRangeReports - 1) - i)).toISOString().split('T')[0];
        const record = dailyHrs.find(h => h.day === targetDayStr);
        combinedHrs.push(record ? Math.round(record.avg_bpm) : 0);
      }
      setFrecuenciaCardiacaPromedio(combinedHrs);
    } catch (error) {
      console.error('Error loading clinical dashboard data:', error);
    }
  };

  useEffect(() => {
    loadPacientes();

    // Refresh clinical dashboard data every 10 seconds reactively
    const interval = setInterval(() => {
      loadPacientes();
    }, 10000);

    return () => clearInterval(interval);
  }, [docRut, daysRangeReports]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir del perfil Médico?',
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

  // Agregar paciente de manera funcional a la base de datos
  const handleSimulateAddPatient = async (rut: string) => {
    const cleanRutVal = cleanRut(rut.trim());
    const db = getDB();
    try {
      // Check if senior exists in database
      const senior = await db.getFirstAsync<{ nombres: string; apellidos: string }>(
        "SELECT nombres, apellidos FROM adulto_mayor WHERE rut = ?", [cleanRutVal]
      );

      if (!senior) {
        Alert.alert(
          'Paciente No Encontrado',
          'El RUT ingresado no coincide con ningún Adulto Mayor registrado en el sistema.'
        );
        return;
      }

      // Check user role
      const user = await db.getFirstAsync<{ role: string }>(
        "SELECT role FROM users WHERE rut = ?", [cleanRutVal]
      );

      if (!user || user.role !== 'adulto_mayor') {
        Alert.alert('RUT inválido', 'El RUT ingresado no corresponde a un Adulto Mayor.');
        return;
      }

      // Check if already linked
      const linked = await db.getFirstAsync<{ adulto_rut: string }>(
        "SELECT adulto_rut FROM adulto_medico WHERE adulto_rut = ? AND medico_rut = ?",
        [cleanRutVal, docRut]
      );

      if (linked) {
        Alert.alert('Paciente Ya Vinculado', 'Este paciente ya se encuentra en tu directorio clínico.');
        return;
      }

      // Insert link
      await db.runAsync(
        "INSERT INTO adulto_medico (adulto_rut, medico_rut) VALUES (?, ?)",
        [cleanRutVal, docRut]
      );

      // Update doctor patients JSON array to maintain consistency
      const doctorData = await db.getFirstAsync<{ pacientes: string }>(
        "SELECT pacientes FROM medico WHERE rut = ?", [docRut]
      );
      let patientsArr: string[] = [];
      if (doctorData && doctorData.pacientes) {
        try {
          patientsArr = JSON.parse(doctorData.pacientes);
          if (!Array.isArray(patientsArr)) {
            patientsArr = [];
          }
        } catch (e) {
          patientsArr = [];
        }
      }
      if (!patientsArr.includes(cleanRutVal)) {
        patientsArr.push(cleanRutVal);
      }
      await db.runAsync(
        "UPDATE medico SET pacientes = ? WHERE rut = ?",
        [JSON.stringify(patientsArr), docRut]
      );

      Alert.alert(
        'Paciente Vinculado',
        `El paciente ${senior.nombres} ${senior.apellidos} ha sido vinculado a tu directorio con éxito.`,
        [{ text: 'Aceptar', onPress: () => loadPacientes() }]
      );

      setAddModalOpen(false);
    } catch (err) {
      console.error('Error linking patient to doctor:', err);
      Alert.alert('Error', 'Hubo un problema al vincular el paciente.');
    }
  };

  if (detailOpen && selectedPatientId !== null) {
    const p = pacientes.find((x) => x.id === selectedPatientId) || pacientes[0];
    if (!p) return null;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={activeColors.surface} />
        <DoctorDetalle
          patient={p}
          onBack={() => setDetailOpen(false)}
          fontSizeMultiplier={fontSizeMultiplier}
          activeColors={activeColors}
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

      {/* Cabecera superior común con Logout */}
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
              Médico
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.logoutButtonTop, tab === 'inicio' && { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={tab === 'inicio' ? '#ffffff' : activeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Contenido de Pestañas */}
      <View style={styles.content}>
        {tab === 'inicio' && (
          <DoctorInicio
            pacientes={pacientes}
            onSelectPatient={handleSelectPatient}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            docName={docName}
          />
        )}
        {tab === 'pacientes' && (
          <DoctorPacientes
            pacientes={pacientes}
            onSelectPatient={handleSelectPatient}
            onOpenAddModal={() => setAddModalOpen(true)}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
          />
        )}
        {tab === 'reportes' && (
          <DoctorReportes
            pacientesCount={pacientes.length}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
            alertasTotales={alertasTotales}
            adherenciaDispositivo={adherenciaDispositivo}
            estadoPoblacion={estadoPoblacion}
            frecuenciaCardiacaPromedio={frecuenciaCardiacaPromedio}
            promedioOxigenoPoblacion={promedioOxigenoPoblacion}
            promedioEstresPoblacion={promedioEstresPoblacion}
            daysRangeReports={daysRangeReports}
            setDaysRangeReports={setDaysRangeReports}
          />
        )}
        {tab === 'configuracion' && (
          <DoctorConfiguracion
            userRut={docRut}
            docName={docName}
            setDocName={setDocName}
            docEmail={docEmail}
            setDocEmail={setDocEmail}
            docAvatar={docAvatar}
            setDocAvatar={setDocAvatar}
            fontSizeMultiplier={fontSizeMultiplier}
            setFontSizeMultiplier={setFontSizeMultiplier}
            colorblindMode={colorblindMode}
            setColorblindMode={setColorblindMode}
            activeColors={activeColors}
            onLogout={handleLogout}
            onProfileUpdated={loadPacientes}
          />
        )}
      </View>

      {/* Barra de Navegación Inferior Estilo Premium Flotante */}
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
          color={activeColors.primaryDark}
          onPress={() => setTab('pacientes')}
          activeColors={activeColors}
        />
        <NavButton
          icon="bar-chart-2"
          label="Reportes"
          isActive={tab === 'reportes'}
          color={colorblindMode ? activeColors.primary : '#db2777'}
          onPress={() => setTab('reportes')}
          activeColors={activeColors}
        />
        <NavButton
          icon="settings"
          label="Ajustes"
          isActive={tab === 'configuracion'}
          color={activeColors.textSecondary}
          onPress={() => setTab('configuracion')}
          activeColors={activeColors}
        />
      </View>

      {/* Modal para solicitar / vincular paciente */}
      <AgregarPacienteModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleSimulateAddPatient}
        fontSizeMultiplier={fontSizeMultiplier}
        activeColors={activeColors}
      />
    </SafeAreaView>
  );
}

// ─── Sub-componente: Botón del Navbar ─────────────────────────────────────────
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
// 1. PESTAÑA: INICIO MÉDICO
// ===============================================================================
interface DoctorTabProps {
  pacientes: Paciente[];
  onSelectPatient: (id: number) => void;
  fontSizeMultiplier: number;
  activeColors: any;
  docName?: string;
}

function DoctorInicio({ pacientes, onSelectPatient, fontSizeMultiplier, activeColors, docName }: DoctorTabProps) {
  // Ordenar pacientes: Crítico -> Seguimiento -> Estable
  const orderMap = { 'Crítico': 0, 'Seguimiento': 1, 'Estable': 2 };
  const sortedPacientes = [...pacientes].sort((a, b) => orderMap[a.riesgo] - orderMap[b.riesgo]);

  const countCriticos = pacientes.filter((p) => p.riesgo === 'Crítico').length;
  const countSeguimiento = pacientes.filter((p) => p.riesgo === 'Seguimiento').length;
  const countEstables = pacientes.filter((p) => p.riesgo === 'Estable').length;

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      {/* Cabecera Púrpura */}
      <View style={[styles.purpleHeader, { backgroundColor: activeColors.headerBg }]}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={[styles.welcomeTitle, { fontSize: getFontSize(22, fontSizeMultiplier) }]}>
              Dr. {docName} <Text style={{ fontSize: 20 }}>🩺</Text>
            </Text>
            <Text style={[styles.welcomeSubtitle, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Vista clínica · {pacientes.length} pacientes asignados
            </Text>
          </View>
          <TouchableOpacity style={styles.alertBellHeader} activeOpacity={0.7}>
            <Feather name="bell" size={18} color="#fde047" />
            <View style={styles.bellRedDot} />
          </TouchableOpacity>
        </View>

        {/* Resumen de KPIs */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#5e60ce' ? '#4f46e5' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>{pacientes.length}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Pacientes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#865d96' }]}>
            <Text style={styles.summaryValue}>{countCriticos}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Críticos</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#5e60ce' ? '#4f46e5' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>{countSeguimiento + countEstables}</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Controlados</Text>
          </View>
        </View>
      </View>

      {/* Listado de Pacientes */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          Listado de Pacientes
        </Text>

        <View style={styles.patientsList}>
          {sortedPacientes.map((p) => (
            <PacienteCardMedico
              key={p.id}
              patient={p}
              onPress={() => onSelectPatient(p.id)}
              fontSizeMultiplier={fontSizeMultiplier}
              activeColors={activeColors}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-componente: Tarjeta de Paciente para Médico
interface PacienteCardMedicoProps {
  patient: Paciente;
  onPress: () => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function PacienteCardMedico({ patient, onPress, fontSizeMultiplier, activeColors }: PacienteCardMedicoProps) {
  let riskColor = activeColors.stable;
  let riskBg = activeColors.stableBg;
  if (patient.riesgo === 'Crítico') {
    riskColor = activeColors.critical;
    riskBg = activeColors.criticalBg;
  } else if (patient.riesgo === 'Seguimiento') {
    riskColor = activeColors.warning;
    riskBg = activeColors.warningBg;
  }

  return (
    <TouchableOpacity
      style={[
        styles.patientCard,
        { backgroundColor: activeColors.surface, borderColor: activeColors.border },
        patient.riesgo === 'Crítico' && { borderColor: activeColors.critical, borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Indicador de Estado Lateral */}
      <View style={[styles.statusIndicatorDot, { backgroundColor: riskColor }]} />

      <View style={[styles.patientAvatar, { backgroundColor: patient.riesgo === 'Crítico' ? '#fef08a' : activeColors.background }]}>
        <Text style={styles.patientAvatarText}>{patient.avatar}</Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={[styles.patientName, { color: activeColors.textPrimary, fontSize: getFontSize(15, fontSizeMultiplier) }]}>
          {patient.nombre}, {patient.edad}
        </Text>
        <View style={styles.patientDetailsRow}>
          <Feather name="heart" size={11} color={activeColors.heart} style={{ marginRight: 3 }} />
          <Text style={[styles.patientDetailsText, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            {patient.lpm} lpm {patient.esSimulado && '(Simulado)'} ·
          </Text>
          <Feather name="activity" size={11} color={activeColors.textMuted} style={{ marginLeft: 4, marginRight: 3 }} />
          <Text style={[styles.patientDetailsText, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            {patient.actividadStr}
          </Text>
        </View>
      </View>

      <View style={styles.patientStatusCol}>
        <View style={[styles.alertTag, { backgroundColor: riskBg }]}>
          <Text style={[styles.alertTagText, { color: riskColor, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
            {patient.riesgo}
          </Text>
        </View>
        <Text style={[styles.patientDiagText, { color: activeColors.textMuted, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
          {patient.diagnostico}
        </Text>
      </View>

      <Feather name="chevron-right" size={16} color={activeColors.textMuted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ===============================================================================
// 2. PESTAÑA: PACIENTES MÉDICO (DIRECTORIO)
// ===============================================================================
interface DoctorPacientesProps {
  pacientes: Paciente[];
  onSelectPatient: (id: number) => void;
  onOpenAddModal: () => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function DoctorPacientes({ pacientes, onSelectPatient, onOpenAddModal, fontSizeMultiplier, activeColors }: DoctorPacientesProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.directoryHeader}>
        <Text style={[styles.pageTitleDir, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
          Directorio
        </Text>
        <TouchableOpacity
          style={[styles.smallAddBtn, { backgroundColor: activeColors.primary }]}
          onPress={onOpenAddModal}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={[styles.smallAddBtnText, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.patientsListDir}>
        {pacientes.map((p) => (
          <PacienteCardMedico
            key={p.id}
            patient={p}
            onPress={() => onSelectPatient(p.id)}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ===============================================================================
// 3. DETALLE / REPORTE CLÍNICO DEL PACIENTE
// ===============================================================================
interface DoctorDetalleProps {
  patient: Paciente;
  onBack: () => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function DoctorDetalle({ patient, onBack, fontSizeMultiplier, activeColors }: DoctorDetalleProps) {
  const insets = useSafeAreaInsets();
  const [daysRange, setDaysRange] = useState<7 | 30>(7);
  const [pulsoHistorico, setPulsoHistorico] = useState<number[]>(patient.pulsoHistorico || []);
  const [oxigenoHistorico, setOxigenoHistorico] = useState<number[]>(patient.oxigenoHistorico || []);
  const [estresHistorico, setEstresHistorico] = useState<number[]>(patient.estresHistorico || []);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  let riskColor = activeColors.stable;
  let riskBg = activeColors.stableBg;
  if (patient.riesgo === 'Crítico') {
    riskColor = activeColors.critical;
    riskBg = activeColors.criticalBg;
  } else if (patient.riesgo === 'Seguimiento') {
    riskColor = activeColors.warning;
    riskBg = activeColors.warningBg;
  }

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
        console.error('[DoctorDetalle] Error fetching temporal range metrics:', err);
      }
    };
    fetchRangeData();
  }, [patient.rut, daysRange]);

  // Averages calculations for CP-12
  const avgBpm = Math.round(pulsoHistorico.reduce((a, b) => a + b, 0) / pulsoHistorico.length) || 72;
  const avgO2 = Math.round(oxigenoHistorico.reduce((a, b) => a + b, 0) / oxigenoHistorico.length) || 98;
  const avgStress = Math.round(estresHistorico.reduce((a, b) => a + b, 0) / estresHistorico.length) || 35;

  // Cálculos dinámicos para los gráficos de curvas SVG (Pulsos de 7/30 días)
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = Math.max(...pulsoHistorico, 100);
  const minVal = Math.min(...pulsoHistorico, 50);
  const valRange = maxVal - minVal || 10;

  const points = pulsoHistorico.map((val, idx) => {
    const x = (idx / (pulsoHistorico.length - 1)) * svgWidth;
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

  // Encontrar el pico más alto
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
            {patient.nombre}
          </Text>
        </View>
        <View style={[styles.alertTag, { backgroundColor: riskBg }]}>
          <Feather name="alert-triangle" size={10} color={riskColor} style={{ marginRight: 3 }} />
          <Text style={[styles.alertTagText, { color: riskColor, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
            {patient.riesgo}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.detailScroll} contentContainerStyle={[styles.detailScrollPadding, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>

        {/* Ficha Resumen de Paciente */}
        <View style={[styles.patientDetailCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.avatarCircleBig}>
            <Text style={{ fontSize: 36 }}>{patient.avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.patientDetailName, { color: activeColors.textPrimary, fontSize: getFontSize(18, fontSizeMultiplier) }]}>
              {patient.nombre}
            </Text>
            <Text style={[styles.patientDetailSubtitle, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              {patient.edad} años · {patient.antecedentes ? 'Historial Completo' : 'Sin antecedentes'}
            </Text>
            <View style={styles.tagBadgeRow}>
              <View style={[styles.badgeItem, { backgroundColor: activeColors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: activeColors.primaryDark, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
                  {patient.diagnostico}
                </Text>
              </View>
              {patient.wearableActivo && (
                <View style={[styles.badgeItem, { backgroundColor: activeColors.stableBg }]}>
                  <Text style={[styles.badgeText, { color: activeColors.stable, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
                    Wearable Activo
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Banner de alerta visible si corresponde */}
        {patient.alertaActiva && (
          <View style={[styles.detailAlertBanner, { backgroundColor: activeColors.criticalBg, borderColor: activeColors.critical }]}>
            <Feather name="alert-octagon" size={20} color={activeColors.critical} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailAlertTitle, { color: activeColors.critical, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
                {patient.alertaTitulo}
              </Text>
              <Text style={[styles.detailAlertDesc, { color: activeColors.textPrimary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
                {patient.alertaDesc}
              </Text>
              <Text style={{ color: activeColors.textSecondary, fontSize: 9, marginTop: 4, fontWeight: '600' }}>
                Última actualización: {patient.ultimaActualizacion}
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

        {/* Métricas Clínicas */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            Métricas Clínicas Recientes
          </Text>

          <View style={styles.statDoubleCol}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                PULSO CARDÍACO
              </Text>
              <Text style={[styles.statBoxValue, { color: patient.riesgo === 'Crítico' ? activeColors.critical : activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.lpm} <Text style={{ fontSize: 12, fontWeight: '700' }}>lpm</Text>
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.riesgo === 'Crítico' ? activeColors.critical : activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.riesgo === 'Crítico' ? '↑ Elevado (umbral 85)' : '✓ Estable'}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                ACTIVIDAD FÍSICA
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
                {patient.actividadStr}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.warning, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.alertaActiva ? '⚠ Posible Caída' : '✓ Normal'}
              </Text>
            </View>
          </View>

          <View style={[styles.statDoubleCol, { marginTop: 12 }]}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                PRESIÓN ARTERIAL
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.presion}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.presion === '140/90' ? '↑ Moderadamente Alta' : '✓ Estable'}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                GLUCOSA
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.glucosa} <Text style={{ fontSize: 10, fontWeight: '700' }}>mg/dL</Text>
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.stable, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                ✓ Controlada · Manual
              </Text>
            </View>
          </View>

          <View style={[styles.statDoubleCol, { marginTop: 12 }]}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                SATURACIÓN DE OXÍGENO
              </Text>
              <Text style={[styles.statBoxValue, { color: patient.oxigeno < 95 ? activeColors.critical : activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.oxigeno}%
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.oxigeno < 95 ? activeColors.critical : activeColors.stable, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.oxigeno < 95 ? '↓ Baja (Umbral 95%)' : '✓ Óptima'}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                NIVEL DE ESTRÉS
              </Text>
              <Text style={[styles.statBoxValue, { color: patient.estres > 80 ? activeColors.critical : activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.estres} <Text style={{ fontSize: 12, fontWeight: '700' }}>/ 100</Text>
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.estres > 80 ? activeColors.critical : patient.estres > 40 ? activeColors.warning : activeColors.stable, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.estres > 80 ? '↑ Crítico' : patient.estres > 40 ? '⚠ Moderado' : '✓ Normal'}
              </Text>
            </View>
          </View>

          <View style={[styles.statDoubleCol, { marginTop: 12 }]}>
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border, flex: 0.5 }]}>
              <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                TEMPERATURA CORPORAL
              </Text>
              <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>
                {patient.temperatura !== null ? `${patient.temperatura} °C` : 'Sin datos registrados'}
              </Text>
              <Text style={[styles.statBoxSub, { color: patient.temperatura !== null && patient.temperatura >= 37.5 ? activeColors.critical : activeColors.stable, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                {patient.temperatura !== null && patient.temperatura >= 37.5 ? '↑ Fiebre' : '✓ Normal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Gráfico SVG de Pulso */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="heart" size={14} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Evolución del Pulso (Promedio: {avgBpm} LPM) — Últimos {daysRange} días
            </Text>
          </View>
          <View style={styles.svgContainer}>
            <Svg height={svgHeight} width={svgWidth}>
              {/* Umbral en Línea Punteada Roja */}
              <Line
                x1="0"
                y1={svgHeight - 12 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                x2={svgWidth}
                y2={svgHeight - 12 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                stroke={activeColors.critical}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <SvgText
                x={svgWidth - 45}
                y={svgHeight - 16 - ((85 - minVal) / valRange) * (svgHeight - 24)}
                fill={activeColors.critical}
                fontSize="8"
                fontWeight="bold"
              >
                Umbral (85)
              </SvgText>

              {/* Trazo SVG del pulso */}
              <Path d={dPath} fill="none" stroke={activeColors.primary} strokeWidth="2.5" />

              {/* Puntos y textos de valores */}
              {points.map((pt, idx) => {
                const isPeak = idx === peakIdx && pt.val > 85;
                return (
                  <React.Fragment key={idx}>
                    <SvgCircle
                      cx={pt.x}
                      cy={pt.y}
                      r={isPeak ? 4.5 : 2.5}
                      fill={isPeak ? activeColors.critical : activeColors.primary}
                    />
                    {isPeak && (
                      <SvgText
                        x={pt.x}
                        y={pt.y - 8}
                        fill={activeColors.critical}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {pt.val}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Gráfico de barras de Actividad física */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={14} color={activeColors.activity} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Horas Activas por Día
            </Text>
          </View>

          <View style={styles.customBarGraph}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => {
              const val = patient.actividadSemana[idx] || 0;
              const maxAct = 10; // Escala máxima de 10 horas
              const pct = Math.min((val / maxAct) * 100, 100);

              return (
                <View key={day} style={styles.barItemCol}>
                  <View style={styles.barBackgroundContainer}>
                    <View style={[styles.barValueFill, { height: `${pct}%`, backgroundColor: activeColors.activity }]} />
                  </View>
                  <Text style={[styles.barDayText, { fontSize: getFontSize(8, fontSizeMultiplier) }]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Gráfico de Saturación de Oxígeno (SpO2) */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={14} color={activeColors.oxygen} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Saturación de Oxígeno (SpO2, Promedio: {avgO2}%) — Últimos {daysRange} días
            </Text>
          </View>
          <View style={styles.svgContainer}>
            <Svg height={svgHeight} width={svgWidth}>
              {/* Umbral en Línea Punteada Roja (95%) */}
              <Line
                x1="0"
                y1={svgHeight - 12 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                x2={svgWidth}
                y2={svgHeight - 12 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                stroke={activeColors.critical}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <SvgText
                x={svgWidth - 45}
                y={svgHeight - 16 - ((95 - minO2) / o2Range) * (svgHeight - 24)}
                fill={activeColors.critical}
                fontSize="8"
                fontWeight="bold"
              >
                Umbral (95%)
              </SvgText>

              {/* Trazo SVG del SpO2 */}
              <Path d={dPathO2} fill="none" stroke={activeColors.oxygen} strokeWidth="2.5" />

              {/* Puntos y textos de valores */}
              {o2Points.map((pt, idx) => {
                const isMin = idx === minO2Idx && pt.val < 95;
                return (
                  <React.Fragment key={idx}>
                    <SvgCircle
                      cx={pt.x}
                      cy={pt.y}
                      r={isMin ? 4.5 : 2.5}
                      fill={isMin ? activeColors.critical : activeColors.oxygen}
                    />
                    {isMin && (
                      <SvgText
                        x={pt.x}
                        y={pt.y - 8}
                        fill={activeColors.critical}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {pt.val}%
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Gráfico de Nivel de Estrés */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="zap" size={14} color="#eab308" style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Nivel de Estrés (Promedio: {avgStress}%) — Últimos {daysRange} días
            </Text>
          </View>
          <View style={styles.svgContainer}>
            <Svg height={svgHeight} width={svgWidth}>
              {/* Umbral en Línea Punteada Roja (70) */}
              <Line
                x1="0"
                y1={svgHeight - 12 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                x2={svgWidth}
                y2={svgHeight - 12 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                stroke={activeColors.critical}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <SvgText
                x={svgWidth - 45}
                y={svgHeight - 16 - ((70 - minStr) / strRange) * (svgHeight - 24)}
                fill={activeColors.critical}
                fontSize="8"
                fontWeight="bold"
              >
                Umbral (70)
              </SvgText>

              {/* Trazo SVG del Estrés */}
              <Path d={dPathStr} fill="none" stroke="#eab308" strokeWidth="2.5" />

              {/* Puntos y textos de valores */}
              {strPoints.map((pt, idx) => {
                const isPeak = idx === peakStrIdx && pt.val > 70;
                return (
                  <React.Fragment key={idx}>
                    <SvgCircle
                      cx={pt.x}
                      cy={pt.y}
                      r={isPeak ? 4.5 : 2.5}
                      fill={isPeak ? activeColors.critical : '#eab308'}
                    />
                    {isPeak && (
                      <SvgText
                        x={pt.x}
                        y={pt.y - 8}
                        fill={activeColors.critical}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {pt.val}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Botones de acción en expediente */}
        <View style={styles.detailActionsRow}>
          <TouchableOpacity
            style={[styles.detailActBtnPrimary, { backgroundColor: activeColors.primary }]}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={[styles.detailActBtnText, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Historial Completo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.detailActBtnSecondary, { borderColor: activeColors.primary }]}
            onPress={() => Alert.alert('Umbrales', 'Configuración de alertas personalizadas para este paciente.')}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={14} color={activeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.detailActBtnTextSecondary, { color: activeColors.primary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Umbrales
            </Text>
          </TouchableOpacity>
        </View>

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
// 4. PESTAÑA: REPORTES CLÍNICOS GENERALES
// ===============================================================================
interface DoctorReportesProps {
  pacientesCount: number;
  fontSizeMultiplier: number;
  activeColors: any;
  alertasTotales?: number;
  adherenciaDispositivo?: number;
  estadoPoblacion?: { enMovimiento: number; sedentario: number };
  frecuenciaCardiacaPromedio?: number[];
  promedioOxigenoPoblacion?: number;
  promedioEstresPoblacion?: number;
  daysRangeReports: 7 | 30;
  setDaysRangeReports: (val: 7 | 30) => void;
}

function DoctorReportes({
  pacientesCount,
  fontSizeMultiplier,
  activeColors,
  alertasTotales = 0,
  adherenciaDispositivo = 0,
  estadoPoblacion = { enMovimiento: 0, sedentario: 0 },
  frecuenciaCardiacaPromedio = [],
  promedioOxigenoPoblacion = 98,
  promedioEstresPoblacion = 35,
  daysRangeReports,
  setDaysRangeReports
}: DoctorReportesProps) {
  // Gráfico semanal de pulso promedio poblacional (7 días)
  const pulseAvg = frecuenciaCardiacaPromedio.filter(val => val > 0);
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = pulseAvg.length > 0 ? Math.max(...pulseAvg, 90) : 90;
  const minVal = pulseAvg.length > 0 ? Math.min(...pulseAvg, 60) : 60;
  const valRange = maxVal - minVal || 10;

  const points = pulseAvg.map((val, idx) => {
    const x = (idx / (pulseAvg.length - 1)) * svgWidth;
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

  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.reportsHeaderRow}>
        <Text style={[styles.pageTitleDir, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
          Reportes Clínicos
        </Text>
        <View style={[styles.rangeSegmentContainer, { backgroundColor: activeColors.surface, borderColor: activeColors.border, marginHorizontal: 0, marginBottom: 0, width: 140, height: 36, padding: 3 }]}>
          <TouchableOpacity
            style={[styles.rangeSegment, daysRangeReports === 7 && { backgroundColor: activeColors.primary }]}
            onPress={() => setDaysRangeReports(7)}
          >
            <Text style={[styles.rangeSegmentText, { color: daysRangeReports === 7 ? '#ffffff' : activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              7 días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeSegment, daysRangeReports === 30 && { backgroundColor: activeColors.primary }]}
            onPress={() => setDaysRangeReports(30)}
          >
            <Text style={[styles.rangeSegmentText, { color: daysRangeReports === 30 ? '#ffffff' : activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>
              30 días
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        {/* Resumen KPIs */}
        <View style={styles.summaryRow}>
          <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              ALERTAS TOTALES
            </Text>
            <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(28, fontSizeMultiplier) }]}>
              {alertasTotales}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.critical, marginTop: 4 }}>
              Alertas del periodo
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              ADHERENCIA DISP.
            </Text>
            <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(28, fontSizeMultiplier) }]}>
              {adherenciaDispositivo}%
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.stable, marginTop: 4 }}>
              Uso de wearable activo
            </Text>
          </View>
        </View>

        {/* Segunda Fila KPIs para SpO2 y Estrés Poblacionales */}
        <View style={[styles.summaryRow, { marginTop: 12 }]}>
          <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              SPO2 PROMEDIO
            </Text>
            <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(28, fontSizeMultiplier) }]}>
              {promedioOxigenoPoblacion}%
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.primary, marginTop: 4 }}>
              Saturación de oxígeno
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              ESTRÉS PROMEDIO
            </Text>
            <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(28, fontSizeMultiplier) }]}>
              {promedioEstresPoblacion}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.stable, marginTop: 4 }}>
              Nivel de estrés global
            </Text>
          </View>
        </View>

        {/* Gráfico de Barra Apilada de Población */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border, marginTop: 16 }]}>
          <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(11, fontSizeMultiplier), marginBottom: 12 }]}>
            ESTADO DE LA POBLACIÓN ({pacientesCount})
          </Text>

          {/* Barra apilada simulada con Flex */}
          <View style={styles.stackedBarContainer}>
            {estadoPoblacion.enMovimiento === 0 && estadoPoblacion.sedentario === 0 ? (
              <View style={[styles.stackedBarSegment, { flex: 1, backgroundColor: activeColors.border }]}>
                <Text style={[styles.stackedBarText, { color: activeColors.textSecondary }]}>Sin datos</Text>
              </View>
            ) : (
              <>
                {estadoPoblacion.enMovimiento > 0 && (
                  <View style={[styles.stackedBarSegment, { flex: estadoPoblacion.enMovimiento, backgroundColor: activeColors.stable }]}>
                    <Text style={styles.stackedBarText}>
                      {Math.round((estadoPoblacion.enMovimiento / (estadoPoblacion.enMovimiento + estadoPoblacion.sedentario)) * 100)}%
                    </Text>
                  </View>
                )}
                {estadoPoblacion.sedentario > 0 && (
                  <View style={[styles.stackedBarSegment, { flex: estadoPoblacion.sedentario, backgroundColor: activeColors.critical }]}>
                    <Text style={styles.stackedBarText}>
                      {Math.round((estadoPoblacion.sedentario / (estadoPoblacion.enMovimiento + estadoPoblacion.sedentario)) * 100)}%
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Glosa del Gráfico */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: activeColors.stable }]} />
              <Text style={[styles.legendText, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>En movimiento</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: activeColors.critical }]} />
              <Text style={[styles.legendText, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>Sedentario</Text>
            </View>
          </View>
        </View>

        {/* Gráfico Evolución del Pulso Promedio */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border, marginTop: 16 }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={14} color={activeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              FREC. CARDÍACA PROMEDIO
            </Text>
          </View>

          {pulseAvg.length > 0 ? (
            <>
              <View style={styles.svgContainer}>
                <Svg height={svgHeight} width={svgWidth}>
                  <Line
                    x1="0"
                    y1={svgHeight - 12 - ((75 - minVal) / valRange) * (svgHeight - 24)}
                    x2={svgWidth}
                    y2={svgHeight - 12 - ((75 - minVal) / valRange) * (svgHeight - 24)}
                    stroke={activeColors.textMuted}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <SvgText
                    x={svgWidth - 75}
                    y={svgHeight - 16 - ((75 - minVal) / valRange) * (svgHeight - 24)}
                    fill={activeColors.textSecondary}
                    fontSize="8"
                    fontWeight="600"
                  >
                    Media Población: 75 lpm
                  </SvgText>

                  <Path d={dPath} fill="none" stroke={activeColors.primary} strokeWidth="2.5" />

                  {points.map((pt, idx) => (
                    <React.Fragment key={idx}>
                      <SvgCircle
                        cx={pt.x}
                        cy={pt.y}
                        r="3"
                        fill={pt.val > 80 ? activeColors.critical : activeColors.primary}
                      />
                    </React.Fragment>
                  ))}
                </Svg>
              </View>

              <View style={styles.graphDaysRow}>
                {daysRangeReports === 7 ? (
                  ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'].map((day) => (
                    <Text key={day} style={[styles.graphDayText, { color: activeColors.textSecondary, fontSize: getFontSize(8, fontSizeMultiplier) }]}>
                      {day}
                    </Text>
                  ))
                ) : (
                  ['Hace 30d', 'Hace 20d', 'Hace 10d', 'Hoy'].map((day) => (
                    <Text key={day} style={[styles.graphDayText, { color: activeColors.textSecondary, fontSize: getFontSize(8, fontSizeMultiplier) }]}>
                      {day}
                    </Text>
                  ))
                )}
              </View>
            </>
          ) : (
            <View style={{ height: svgHeight + 20, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: activeColors.textMuted, fontSize: 12 }}>Esperando datos...</Text>
            </View>
          )}
        </View>

        {/* Botón Exportar PDF */}
        <TouchableOpacity
          style={[styles.pdfButton, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow }]}
          onPress={() => Alert.alert('Exportar Reporte', 'Generando y exportando reporte médico semanal en formato PDF...')}
          activeOpacity={0.8}
        >
          <Feather name="file-text" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={[styles.pdfButtonText, { fontSize: getFontSize(14, fontSizeMultiplier) }]}>
            Exportar Reporte Semanal (PDF)
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ===============================================================================
// 5. SUB-PANTALLA: CONFIGURACIÓN / AJUSTES MÉDICO
// ===============================================================================
interface DoctorConfiguracionProps {
  userRut: string;
  docName: string;
  setDocName: (n: string) => void;
  docEmail: string;
  setDocEmail: (e: string) => void;
  docAvatar: string;
  setDocAvatar: (a: string) => void;
  fontSizeMultiplier: number;
  setFontSizeMultiplier: (m: number) => void;
  colorblindMode: boolean;
  setColorblindMode: (b: boolean) => void;
  activeColors: any;
  onLogout: () => void;
  onProfileUpdated: () => void;
}

function DoctorConfiguracion({
  userRut,
  docName,
  setDocName,
  docEmail,
  setDocEmail,
  docAvatar,
  setDocAvatar,
  fontSizeMultiplier,
  setFontSizeMultiplier,
  colorblindMode,
  setColorblindMode,
  activeColors,
  onLogout,
  onProfileUpdated,
}: DoctorConfiguracionProps) {
  const { updateSessionName } = useAuth();
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['🩺', '👩‍⚕️', '👨‍⚕️', '🔬', '🏥', '⚕️'];

  const handleSaveProfile = async () => {
    if (!docName.trim() || !docEmail.trim()) {
      Alert.alert('Datos Incompletos', 'El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (pass && pass.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pass && pass !== confirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    // Split name into names and last names
    const parts = docName.trim().split(' ');
    const nombres = parts[0] || '';
    const apellidos = parts.slice(1).join(' ') || '';

    const db = getDB();
    try {
      // 1. Update nombres, apellidos, and email in medico table
      await db.runAsync(
        "UPDATE medico SET nombres = ?, apellidos = ?, email = ? WHERE rut = ?",
        [nombres, apellidos, docEmail, userRut]
      );

      // 2. If password entered, hash and update users table
      if (pass) {
        const hashedPassword = sha256(pass);
        await db.runAsync(
          "UPDATE users SET psswd_hash = ? WHERE rut = ?",
          [hashedPassword, userRut]
        );
      }

      // 3. Update reactive context name
      updateSessionName(nombres);

      // 4. Trigger profile re-fetch in doctor.tsx
      onProfileUpdated();

      Alert.alert('Éxito', 'Configuración profesional actualizada correctamente.');
      setPass('');
      setConfirmPass('');
    } catch (error) {
      console.error('Error saving doctor profile changes:', error);
      Alert.alert('Error', 'Hubo un problema al guardar los cambios en la base de datos.');
    }
  };

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollPadding, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
        Ajustes
      </Text>

      {/* SECCIÓN 1: CUENTA */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        CUENTA PROFESIONAL
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Selector de Identificador Visual */}
        <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 8 }]}>
          Identificador Clínico (Avatar)
        </Text>
        <View style={styles.avatarPickerRow}>
          {avataresDisponibles.map((av) => (
            <TouchableOpacity
              key={av}
              style={[
                styles.avatarPickerItem,
                docAvatar === av && { borderColor: activeColors.primary, backgroundColor: activeColors.primaryLight }
              ]}
              onPress={() => setDocAvatar(av)}
            >
              <Text style={{ fontSize: 22 }}>{av}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Nombre */}
        <View style={styles.settingsFormRow}>
          <Text style={[styles.formLabelText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier), marginBottom: 6 }]}>
            Nombre Profesional
          </Text>
          <View style={[styles.inputContainer, { borderColor: activeColors.border }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(14, fontSizeMultiplier), color: activeColors.textPrimary }]}
              value={docName}
              onChangeText={setDocName}
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
              value={docEmail}
              keyboardType="email-address"
              onChangeText={setDocEmail}
            />
          </View>
        </View>
      </View>

      {/* SECCIÓN 2: ACCESIBILIDAD */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        ACCESIBILIDAD E INTERFAZ
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Tamaño de Letras Segmentado */}
        <View style={styles.settingsOptionRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
              Tamaño de Letras
            </Text>
            <Text style={[styles.optionDesc, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Aumenta el tamaño de la tipografía para mayor claridad visual.
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

        {/* Switch Modo Daltonismo */}
        <View style={styles.settingsOptionSwitchRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.optionTitle, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
              Modo Daltonismo
            </Text>
            <Text style={[styles.optionDesc, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Esquema de colores optimizado con alto contraste.
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

      {/* SECCIÓN 3: SEGURIDAD Y ACCESO */}
      <Text style={[styles.settingsGroupTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
        SEGURIDAD Y ACCESO
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>

        {/* Input Nueva Contraseña */}
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

        {/* Input Confirmar Contraseña */}
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

      {/* Cerrar Sesión */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: activeColors.critical, marginTop: 16 }]}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color={activeColors.critical} style={{ marginRight: 6 }} />
        <Text style={[styles.logoutBtnText, { color: activeColors.critical, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
          Cerrar Sesión Profesional
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ===============================================================================
// MODAL: VINCULAR PACIENTE
// ===============================================================================
interface AgregarPacienteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rut: string) => void;
  fontSizeMultiplier: number;
  activeColors: any;
}

function AgregarPacienteModal({ visible, onClose, onSubmit, fontSizeMultiplier, activeColors }: AgregarPacienteModalProps) {
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
              Vincular Paciente
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={activeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
            Ingresa el RUT del Adulto Mayor que deseas agregar a tu panel de monitoreo.
          </Text>

          <View style={[styles.inputContainer, { borderColor: activeColors.border, marginVertical: 16 }]}>
            <TextInput
              style={[styles.formInput, { fontSize: getFontSize(15, fontSizeMultiplier), color: activeColors.textPrimary }]}
              placeholder="Ej: 12.345.678-9"
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
                Enviar solicitud
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ===============================================================================
// ESTILOS DE LA PANTALLA MÉDICO
// ===============================================================================
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
    paddingBottom: 110, // Espacio para el BottomNav flotante
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
  purpleHeader: {
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
    color: '#e0e7ff', // indigo-100
    marginTop: 2,
    fontWeight: '500',
  },
  alertBellHeader: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    borderColor: '#5e60ce',
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
    color: '#e0e7ff',
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
    position: 'relative',
    overflow: 'hidden',
  },
  statusIndicatorDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
  },
  patientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  patientAvatarText: {
    fontSize: 22,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: '800',
  },
  patientDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  patientDetailsText: {
    fontWeight: '500',
  },
  patientStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  patientDiagText: {
    fontWeight: '600',
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

  // 2. PACIENTES / DIRECTORIO STYLES
  directoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 14,
  },
  pageTitleDir: {
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  smallAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  smallAddBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  patientsListDir: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },

  // 3. DETALLE EXPEDIENTE STYLES
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
  patientDetailCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarCircleBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffd166',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  patientDetailName: {
    fontWeight: '800',
  },
  patientDetailSubtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  tagBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badgeItem: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
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
  detailAlertBanner: {
    borderWidth: 1.5,
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
  detailActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  detailActBtnPrimary: {
    flex: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  detailActBtnSecondary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
  },
  detailActBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  detailActBtnTextSecondary: {
    fontWeight: '800',
  },

  // 4. REPORTES CLINICOS STYLES
  reportsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 6,
  },
  stackedBarContainer: {
    height: 24,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stackedBarSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedBarText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontWeight: '700',
  },
  graphDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  graphDayText: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pdfButton: {
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  pdfButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // 5. AJUSTES STYLES
  pageTitle: {
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  settingsGroupTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 18,
    paddingLeft: 4,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
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
  logoutBtn: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#fef2f2',
  },
  logoutBtnText: {
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
});
