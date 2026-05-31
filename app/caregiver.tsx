import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import Svg, { Line, Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';

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
  edad: number;
  avatar: string;
  estado: string;
  lpm: number;
  direccion: string;
  tiempoDato: string;
  alertaActiva: boolean;
  alertaTitulo?: string;
  alertaDesc?: string;
  alertaGravedad?: 'alta' | 'media' | 'baja';
  presion: string;
  glucosa: number;
  coordenadas: {
    latitude: number;
    longitude: number;
  };
  pulsoHistorico: number[];
  actividadSemana: number[]; // horas activas lun-dom
}

const PACIENTES_DATA: Paciente[] = [
  {
    id: 1,
    nombre: 'Acdiel Bombin',
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
    coordenadas: { latitude: -33.4489, longitude: -70.6693 },
    pulsoHistorico: [72, 75, 70, 89, 72, 74, 72],
    actividadSemana: [6, 8, 5, 2, 6, 7, 6.5],
  },
  {
    id: 2,
    nombre: 'Rosa Vega',
    edad: 71,
    avatar: '👵',
    estado: 'Normal',
    lpm: 68,
    direccion: 'Zona Segura',
    tiempoDato: 'hace 5 min',
    alertaActiva: false,
    presion: '120/75',
    glucosa: 105,
    coordenadas: { latitude: -33.4515, longitude: -70.6650 },
    pulsoHistorico: [66, 68, 67, 69, 68, 70, 68],
    actividadSemana: [5, 6, 7, 8, 6.5, 7, 7.5],
  },
  {
    id: 3,
    nombre: 'Pedro Soto',
    edad: 83,
    avatar: '👴',
    estado: 'Normal',
    lpm: 74,
    direccion: 'Casa',
    tiempoDato: 'hace 12 min',
    alertaActiva: false,
    presion: '132/85',
    glucosa: 122,
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
  const [tab, setTab] = useState<'inicio' | 'pacientes' | 'alertas' | 'configuracion'>('inicio');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ─── Estados de Perfil Editables del Cuidador ──────────────────────────────
  const [name, setName] = useState('María');
  const [email, setEmail] = useState('maria.cuidadora@innercore.cl');
  const [avatar, setAvatar] = useState('👩‍⚕️');

  // ─── Estados de Accesibilidad Globales ────────────────────────────────────
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0); // 1.0, 1.2, 1.4
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Obtener colores basados en el modo de daltonismo activo
  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

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

  // Renderizado condicional si la vista de detalle está abierta
  if (detailOpen && selectedPatientId !== null) {
    const p = PACIENTES_DATA.find((x) => x.id === selectedPatientId) || PACIENTES_DATA[0];
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={activeColors.surface} />
        <CaregiverDetalle
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

      {/* Header flotante de logout superior */}
      <View style={[styles.topLogoutHeader, tab === 'inicio' && { borderBottomWidth: 0, backgroundColor: activeColors.headerBg }]}>
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
          />
        )}
        {tab === 'pacientes' && (
          <CaregiverPacientes
            onSelectPatient={handleSelectPatient}
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
          />
        )}
        {tab === 'alertas' && (
          <CaregiverAlertas
            fontSizeMultiplier={fontSizeMultiplier}
            activeColors={activeColors}
          />
        )}
        {tab === 'configuracion' && (
          <CaregiverConfiguracion
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
          />
        )}
      </View>

      {/* Navbar Inferior de 4 Pestañas */}
      <View style={[styles.navbar, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
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
}

function CaregiverInicio({ onSelectPatient, fontSizeMultiplier, activeColors, name }: CaregiverTabProps) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>

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
          <TouchableOpacity style={[styles.alertBellHeader, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryLight }]} activeOpacity={0.7}>
            <Feather name="bell" size={18} color={activeColors.primary === '#10b981' ? '#fde047' : activeColors.primary} />
            <View style={styles.bellRedDot} />
          </TouchableOpacity>
        </View>

        {/* Resumen de Métricas */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>3</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier) }]}>Pacientes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#374151' : activeColors.border }]}>
            <Text style={[styles.summaryValue, { color: activeColors.primary === '#10b981' ? '#ffffff' : activeColors.textPrimary }]}>1</Text>
            <Text style={[styles.summaryLabel, { fontSize: getFontSize(9, fontSizeMultiplier), color: activeColors.primary === '#10b981' ? '#e5e7eb' : activeColors.textSecondary }]}>Alerta</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: activeColors.primary === '#10b981' ? '#065f46' : activeColors.primaryDark }]}>
            <Text style={styles.summaryValue}>2</Text>
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
          {PACIENTES_DATA.map((p) => (
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
          onPress={() => Alert.alert('Vincular Paciente', 'Esta funcionalidad estará disponible una vez que el backend sea conectado.')}
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
            {patient.lpm} lpm
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
function CaregiverPacientes({ onSelectPatient, fontSizeMultiplier, activeColors }: CaregiverTabProps) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
        Mis Pacientes
      </Text>

      <View style={styles.patientsList}>
        {PACIENTES_DATA.map((p) => (
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
        onPress={() => Alert.alert('Vincular Paciente', 'Esta funcionalidad estará disponible una vez que el backend sea conectado.')}
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
function CaregiverAlertas({ fontSizeMultiplier, activeColors }: CaregiverTabProps) {
  const activas = ALERTAS_DATA.filter((a) => a.activa);
  const historial = ALERTAS_DATA.filter((a) => !a.activa);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <View style={styles.alertsHeaderRow}>
        <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier), marginBottom: 0 }]}>
          Alertas
        </Text>
        <View style={[styles.alertsCountTag, { backgroundColor: activeColors.emergency }]}>
          <Text style={[styles.alertsCountText, { fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            2 nuevas
          </Text>
        </View>
      </View>

      {/* Alertas Activas */}
      <View style={styles.alertSection}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          ACTIVAS
        </Text>
        <View style={styles.alertsList}>
          {activas.map((a) => (
            <AlertCard
              key={a.id}
              item={a}
              fontSizeMultiplier={fontSizeMultiplier}
              activeColors={activeColors}
            />
          ))}
        </View>
      </View>

      {/* Historial Reciente */}
      <View style={styles.alertSection}>
        <Text style={[styles.sectionTitleLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier), marginTop: 14 }]}>
          HISTORIAL RECIENTE
        </Text>
        <View style={styles.alertsList}>
          {historial.map((a) => (
            <AlertCard
              key={a.id}
              item={a}
              fontSizeMultiplier={fontSizeMultiplier}
              activeColors={activeColors}
            />
          ))}
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
}

function CaregiverDetalle({ patient, onBack, fontSizeMultiplier, activeColors }: CaregiverDetalleProps) {
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

  // Coordenadas simuladas para mostrar en el mapa interactivo real
  const region = {
    latitude: patient.coordenadas.latitude,
    longitude: patient.coordenadas.longitude,
    latitudeDelta: 0.004,
    longitudeDelta: 0.004,
  };

  // Cálculos dinámicos para los gráficos de curvas SVG (Pulsos de 7 días)
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = Math.max(...patient.pulsoHistorico, 100);
  const minVal = Math.min(...patient.pulsoHistorico, 50);
  const valRange = maxVal - minVal;

  const points = patient.pulsoHistorico.map((val, idx) => {
    const x = (idx / (patient.pulsoHistorico.length - 1)) * svgWidth;
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

  // Encontrar el valor más alto para marcarlo (como el pico de 89 lpm de Carlos)
  const peakIdx = patient.pulsoHistorico.indexOf(Math.max(...patient.pulsoHistorico));

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

      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollPadding} showsVerticalScrollIndicator={false}>

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
            <Marker coordinate={patient.coordenadas}>
              <View style={[styles.markerBg, { backgroundColor: patient.alertaActiva ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)' }]}>
                <View style={[styles.markerDot, { backgroundColor: patient.alertaActiva ? activeColors.emergency : activeColors.primary }]} />
              </View>
            </Marker>
            <Circle
              center={patient.coordenadas}
              radius={80}
              strokeColor={patient.alertaActiva ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}
              fillColor={patient.alertaActiva ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}
            />
          </MapView>

          <View style={[styles.mapLabelTag, { backgroundColor: activeColors.surface }]}>
            <Feather name="map-pin" size={12} color={activeColors.heart} style={{ marginRight: 4 }} />
            <Text style={[styles.mapLabelTagText, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              {patient.alertaActiva ? 'Fuera de zona segura habitual' : 'Dentro de zona segura'}
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

        {/* Gráfico de Pulso Cardíaco Interactiva - Renderizado directo en SVG */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="heart" size={15} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Pulso cardíaco — últimos 7 días
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

        {/* Gráfico de Actividad Física - Simulado con hermosos componentes de Views responsivos */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={15} color={activeColors.activity} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Actividad — tiempo activo vs sedentario (horas)
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

        {/* Métricas Clínicas de Registro Manual */}
        <View style={styles.statsContainer}>
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
                {patient.glucosa}
              </Text>
              <Text style={[styles.statBoxSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
                mg/dL · Manual
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ===============================================================================
// 5. SUB-PANTALLA: CONFIGURACIÓN CUIDADOR (AJUSTES)
// ===============================================================================
interface CaregiverConfigProps {
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
}

function CaregiverConfiguracion({
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
}: CaregiverConfigProps) {

  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['👩‍⚕️', '👨‍⚕️', '👩', '👨', '👤', '❤️'];

  const handleSaveProfile = () => {
    if (!name || !email) {
      Alert.alert('Datos Incompletos', 'El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (pass && pass !== confirmPass) {
      Alert.alert('Seguridad', 'Las contraseñas ingresadas no coinciden.');
      return;
    }
    Alert.alert(
      'Configuración Guardada',
      'Tus cambios de perfil y accesibilidad se han guardado con éxito.',
      [{ text: 'Aceptar' }]
    );
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
}) as any;
