import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
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
import Svg, { Line, Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';

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
interface Paciente {
  id: number;
  nombre: string;
  edad: number;
  avatar: string;
  riesgo: 'Crítico' | 'Seguimiento' | 'Estable';
  lpm: number;
  presion: string;
  glucosa: number;
  oxigeno: number;
  actividadStr: string;
  diagnostico: string;
  antecedentes: string;
  wearableActivo: boolean;
  alertaActiva: boolean;
  alertaTitulo?: string;
  alertaDesc?: string;
  pulsoHistorico: number[];
  actividadSemana: number[]; // horas activas lun-dom
  ultimaActualizacion: string;
}

const INITIAL_PACIENTES: Paciente[] = [
  {
    id: 1,
    nombre: 'Acdiel Bombin',
    edad: 78,
    avatar: '👴',
    riesgo: 'Crítico',
    lpm: 89,
    presion: '128/82',
    glucosa: 118,
    oxigeno: 94,
    actividadStr: '4h inactivo',
    diagnostico: 'HTA · DM2',
    antecedentes: 'Hipertensión Arterial Crónica y Diabetes Tipo 2 en control manual.',
    wearableActivo: true,
    alertaActiva: true,
    alertaTitulo: 'Inactividad Prolongada',
    alertaDesc: 'Posible caída detectada. Dispositivo inmóvil por más de 4 horas.',
    pulsoHistorico: [72, 75, 78, 89, 74, 76, 73],
    actividadSemana: [6, 8, 4, 1.5, 6, 7, 5],
    ultimaActualizacion: 'hace 2 min',
  },
  {
    id: 2,
    nombre: 'Ana Morales',
    edad: 75,
    avatar: '👵',
    riesgo: 'Crítico',
    lpm: 95,
    presion: '140/90',
    glucosa: 130,
    oxigeno: 92,
    actividadStr: 'Zona insegura',
    diagnostico: 'ICC · EPOC',
    antecedentes: 'Insuficiencia Cardíaca Congestiva y EPOC severo con requerimiento de oxígeno.',
    wearableActivo: true,
    alertaActiva: true,
    alertaTitulo: 'Zona Insegura & Pulso Alto',
    alertaDesc: 'Frecuencia cardíaca de 95 lpm fuera de los límites de geocerca programados.',
    pulsoHistorico: [85, 88, 92, 95, 87, 89, 90],
    actividadSemana: [4, 3, 5, 2, 4, 3.5, 3],
    ultimaActualizacion: 'hace 5 min',
  },
  {
    id: 3,
    nombre: 'Rosa Vega',
    avatar: '👵',
    edad: 71,
    riesgo: 'Seguimiento',
    lpm: 68,
    presion: '120/75',
    glucosa: 105,
    oxigeno: 97,
    actividadStr: 'Activa',
    diagnostico: 'Artrosis',
    antecedentes: 'Artrosis severa de cadera. Paciente realiza kinesiología dos veces por semana.',
    wearableActivo: true,
    alertaActiva: false,
    pulsoHistorico: [66, 68, 67, 69, 68, 70, 68],
    actividadSemana: [5, 6, 7, 8, 6.5, 7, 7.5],
    ultimaActualizacion: 'hace 10 min',
  },
  {
    id: 4,
    nombre: 'Pedro Soto',
    avatar: '👴',
    edad: 83,
    riesgo: 'Estable',
    lpm: 74,
    presion: '132/85',
    glucosa: 122,
    oxigeno: 96,
    actividadStr: 'Activo',
    diagnostico: 'Preventivo',
    antecedentes: 'Control preventivo general de geriatría. Buen estado cognitivo y motriz.',
    wearableActivo: false,
    alertaActiva: false,
    pulsoHistorico: [70, 72, 73, 71, 74, 73, 74],
    actividadSemana: [4, 5, 5.5, 4.5, 5, 5, 4.8],
    ultimaActualizacion: 'hace 12 min',
  },
];

export default function DoctorApp() {
  const [tab, setTab] = useState<'inicio' | 'pacientes' | 'reportes' | 'configuracion'>('inicio');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Datos locales mutables para pacientes (para simular adición)
  const [pacientes, setPacientes] = useState<Paciente[]>(INITIAL_PACIENTES);

  // Estados de Perfil Médico
  const [docName, setDocName] = useState('Andrés López');
  const [docEmail, setDocEmail] = useState('andres.lopez@innercore.cl');
  const [docAvatar, setDocAvatar] = useState('🩺');

  // Estados de Accesibilidad
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0);
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Modal Agregar Paciente
  const [addModalOpen, setAddModalOpen] = useState(false);

  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

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

  // Agregar paciente simulado
  const handleSimulateAddPatient = (rut: string) => {
    if (!rut.trim()) {
      Alert.alert('Error', 'Por favor ingresa un RUT válido.');
      return;
    }

    // Crear un paciente estático simulado
    const newPatient: Paciente = {
      id: pacientes.length + 1,
      nombre: 'Paciente Asignado ' + (pacientes.length + 1),
      edad: 72,
      avatar: Math.random() > 0.5 ? '👴' : '👵',
      riesgo: 'Estable',
      lpm: 72,
      presion: '122/80',
      glucosa: 110,
      oxigeno: 98,
      actividadStr: 'Activo',
      diagnostico: 'Preventivo',
      antecedentes: 'Paciente vinculado con éxito usando el RUT ' + rut,
      wearableActivo: true,
      alertaActiva: false,
      pulsoHistorico: [72, 71, 73, 72, 74, 72, 70],
      actividadSemana: [4, 5, 4.5, 6, 5, 5.5, 6],
      ultimaActualizacion: 'Ahora mismo',
    };

    setPacientes([...pacientes, newPatient]);
    setAddModalOpen(false);

    Alert.alert(
      'Solicitud Enviada',
      `Se ha enviado la solicitud de vinculación para el RUT ${rut}. El paciente ha sido añadido temporalmente en estado Estable.`
    );
  };

  if (detailOpen && selectedPatientId !== null) {
    const p = pacientes.find((x) => x.id === selectedPatientId) || pacientes[0];
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
      <View style={[styles.topLogoutHeader, tab === 'inicio' && { borderBottomWidth: 0, backgroundColor: activeColors.headerBg }]}>
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
          />
        )}
        {tab === 'configuracion' && (
          <DoctorConfiguracion
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
          />
        )}
      </View>

      {/* Barra de Navegación Inferior Estilo Premium Flotante */}
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
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
            {patient.lpm} lpm ·
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
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
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
  let riskColor = activeColors.stable;
  let riskBg = activeColors.stableBg;
  if (patient.riesgo === 'Crítico') {
    riskColor = activeColors.critical;
    riskBg = activeColors.criticalBg;
  } else if (patient.riesgo === 'Seguimiento') {
    riskColor = activeColors.warning;
    riskBg = activeColors.warningBg;
  }

  // Cálculos dinámicos para los gráficos de curvas SVG (Pulsos de 7 días)
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = Math.max(...patient.pulsoHistorico, 100);
  const minVal = Math.min(...patient.pulsoHistorico, 50);
  const valRange = maxVal - minVal;

  const points = patient.pulsoHistorico.map((val, idx) => {
    const x = (idx / (patient.pulsoHistorico.length - 1)) * svgWidth;
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

      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollPadding} showsVerticalScrollIndicator={false}>

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
            <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border, flex: 0.5 }]}>
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
          </View>
        </View>

        {/* Gráfico SVG de Pulso */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="heart" size={14} color={activeColors.heart} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Evolución del Pulso — Últimos 7 días
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

        {/* Botones de acción en expediente */}
        <View style={styles.detailActionsRow}>
          <TouchableOpacity
            style={[styles.detailActBtnPrimary, { backgroundColor: activeColors.primary }]}
            onPress={() => Alert.alert('Historial Completo', 'Abriendo el expediente médico histórico del paciente...')}
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
}

