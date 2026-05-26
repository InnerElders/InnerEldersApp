import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

// ─── Paleta de Colores Centralizada ───────────────────────────────────────────
const COLORS = {
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

export default function SeniorApp() {
  const [tab, setTab] = useState<'inicio' | 'salud' | 'registro' | 'dispositivo'>('inicio');

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Encabezado Principal */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.appTitle}>Innercore</Text>
          <Text style={styles.roleTag}>Adulto Mayor</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Contenido Principal con Tab Switcher */}
      <View style={styles.content}>
        {tab === 'inicio' && <SeniorInicio setTab={setTab} />}
        {tab === 'salud' && <SeniorSalud setTab={setTab} />}
        {tab === 'registro' && <SeniorRegistro setTab={setTab} />}
        {tab === 'dispositivo' && <SeniorDispositivo />}
      </View>

      {/* Navbar Inferior Típico */}
      <View style={styles.navbar}>
        <NavButton
          id="inicio"
          icon="home"
          label="Inicio"
          isActive={tab === 'inicio'}
          color={COLORS.primary}
          onPress={() => setTab('inicio')}
        />
        <NavButton
          id="salud"
          icon="heart"
          label="Salud"
          isActive={tab === 'salud'}
          color={COLORS.heart}
          onPress={() => setTab('salud')}
        />
        <NavButton
          id="registro"
          icon="edit-3"
          label="Registro"
          isActive={tab === 'registro'}
          color={COLORS.activity}
          onPress={() => setTab('registro')}
        />
        <NavButton
          id="dispositivo"
          icon="watch"
          label="Dispositivo"
          isActive={tab === 'dispositivo'}
          color={COLORS.oxygen}
          onPress={() => setTab('dispositivo')}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-componente: Botón de Navbar ───────────────────────────────────────────
interface NavButtonProps {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isActive: boolean;
  color: string;
  onPress: () => void;
}

