import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';

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
import { LineChart, BarChart } from 'react-native-gifted-charts';

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

export default function SeniorApp() {
  const [tab, setTab] = useState<'inicio' | 'salud' | 'registro' | 'dispositivo' | 'configuracion'>('inicio');
  
  // ─── Estados de Perfil Editables ──────────────────────────────────────────
  const [name, setName] = useState('Acdiel');
  const [email, setEmail] = useState('acdiel@innercore.cl');
  const [avatar, setAvatar] = useState('👴');
  
  // ─── Estados de Accesibilidad Globales ────────────────────────────────────
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0); // 1.0, 1.2, 1.4
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Obtener colores basados en el modo de daltonismo activo
  const activeColors = colorblindMode ? COLORBLIND_COLORS : DEFAULT_COLORS;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir del perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', onPress: () => router.replace('/') },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={activeColors.background} />

      {/* Encabezado Principal */}
      <View style={[styles.header, { borderBottomColor: activeColors.border, backgroundColor: activeColors.surface }]}>
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
          />
        )}
        {tab === 'salud' && (
          <SeniorSalud 
            setTab={setTab} 
            fontSizeMultiplier={fontSizeMultiplier} 
            activeColors={activeColors} 
          />
        )}
        {tab === 'registro' && (
          <SeniorRegistro 
            setTab={setTab} 
            fontSizeMultiplier={fontSizeMultiplier} 
            activeColors={activeColors} 
          />
        )}
        {tab === 'dispositivo' && (
          <SeniorDispositivo 
            fontSizeMultiplier={fontSizeMultiplier} 
            activeColors={activeColors} 
          />
        )}
        {tab === 'configuracion' && (
          <SeniorConfiguracion
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

      {/* Navbar Inferior Típico Modificado (5 Pestañas Responsivas) */}
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
  setTab: (t: any) => void;
  fontSizeMultiplier: number;
  activeColors: any;
  name?: string;
  avatar?: string;
}

function SeniorInicio({ setTab, fontSizeMultiplier, activeColors, name, avatar }: SeniorTabProps) {
  const [sosActive, setSosActive] = useState(false);
  const [showsLocation, setShowsLocation] = useState(false);

  const [mapRegion] = useState({
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  });

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
    // TODO: CONEXIÓN BACKEND - Enviar alerta de SOS
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

  const handleLocationPermission = () => {
    setShowsLocation(true);
    Alert.alert(
      'Permiso de Ubicación',
      'Se ha activado el acceso al GPS del teléfono. El mapa mostrará tu ubicación real en tiempo real.',
      [{ text: 'Aceptar' }]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      
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
          {!showsLocation && (
            <Marker coordinate={{ latitude: -33.4489, longitude: -70.6693 }}>
              <View style={[styles.radarCenter, { backgroundColor: `${activeColors.primary}40` }]}>
                <View style={styles.radarDot} />
              </View>
            </Marker>
          )}
          {!showsLocation && (
            <Circle
              center={{ latitude: -33.4489, longitude: -70.6693 }}
              radius={80}
              strokeColor="rgba(13, 148, 136, 0.3)"
              fillColor="rgba(13, 148, 136, 0.1)"
            />
          )}
        </MapView>
        
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
              Esperando datos del backend...
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
          <View style={[styles.statusTag, { borderColor: activeColors.border, backgroundColor: activeColors.background }]}>
            <View style={[styles.onlineDot, { backgroundColor: activeColors.textMuted }]} />
            <Text style={[styles.deviceTagText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Desconectado
            </Text>
          </View>
          <View style={[styles.statusTag, { borderColor: activeColors.border, backgroundColor: activeColors.background }]}>
            <Feather name="battery" size={16} color={activeColors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.deviceTagText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              --
            </Text>
          </View>
          <TouchableOpacity style={styles.updateBtn} activeOpacity={0.7}>
            <Text style={[styles.updateBtnText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              Conectar
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.wearableInfoRow}>
          <Feather name="watch" size={14} color={activeColors.textMuted} />
          <Text style={[styles.wearableText, { color: activeColors.textSecondary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
            Ningún smartwatch vinculado (Esperando backend)
          </Text>
        </View>
      </View>

      {/* Tarjetas de Métricas de Salud */}
      <View style={styles.metricsContainer}>
        <Text style={[styles.sectionTitle, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          SALUD — ESPERANDO SENSORES
        </Text>
        <View style={styles.metricsGrid}>
          {/* Pulso */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.heartLight }]}>
              <Feather name="heart" size={22} color={activeColors.heart} />
            </View>
            <Text style={[styles.metricValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>...</Text>
            <Text style={[styles.metricUnit, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>lpm</Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>Pulso</Text>
          </View>
          
          {/* Actividad */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.activityLight }]}>
              <Feather name="activity" size={22} color={activeColors.activity} />
            </View>
            <Text style={[styles.metricValueText, { color: activeColors.textPrimary, fontSize: getFontSize(15, fontSizeMultiplier) }]}>...</Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>Actividad</Text>
          </View>

          {/* Oxígeno */}
          <View style={[styles.metricCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: activeColors.oxygenLight }]}>
              <Feather name="wind" size={22} color={activeColors.oxygen} />
            </View>
            <Text style={[styles.metricValue, { color: activeColors.textPrimary, fontSize: getFontSize(22, fontSizeMultiplier) }]}>...</Text>
            <Text style={[styles.metricUnit, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>SpO2</Text>
            <Text style={[styles.metricLabel, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>Oxígeno</Text>
          </View>
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
function SeniorSalud({ setTab, fontSizeMultiplier, activeColors }: SeniorTabProps) {
  
  // Datos Reales para LineChart (Gifted Charts)
  const lineData = [
    { value: 72, label: 'Lun' },
    { value: 75, label: 'Mar' },
    { value: 70, label: 'Mié' },
    { value: 85, label: 'Jue' },
    { value: 72, label: 'Vie' },
    { value: 74, label: 'Sáb' },
    { value: 72, label: 'Hoy' }
  ];

  // Datos Reales para BarChart (Gifted Charts)
  const barData = [
    { value: 40, label: 'Lun', frontColor: activeColors.primaryLight },
    { value: 55, label: 'Mar', frontColor: activeColors.primaryLight },
    { value: 35, label: 'Mié', frontColor: activeColors.primaryLight },
    { value: 15, label: 'Jue', frontColor: activeColors.emergency }, // Zonas de baja actividad sedentaria
    { value: 50, label: 'Vie', frontColor: activeColors.primaryLight },
    { value: 65, label: 'Sáb', frontColor: activeColors.primaryLight },
    { value: 60, label: 'Hoy', frontColor: activeColors.primary }    // Hoy activo
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Mi Salud
      </Text>

      {/* Gráfico de Línea Real de Pulso (react-native-gifted-charts) */}
      <View style={[styles.chartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.chartLabel, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          Pulso Semanal Promedio (Curva lpm)
        </Text>
        <View style={styles.giftedChartWrapper}>
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
        </View>
      </View>

      {/* Gráfico de Barras de Actividad Física (react-native-gifted-charts) */}
      <View style={[styles.chartCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <Text style={[styles.chartLabel, { color: activeColors.textSecondary, fontSize: getFontSize(13, fontSizeMultiplier) }]}>
          Actividad Física Semanal (Minutos Activos)
        </Text>
        <View style={styles.giftedChartWrapper}>
          <BarChart
            data={barData}
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
              ... / ...
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              mmHg · Manual
            </Text>
            <Text style={[styles.gridStatusOk, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Esperando datos...
            </Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              GLUCOSA
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              ...
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              mg/dL · Manual
            </Text>
            <Text style={[styles.gridStatusOk, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Esperando datos...
            </Text>
          </View>

        </View>

        <View style={styles.gridRow}>
          
          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              OXÍGENO
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              ...
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              SpO2 · Wearable
            </Text>
            <Text style={[styles.gridStatusOk, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Esperando datos...
            </Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.gridLabel, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              UBICACIÓN
            </Text>
            <Text style={[styles.gridValue, { color: activeColors.textPrimary, fontSize: getFontSize(20, fontSizeMultiplier) }]}>
              ...
            </Text>
            <Text style={[styles.gridSub, { color: activeColors.textSecondary, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
              GPS Activo
            </Text>
            <Text style={[styles.gridStatusOk, { color: activeColors.textSecondary, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
              Esperando datos...
            </Text>
          </View>

        </View>
      </View>

      {/* Botón para navegar a Registro */}
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: activeColors.primary, shadowColor: activeColors.primaryShadow }]} 
        onPress={() => setTab('registro')} 
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

// ===============================================================================
// 3. SUB-PANTALLA: REGISTRO DE DATOS
// ===============================================================================
function SeniorRegistro({ setTab, fontSizeMultiplier, activeColors }: SeniorTabProps) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!systolic || !diastolic || !glucose || !temp) {
      Alert.alert('Faltan Datos', 'Por favor ingresa todos tus valores de salud antes de guardar.');
      return;
    }
    // TODO: CONEXIÓN BACKEND - Enviar mediciones clínicas
    Alert.alert(
      'Registro Guardado',
      `Tus mediciones se han registrado con éxito localmente (Pendiente Backend):\n\n· Presión: ${systolic}/${diastolic} mmHg\n· Glucosa: ${glucose} mg/dL\n· Temperatura: ${temp} °C`,
      [{ text: 'Excelente', onPress: () => setTab('salud') }]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
interface SeniorDispositivosProps {
  fontSizeMultiplier: number;
  activeColors: any;
}

function SeniorDispositivo({ fontSizeMultiplier, activeColors }: SeniorDispositivosProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      Alert.alert('Búsqueda Finalizada', 'No se encontraron nuevos dispositivos BLE.', [{ text: 'OK' }]);
    }, 2000);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: activeColors.textPrimary, fontSize: getFontSize(26, fontSizeMultiplier) }]}>
        Dispositivo BLE
      </Text>

      {/* Escáner */}
      <View style={[styles.bleScannerCard, { backgroundColor: activeColors.primaryLight, borderColor: activeColors.border }]}>
        <View style={[styles.bleRadarCircle, { backgroundColor: activeColors.primary, shadowColor: activeColors.primary }]}>
          <Feather name="radio" size={32} color="#ffffff" />
        </View>
        {scanning ? (
          <View>
            <ActivityIndicator size="small" color={activeColors.primaryDark} style={{ marginBottom: 4 }} />
            <Text style={[styles.bleScanTitle, { color: activeColors.primaryDark, fontSize: getFontSize(16, fontSizeMultiplier) }]}>
              Buscando dispositivos...
            </Text>
          </View>
        ) : (
          <Text style={[styles.bleScanTitle, { color: activeColors.primaryDark, fontSize: getFontSize(16, fontSizeMultiplier) }]}>
            Buscador de Wearables Activo
          </Text>
        )}
        <Text style={[styles.bleScanSub, { color: activeColors.primaryDark, fontSize: getFontSize(11, fontSizeMultiplier) }]}>
          Mantén encendido el Bluetooth de tu teléfono
        </Text>
      </View>

      {/* Dispositivo Vinculado */}
      <View style={styles.pairedContainer}>
        <Text style={[styles.bleSectionTitle, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
          DISPOSITIVO VINCULADO
        </Text>
        <View style={[styles.pairedCard, { backgroundColor: activeColors.primaryLight, borderColor: activeColors.border }]}>
          <View style={styles.pairedRow}>
            <View style={[styles.watchIconContainer, { backgroundColor: activeColors.surface }]}>
              <Feather name="watch" size={20} color={activeColors.textMuted} />
            </View>
            <View>
              <Text style={[styles.pairedName, { color: activeColors.primaryDark, fontSize: getFontSize(15, fontSizeMultiplier) }]}>
                Ningún dispositivo vinculado
              </Text>
              <Text style={[styles.pairedStatus, { color: activeColors.primary, fontSize: getFontSize(12, fontSizeMultiplier) }]}>
                Desconectado · Esperando datos...
              </Text>
            </View>
          </View>
          <View style={[styles.onlineIndicator, { backgroundColor: '#94a3b8' }]} />
        </View>
      </View>

      {/* Encontrados */}
      <View style={styles.foundContainer}>
        <View style={styles.foundHeader}>
          <Text style={[styles.bleSectionTitle, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            DISPOSITIVOS ENCONTRADOS
          </Text>
          <TouchableOpacity onPress={handleScan} disabled={scanning} activeOpacity={0.7}>
            <Text style={[styles.scanBtnText, { color: activeColors.primary }, scanning && { opacity: 0.5 }, { fontSize: getFontSize(12, fontSizeMultiplier) }]}>
              {scanning ? 'Escaneando...' : 'Escanear'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.devicesList}>
          <DeviceCard name="Mi Band 6 (Simulado)" desc="Señal fuerte · BLE GATT 0x180D" activeColors={activeColors} fontSizeMultiplier={fontSizeMultiplier} />
          <DeviceCard name="Apple Watch SE (Simulado)" desc="Señal media · BLE GATT 0x180D" activeColors={activeColors} fontSizeMultiplier={fontSizeMultiplier} />
        </View>
      </View>
    </ScrollView>
  );
}

// Tarjeta de Dispositivo BLE
interface DeviceCardProps {
  name: string;
  desc: string;
  activeColors: any;
  fontSizeMultiplier: number;
}

function DeviceCard({ name, desc, activeColors, fontSizeMultiplier }: DeviceCardProps) {
  const [paired, setPaired] = useState(false);

  const handlePair = () => {
    setPaired(true);
    Alert.alert('Dispositivo Vinculado', `Te has conectado correctamente a: ${name}`, [{ text: 'Entendido' }]);
  };

  return (
    <View style={[styles.deviceCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <View style={styles.deviceCardLeft}>
        <View style={styles.deviceIconBg}>
          <Feather name="watch" size={18} color={activeColors.oxygen} />
        </View>
        <View>
          <Text style={[styles.deviceName, { color: activeColors.textPrimary, fontSize: getFontSize(14, fontSizeMultiplier) }]}>
            {name}
          </Text>
          <Text style={[styles.deviceDesc, { color: activeColors.textMuted, fontSize: getFontSize(10, fontSizeMultiplier) }]}>
            {desc}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.pairButton, { backgroundColor: activeColors.primary }, paired && { backgroundColor: activeColors.border }]} 
        onPress={handlePair}
        disabled={paired}
        activeOpacity={0.7}
      >
        <Text style={[styles.pairButtonText, { fontSize: getFontSize(12, fontSizeMultiplier) }, paired && { color: activeColors.textMuted }]}>
          {paired ? 'Vinculado' : 'Vincular'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ===============================================================================
// 5. SUB-PANTALLA: CONFIGURACIÓN Y ACCESIBILIDAD (NUEVA PESTAÑA)
// ===============================================================================
interface SeniorConfiguracionProps {
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

function SeniorConfiguracion({
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
}: SeniorConfiguracionProps) {
  
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const avataresDisponibles = ['👴', '👵', '👨', '👩', '👤', '❤️'];

  const handleSaveProfile = () => {
    if (!name || !email) {
      Alert.alert('Datos Incompletos', 'El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (pass && pass !== confirmPass) {
      Alert.alert('Seguridad', 'Las contraseñas ingresadas no coinciden.');
      return;
    }
    // TODO: CONEXIÓN BACKEND - Actualizar credenciales en la base de datos
    Alert.alert(
      'Configuración Guardada', 
      'Tus cambios de perfil y accesibilidad se han guardado con éxito.', 
      [{ text: 'Aceptar' }]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
    gap: 10,
  },
  metricCard: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