function DoctorReportes({ pacientesCount, fontSizeMultiplier, activeColors }: DoctorReportesProps) {
  // Gráfico semanal de pulso promedio poblacional (7 días)
  const pulseAvg = [74, 76, 73, 79, 81, 75, 77];
  const svgWidth = width - 80;
  const svgHeight = 70;
  const maxVal = 90;
  const minVal = 60;
  const valRange = maxVal - minVal;

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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <View style={styles.reportsHeaderRow}>
        <Text style={[styles.pageTitleDir, { color: activeColors.textPrimary, fontSize: getFontSize(24, fontSizeMultiplier) }]}>
          Reportes Clínicos
        </Text>
        <View style={styles.badgeItem}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.primary }}>Últimos 7 días</Text>
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
              12
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.critical, marginTop: 4 }}>
              ↑ 15% vs sem. anterior
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statBoxLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              ADHERENCIA DISP.
            </Text>
            <Text style={[styles.statBoxValue, { color: activeColors.textPrimary, fontSize: getFontSize(28, fontSizeMultiplier) }]}>
              85%
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: activeColors.stable, marginTop: 4 }}>
              Uso de wearable activo
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
            <View style={[styles.stackedBarSegment, { flex: 2, backgroundColor: activeColors.critical }]}>
              <Text style={styles.stackedBarText}>50%</Text>
            </View>
            <View style={[styles.stackedBarSegment, { flex: 1, backgroundColor: activeColors.warning }]}>
              <Text style={styles.stackedBarText}>25%</Text>
            </View>
            <View style={[styles.stackedBarSegment, { flex: 1, backgroundColor: activeColors.stable }]}>
              <Text style={styles.stackedBarText}>25%</Text>
            </View>
          </View>

          {/* Glosa del Gráfico */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: activeColors.critical }]} />
              <Text style={[styles.legendText, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>Críticos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: activeColors.warning }]} />
              <Text style={[styles.legendText, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>Seguimiento</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: activeColors.stable }]} />
              <Text style={[styles.legendText, { color: activeColors.textSecondary, fontSize: getFontSize(9, fontSizeMultiplier) }]}>Estable</Text>
            </View>
          </View>
        </View>

        {/* Gráfico Evolución del Pulso Promedio */}
        <View style={[styles.detailChartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border, marginTop: 16 }]}>
          <View style={styles.chartTitleRow}>
            <Feather name="activity" size={14} color={activeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.chartCardTitle, { color: activeColors.textPrimary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              FREC. CARDÍACA PROMEDIO (CRÍTICOS)
            </Text>
          </View>

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
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'].map((day) => (
              <Text key={day} style={[styles.graphDayText, { color: activeColors.textSecondary, fontSize: getFontSize(8, fontSizeMultiplier) }]}>
                {day}
              </Text>
            ))}
          </View>
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
}

function DoctorConfiguracion({
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
}: DoctorConfiguracionProps) {
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['🩺', '👩‍⚕️', '👨‍⚕️', '🔬', '🏥', '⚕️'];

  const handleSaveProfile = () => {
    if (pass && pass.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pass && pass !== confirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    Alert.alert('Éxito', 'Configuración profesional actualizada correctamente.');
    setPass('');
    setConfirmPass('');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              placeholder="Ej: 12345678-9"
              placeholderTextColor={activeColors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={rut}
              onChangeText={setRut}
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
});