function NavButton({ icon, label, isActive, color, onPress }: NavButtonProps) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.navIconContainer, isActive && { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={22} color={isActive ? color : COLORS.textMuted} />
      </View>
      <Text style={[styles.navText, isActive && { color, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ===============================================================================
// 1. SUB-PANTALLA: INICIO
// ===============================================================================
function SeniorInicio({ setTab }: { setTab: (t: 'inicio' | 'salud' | 'registro' | 'dispositivo') => void }) {
  const [sosActive, setSosActive] = useState(false);
  const [showsLocation, setShowsLocation] = useState(false);

  // Coordenadas fijas por defecto (Santiago, Chile como demo)
  const [mapRegion, setMapRegion] = useState({
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
    // TODO: CONEXIÓN BACKEND - Enviar señal SOS y lat/long al backend en tiempo real
    setSosActive(!sosActive);
    Alert.alert(
      sosActive ? 'Alerta SOS Cancelada' : 'Alerta SOS Enviada',
      sosActive
        ? 'Se ha notificado a tus cuidadores que te encuentras a salvo.'
        : 'Se ha enviado una alerta de pánico inmediata a todos tus cuidadores registrados con tu ubicación actual.',
      [{ text: 'Entendido' }]
    );
  };

  const handleContactCaregiver = () => {
    // TODO: CONEXIÓN BACKEND - Obtener el número de teléfono del cuidador del perfil del usuario
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
    // Activa la geolocalización nativa en tiempo real en react-native-maps sin requerir dependencias adicionales
    setShowsLocation(true);
    Alert.alert(
      'Permiso de Ubicación',
      'Se ha activado el acceso al GPS del teléfono. Ahora el mapa mostrará y seguirá tu ubicación real en tiempo real.',
      [{ text: 'Excelente' }]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>

      {/* Contenedor del Mapa con Geolocalización Real Opcional */}
      <View style={styles.mapContainer}>
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
          {/* Si la ubicación real no está activa, mostramos el pin simulado con radar */}
          {!showsLocation && (
            <Marker coordinate={{ latitude: -33.4489, longitude: -70.6693 }}>
              <View style={styles.radarCenter}>
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

        {/* Toggle para solicitar permisos y mostrar ubicación en tiempo real */}
        {showsLocation ? (
          <View style={styles.locationTag}>
            <Feather name="map-pin" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>Ubicación GPS Real Activa</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationTag} onPress={handleLocationPermission} activeOpacity={0.8}>
            <Feather name="map-pin" size={14} color={COLORS.heart} style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>📍 Activar Ubicación Real</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Perfil del Usuario (Esperando datos) */}
      <View style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>👵</Text>
          </View>
          <View style={styles.userInfo}>
            {/* TODO: CONEXIÓN BACKEND - Mostrar el nombre del Adulto Mayor desde la BD */}
            <Text style={styles.userName}>Hola, ...</Text>
            <Text style={styles.userUpdate}>Esperando datos del backend...</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7} disabled>
          <Feather name="bell" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Estado del Dispositivo (Desconectado y esperando) */}
      <View style={styles.deviceStatusCard}>
        <Text style={styles.sectionTitle}>ESTADO DEL DISPOSITIVO</Text>
        <View style={styles.deviceTagsRow}>
          <View style={[styles.statusTag, { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' }]}>
            <View style={[styles.onlineDot, { backgroundColor: '#94a3b8' }]} />
            <Text style={[styles.deviceTagText, { color: COLORS.textSecondary }]}>Desconectado</Text>
          </View>
          <View style={[styles.statusTag, { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' }]}>
            <Feather name="battery" size={16} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text style={[styles.deviceTagText, { color: COLORS.textSecondary }]}>--</Text>
          </View>
          <TouchableOpacity style={styles.updateBtn} activeOpacity={0.7}>
            <Text style={styles.updateBtnText}>Conectar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.wearableInfoRow}>
          <Feather name="watch" size={14} color={COLORS.textMuted} />
          <Text style={[styles.wearableText, { color: COLORS.textSecondary }]}>
            Ningún smartwatch vinculado (Esperando backend)
          </Text>
        </View>
      </View>

      {/* Tarjetas de Métricas de Salud (Vacías esperando sensores) */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>SALUD — ESPERANDO SENSORES</Text>
        <View style={styles.metricsGrid}>
          {/* Pulso */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: COLORS.heartLight }]}>
              <Feather name="heart" size={22} color={COLORS.heart} />
            </View>
            {/* TODO: CONEXIÓN BACKEND - Suscribirse a flujo de frecuencia cardíaca */}
            <Text style={styles.metricValue}>...</Text>
            <Text style={styles.metricUnit}>lpm</Text>
            <Text style={styles.metricLabel}>Pulso</Text>
          </View>

          {/* Actividad */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: COLORS.activityLight }]}>
              <Feather name="activity" size={22} color={COLORS.activity} />
            </View>
            {/* TODO: CONEXIÓN BACKEND - Recibir estado de acelerómetro/giroscopio */}
            <Text style={styles.metricValueText}>...</Text>
            <Text style={styles.metricUnit}></Text>
            <Text style={styles.metricLabel}>Actividad</Text>
          </View>

          {/* Oxígeno */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBg, { backgroundColor: COLORS.oxygenLight }]}>
              <Feather name="wind" size={22} color={COLORS.oxygen} />
            </View>
            {/* TODO: CONEXIÓN BACKEND - Recibir valores de SpO2 del wearable */}
            <Text style={styles.metricValue}>...</Text>
            <Text style={styles.metricUnit}>SpO2</Text>
            <Text style={styles.metricLabel}>Oxígeno</Text>
          </View>
        </View>
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>ACCIONES CRÍTICAS DE AYUDA</Text>
        <View style={styles.emergencyGrid}>

          {/* Llamada de Emergencia */}
          <TouchableOpacity
            style={[styles.emergencyActionCard, { borderColor: COLORS.emergency }]}
            onPress={handleEmergencyCall}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.emergencyBg }]}>
              <Feather name="phone-call" size={26} color={COLORS.emergency} />
            </View>
            <Text style={styles.actionCardTitle}>Llamada{'\n'}Emergencia</Text>
            <Text style={styles.actionCardSub}>Marca directa 131</Text>
          </TouchableOpacity>

          {/* Alerta SOS */}
          <TouchableOpacity
            style={[
              styles.emergencyActionCard,
              { borderColor: COLORS.sos },
              sosActive && { backgroundColor: '#fff7ed' }
            ]}
            onPress={handleSosPress}
            activeOpacity={0.8}
          >
            <View style={[
              styles.actionIconCircle,
              { backgroundColor: COLORS.sosBg },
              sosActive && { backgroundColor: '#ffedd5' }
            ]}>
              <Feather
                name="alert-triangle"
                size={26}
                color={sosActive ? '#c2410c' : COLORS.sos}
              />
            </View>
            <Text style={[styles.actionCardTitle, sosActive && { color: '#c2410c' }]}>
              {sosActive ? 'SOS ACTIVO' : 'Alerta SOS'}
            </Text>
            <Text style={styles.actionCardSub}>Aviso a cuidadores</Text>
          </TouchableOpacity>

          {/* Contactar Cuidador */}
          <TouchableOpacity
            style={[styles.emergencyActionCard, { borderColor: COLORS.caregiver }]}
            onPress={handleContactCaregiver}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.caregiverBg }]}>
              <Feather name="users" size={26} color={COLORS.caregiver} />
            </View>
            <Text style={styles.actionCardTitle}>Contactar{'\n'}Cuidador</Text>
            <Text style={styles.actionCardSub}>Llamar ayuda</Text>
          </TouchableOpacity>

        </View>
      </View>
    </ScrollView>
  );
}

// ===============================================================================
// 2. SUB-PANTALLA: SALUD
// ===============================================================================
function SeniorSalud({ setTab }: { setTab: (t: 'inicio' | 'salud' | 'registro' | 'dispositivo') => void }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Mi Salud</Text>

      {/* Gráfico de Línea - Esperando Backend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>Pulso Promedio Semanal (lpm)</Text>

        <View style={styles.lineChartSimulated}>
          {/* Línea horizontal central */}
          <View style={styles.chartGridLine} />

          <View style={styles.chartBarsRow}>
            {/* Los puntos de gráfico quedan planos en cero esperando el historial del backend */}
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
            <View style={styles.chartLinePointContainer}>
              <View style={[styles.chartDot, { bottom: 10, backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.chartPointVal}>...</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartDaysRow}>
          <Text style={styles.chartDayText}>Lun</Text>
          <Text style={styles.chartDayText}>Mar</Text>
          <Text style={styles.chartDayText}>Mié</Text>
          <Text style={styles.chartDayText}>Jue</Text>
          <Text style={styles.chartDayText}>Vie</Text>
          <Text style={styles.chartDayText}>Sáb</Text>
          <Text style={styles.chartDayText}>Hoy</Text>
        </View>
      </View>

      {/* Gráfico de Barras - STAND BY */}
      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>Actividad física — tiempo activo vs sedentario</Text>

        <View style={styles.standbyCard}>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.standbyTitle}>Gráficos en Stand-by</Text>
          <Text style={styles.standbyDesc}>A la espera de confirmación de librería de gráficos (Carlos).</Text>
        </View>
      </View>

      {/* Grilla de Métricas Detalladas (Esperando backend) */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>

          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>PRESIÓN ARTERIAL</Text>
            {/* TODO: CONEXIÓN BACKEND - Consultar último registro guardado en la tabla de mediciones */}
            <Text style={styles.gridValue}>... / ...</Text>
            <Text style={styles.gridSub}>mmHg · Manual</Text>
            <Text style={[styles.gridStatusOk, { color: COLORS.textSecondary }]}>Esperando datos...</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>GLUCOSA</Text>
            {/* TODO: CONEXIÓN BACKEND - Consultar glucosa */}
            <Text style={styles.gridValue}>...</Text>
            <Text style={styles.gridSub}>mg/dL · Manual</Text>
            <Text style={[styles.gridStatusOk, { color: COLORS.textSecondary }]}>Esperando datos...</Text>
          </View>

        </View>

        <View style={styles.gridRow}>

          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>OXÍGENO</Text>
            {/* TODO: CONEXIÓN BACKEND - Consultar oxígeno */}
            <Text style={styles.gridValue}>...</Text>
            <Text style={styles.gridSub}>SpO2 · Wearable</Text>
            <Text style={[styles.gridStatusOk, { color: COLORS.textSecondary }]}>Esperando datos...</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>UBICACIÓN</Text>
            {/* TODO: CONEXIÓN BACKEND - Consultar estado de geocercas */}
            <Text style={styles.gridValue}>...</Text>
            <Text style={styles.gridSub}>GPS Activo</Text>
            <Text style={[styles.gridStatusOk, { color: COLORS.textSecondary }]}>Esperando datos...</Text>
          </View>

        </View>
      </View>

      {/* Botón para navegar a Registro */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setTab('registro')}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={20} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={styles.actionButtonText}>Ingresar nuevos datos</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ===============================================================================
// 3. SUB-PANTALLA: REGISTRO DE DATOS (Vacío y limpio)
// ===============================================================================
function SeniorRegistro({ setTab }: { setTab: (t: 'inicio' | 'salud' | 'registro' | 'dispositivo') => void }) {
  // Inicializados limpios para que el usuario o el backend pongan sus datos
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
    // TODO: CONEXIÓN BACKEND - Realizar petición POST para enviar datos clínicos al backend
    Alert.alert(
      'Registro Guardado',
      `Tus mediciones se han registrado con éxito localmente (Pendiente Backend):\n\n· Presión: ${systolic}/${diastolic} mmHg\n· Glucosa: ${glucose} mg/dL\n· Temperatura: ${temp} °C`,
      [{ text: 'Excelente', onPress: () => setTab('salud') }]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Ingresar Datos</Text>

      <View style={styles.infoBanner}>
        <Feather name="info" size={18} color="#0284c7" style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={styles.infoBannerText}>
          Ingresa tus valores medidos con tus dispositivos médicos personales (tensiómetro, glucómetro, termómetro).
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Presión Sistólica */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="heart" size={16} color={COLORS.heart} style={{ marginRight: 6 }} />
            <Text style={styles.formLabel}>Presión arterial sistólica</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={COLORS.textMuted}
              value={systolic}
              onChangeText={setSystolic}
            />
            <Text style={styles.unitText}>mmHg</Text>
          </View>
        </View>

        {/* Presión Diastólica */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="heart" size={16} color={COLORS.heart} style={{ marginRight: 6 }} />
            <Text style={styles.formLabel}>Presión arterial diastólica</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={COLORS.textMuted}
              value={diastolic}
              onChangeText={setDiastolic}
            />
            <Text style={styles.unitText}>mmHg</Text>
          </View>
        </View>

        {/* Glucosa */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="droplet" size={16} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.formLabel}>Glucosa en sangre</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={COLORS.textMuted}
              value={glucose}
              onChangeText={setGlucose}
            />
            <Text style={styles.unitText}>mg/dL</Text>
          </View>
        </View>

        {/* Temperatura */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="thermometer" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
            <Text style={styles.formLabel}>Temperatura corporal</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              placeholder="..."
              placeholderTextColor={COLORS.textMuted}
              value={temp}
              onChangeText={setTemp}
            />
            <Text style={styles.unitText}>°C</Text>
          </View>
        </View>

        {/* Notas y Síntomas */}
        <View style={styles.formRow}>
          <View style={styles.formLabelRow}>
            <Feather name="file-text" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.formLabel}>Notas / Síntomas adicionales</Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Escribe cómo te sientes o cualquier síntoma aquí..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveButtonText}>Guardar Registro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ===============================================================================
// 4. SUB-PANTALLA: DISPOSITIVO BLE
// ===============================================================================
function SeniorDispositivo() {
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
      <Text style={styles.pageTitle}>Dispositivo BLE</Text>

      {/* Animación/Estado de Escaneo */}
      <View style={styles.bleScannerCard}>
        <View style={styles.bleRadarCircle}>
          <Feather name="radio" size={32} color="#ffffff" />
        </View>
        {scanning ? (
          <View>
            <ActivityIndicator size="small" color={COLORS.primaryDark} style={{ marginBottom: 4 }} />
            <Text style={styles.bleScanTitle}>Buscando dispositivos...</Text>
          </View>
        ) : (
          <Text style={styles.bleScanTitle}>Buscador de Wearables Activo</Text>
        )}
        <Text style={styles.bleScanSub}>Mantén encendido el Bluetooth de tu teléfono</Text>
      </View>

      {/* Dispositivo Vinculado (Vacío esperando backend) */}
      <View style={styles.pairedContainer}>
        <Text style={styles.bleSectionTitle}>DISPOSITIVO VINCULADO</Text>
        <View style={styles.pairedCard}>
          <View style={styles.pairedRow}>
            <View style={styles.watchIconContainer}>
              <Feather name="watch" size={20} color={COLORS.textMuted} />
            </View>
            <View>
              {/* TODO: CONEXIÓN BACKEND - Leer wearable actualmente registrado y su porcentaje de batería */}
              <Text style={styles.pairedName}>Ningún dispositivo vinculado</Text>
              <Text style={styles.pairedStatus}>Desconectado · Esperando datos...</Text>
            </View>
          </View>
          <View style={[styles.onlineIndicator, { backgroundColor: '#94a3b8' }]} />
        </View>
      </View>

      {/* Dispositivos Encontrados */}
      <View style={styles.foundContainer}>
        <View style={styles.foundHeader}>
          <Text style={styles.bleSectionTitle}>DISPOSITIVOS ENCONTRADOS</Text>
          <TouchableOpacity onPress={handleScan} disabled={scanning} activeOpacity={0.7}>
            <Text style={[styles.scanBtnText, scanning && { opacity: 0.5 }]}>
              {scanning ? 'Escaneando...' : 'Escanear'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.devicesList}>
          <DeviceCard name="Mi Band 6 (Simulado)" desc="Señal fuerte · BLE GATT 0x180D" />
          <DeviceCard name="Apple Watch SE (Simulado)" desc="Señal media · BLE GATT 0x180D" />
        </View>
      </View>
    </ScrollView>
  );
}

// Tarjeta de Dispositivo BLE para la lista
function DeviceCard({ name, desc }: { name: string; desc: string }) {
  const [paired, setPaired] = useState(false);

  const handlePair = () => {
    // TODO: CONEXIÓN BACKEND - Registrar el UUID/GATT del wearable en el perfil del usuario backend
    setPaired(true);
    Alert.alert('Dispositivo Vinculado', `Te has conectado correctamente a: ${name}`, [{ text: 'Entendido' }]);
  };

  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceCardLeft}>
        <View style={styles.deviceIconBg}>
          <Feather name="watch" size={18} color={COLORS.oxygen} />
        </View>
        <View>
          <Text style={styles.deviceName}>{name}</Text>
          <Text style={styles.deviceDesc}>{desc}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.pairButton, paired && { backgroundColor: '#e2e8f0' }]}
        onPress={handlePair}
        disabled={paired}
        activeOpacity={0.7}
      >
        <Text style={[styles.pairButtonText, paired && { color: COLORS.textMuted }]}>
          {paired ? 'Vinculado' : 'Vincular'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Estilos Generales ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primaryDark,
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
    paddingBottom: 100, // Espacio para el Navbar flotante
  },

  // Navbar inferior típico
  navbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconContainer: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },

  // 1. INICIO STYLES
  mapContainer: {
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
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
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
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
    backgroundColor: COLORS.surface,
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userUpdate: {
    fontSize: 11,
    color: COLORS.textSecondary,
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
  bellBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  deviceStatusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
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
    backgroundColor: '#e6f4f1',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
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
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  deviceTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  updateBtn: {
    marginLeft: 'auto',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  updateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  wearableInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  wearableText: {
    fontSize: 12,
    color: COLORS.primaryDark,
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
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
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
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  metricUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: -1,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
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
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 15,
  },
  actionCardSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '500',
  },

  // 2. SALUD STYLES
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  lineChartSimulated: {
    height: 110,
    justifyContent: 'flex-end',
    position: 'relative',
    paddingBottom: 10,
  },
  chartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 50,
    height: 1,
    backgroundColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chartLinePointContainer: {
    alignItems: 'center',
    width: 32,
    height: 80,
    justifyContent: 'flex-end',
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  chartPointVal: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  chartDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  chartDayText: {
    fontSize: 11,
    color: COLORS.textMuted,
    width: 32,
    textAlign: 'center',
  },
  standbyCard: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  standbyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  standbyDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 2,
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
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  gridSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  gridStatusOk: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  formInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingRight: 16,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },

  // 4. BLE STYLES
  bleScannerCard: {
    backgroundColor: '#e6f4f1',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bleScanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: 2,
  },
  bleScanSub: {
    fontSize: 11,
    color: COLORS.primaryDark,
    opacity: 0.8,
    textAlign: 'center',
  },
  pairedContainer: {
    marginBottom: 20,
  },
  bleSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  pairedCard: {
    backgroundColor: '#e6f4f1',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairedName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  pairedStatus: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  devicesList: {
    gap: 10,
  },
  deviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deviceDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  pairButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pairButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
