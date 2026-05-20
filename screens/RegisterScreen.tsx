import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type RegisterRole = 'caregiver' | 'senior';

interface FormState {
    email: string;
    nombres: string;
    apellidos: string;
    diaNac: string;
    mesNac: string;
    anioNac: string;
    region: string;
    comuna: string;
    rut: string;
    password: string;
}

const REGION_COMUNAS: Record<string, string[]> = {
    'Arica y Parinacota': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
    'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica'],
    'Antofagasta': ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Calama', 'Ollagüe', 'San Pedro de Atacama', 'Tocopilla', 'María Elena'],
    'Atacama': ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro', 'Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco'],
    'Coquimbo': ['La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paihuano', 'Vicuña', 'Illapel', 'Canela', 'Los Vilos', 'Salamanca', 'Ovalle', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado'],
    'Valparaíso': ['Valparaíso', 'Casablanca', 'Concón', 'Juan Fernández', 'Puchuncaví', 'Quintero', 'Viña del Mar', 'Isla de Pascua', 'Los Andes', 'Calle Larga', 'Rinconada', 'San Esteban', 'La Ligua', 'Cabildo', 'Papudo', 'Petorca', 'Zapallar', 'Quillota', 'Calera', 'Hijuelas', 'La Cruz', 'Nogales', 'San Antonio', 'Algarrobo', 'Cartagena', 'El Quisco', 'El Tabo', 'Santo Domingo', 'San Felipe', 'Catemu', 'Llaillay', 'Panquehue', 'Putaendo', 'Santa María', 'Quilpué', 'Limache', 'Olmué', 'Villa Alemana'],
    'Metropolitana': ['Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón', 'Santiago', 'Vitacura', 'Puente Alto', 'Pirque', 'San José de Maipo', 'Colina', 'Lampa', 'Tiltil', 'San Bernardo', 'Buin', 'Calera de Tango', 'Paine', 'Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor'],
    'O\'Higgins': ['Rancagua', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Graneros', 'Las Cabras', 'Machalí', 'Malloa', 'Mostazal', 'Olivar', 'Peumo', 'Pichidegua', 'Quinta de Tilcoco', 'Rengo', 'Requínoa', 'San Vicente', 'Pichilemu', 'La Estrella', 'Litueche', 'Marchihue', 'Navidad', 'Paredones', 'San Fernando', 'Chépica', 'Chimbarongo', 'Lolol', 'Nancagua', 'Palmilla', 'Peralillo', 'Placilla', 'Pumanque', 'Santa Cruz'],
    'Maule': ['Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael', 'Cauquenes', 'Chanco', 'Pelluhue', 'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén', 'Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas'],
    'Ñuble': ['Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco', 'Bulnes', 'Chillán Viejo', 'Chillán', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás'],
    'Biobío': ['Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa', 'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Alto Biobío'],
    'La Araucanía': ['Temuco', 'Carahue', 'Cunco', 'Curarrehue', 'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Loncoche', 'Melipeuco', 'Nueva Imperial', 'Padre las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Saavedra', 'Teodoro Schmidt', 'Toltén', 'Vilcún', 'Villarrica', 'Cholchol', 'Angol', 'Collipulli', 'Curacautín', 'Ercilla', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Purén', 'Renaico', 'Traiguén', 'Victoria'],
    'Los Ríos': ['Valdivia', 'Corral', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'La Unión', 'Futrono', 'Lago Ranco', 'Río Bueno'],
    'Los Lagos': ['Puerto Montt', 'Calbuco', 'Cochamó', 'Fresia', 'Frutillar', 'Los Muermos', 'Llanquihue', 'Maullín', 'Puerto Varas', 'Castro', 'Ancud', 'Chonchi', 'Curaco de Vélez', 'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Osorno', 'Puerto Octay', 'Purranque', 'Puyehue', 'Río Negro', 'San Juan de la Costa', 'San Pablo', 'Chaitén', 'Futaleufú', 'Hualaihué', 'Palena'],
    'Aysén': ['Coyhaique', 'Lago Verde', 'Aysén', 'Cisnes', 'Guaitecas', 'Cochrane', 'O\'Higgins', 'Tortel', 'Chile Chico', 'Río Ibáñez'],
    'Magallanes': ['Punta Arenas', 'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Cabo de Hornos', 'Antártica', 'Porvenir', 'Primavera', 'Timaukel', 'Natales', 'Torres del Paine']
};

// ─── Paleta ───────────────────────────────────────────
const COLORS = {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceAlt: '#f2f9f9',
    primary: '#0d9488',
    primaryDark: '#0f766e',
    primaryShadow: '#99f6e4',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#f1f5f9',
    borderFocus: '#0d9488',
    sectionBorder: '#f8fafc',
    headerShadow: '#f1f5f9',
    error: '#ef4444',
} as const;

// ─── Pantalla de Registro ──────────────────────────────────────────────────────
export default function RegisterScreen() {
    const [role, setRole] = useState<RegisterRole>('caregiver');
    const [form, setForm] = useState<FormState>({
        email: '',
        nombres: '',
        apellidos: '',
        diaNac: '',
        mesNac: '',
        anioNac: '',
        region: '',
        comuna: '',
        rut: '',
        password: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState<string[]>([]);
    const [modalTarget, setModalTarget] = useState<'region' | 'comuna' | null>(null);

    const updateField = (field: keyof FormState, value: string): void => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Limpiar el error cuando el usuario empieza a escribir
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
        if (field === 'diaNac' || field === 'mesNac' || field === 'anioNac') {
            setErrors(prev => ({ ...prev, diaNac: undefined }));
        }
    };

    const validate = () => {
        const newErrors: Partial<Record<keyof FormState, string>> = {};

        if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
            newErrors.email = 'Correo inválido';
        }
        if (!form.nombres.trim()) newErrors.nombres = 'Requerido';
        if (!form.apellidos.trim()) newErrors.apellidos = 'Requerido';

        const d = parseInt(form.diaNac, 10);
        const m = parseInt(form.mesNac, 10);
        const y = parseInt(form.anioNac, 10);
        if (!form.diaNac || !form.mesNac || !form.anioNac || isNaN(d) || isNaN(m) || isNaN(y) ||
            d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
            newErrors.diaNac = 'Fecha inválida';
        }

        if (!form.region) newErrors.region = 'Requerido';
        if (!form.comuna) newErrors.comuna = 'Requerido';

        // Validación de RUT (máx 12 caracteres, formato X.XXX.XXX-X o XX.XXX.XXX-X)
        if (!form.rut || form.rut.length > 12 || !/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]$/.test(form.rut)) {
            newErrors.rut = 'RUT inválido. Ej: 12.345.678-9';
        }

        // Validación de contraseña: Al menos 1 mayúscula, 1 símbolo y mín. 6 caracteres
        if (!form.password || !/(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}/.test(form.password)) {
            newErrors.password = 'Mín. 6 caracteres, 1 mayúscula y 1 símbolo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = (): void => {
        if (validate()) {
            console.log('Registrando como:', role, form);
            // router.replace('/(tabs)');
        }
    };

    const handleGoBack = (): void => {
        router.back();
    };

    const openModal = (target: 'region' | 'comuna') => {
        if (target === 'comuna' && !form.region) return;

        setModalTarget(target);
        if (target === 'region') {
            setModalData(Object.keys(REGION_COMUNAS));
        } else if (target === 'comuna') {
            setModalData(REGION_COMUNAS[form.region] || []);
        }
        setModalVisible(true);
    };

    const handleSelect = (item: string) => {
        if (modalTarget === 'region') {
            updateField('region', item);
            updateField('comuna', ''); // Reiniciar comuna al cambiar de región
        } else if (modalTarget === 'comuna') {
            updateField('comuna', item);
        }
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crear Cuenta</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <SectionLabel text="¿Qué perfil usarás?" />
                    <View style={styles.toggleContainer}>
                        <ToggleButton
                            label="Cuidador 👩"
                            active={role === 'caregiver'}
                            onPress={() => setRole('caregiver')}
                        />
                        <ToggleButton
                            label="Adulto Mayor 👴"
                            active={role === 'senior'}
                            onPress={() => setRole('senior')}
                        />
                    </View>

                    <SectionLabel text="Datos Personales" withTopMargin />

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            placeholder="Correo electrónico"
                            placeholderTextColor={COLORS.textMuted}
                            value={form.email}
                            onChangeText={v => updateField('email', v)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.row}>
                        <View style={styles.inputWrapperHalf}>
                            <TextInput
                                style={[styles.input, errors.nombres && styles.inputError]}
                                placeholder="Nombres"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.nombres}
                                onChangeText={v => updateField('nombres', v)}
                                returnKeyType="next"
                            />
                            {errors.nombres && <Text style={styles.errorText}>{errors.nombres}</Text>}
                        </View>
                        <View style={styles.inputWrapperHalf}>
                            <TextInput
                                style={[styles.input, errors.apellidos && styles.inputError]}
                                placeholder="Apellidos"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.apellidos}
                                onChangeText={v => updateField('apellidos', v)}
                                returnKeyType="next"
                            />
                            {errors.apellidos && <Text style={styles.errorText}>{errors.apellidos}</Text>}
                        </View>
                    </View>

                    <Text style={styles.label}>Fecha de Nacimiento</Text>
                    <View style={styles.row}>
                        <View style={[styles.inputWrapperHalf, { flex: 0.3 }]}>
                            <TextInput
                                style={[styles.input, errors.diaNac && styles.inputError]}
                                placeholder="DD"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.diaNac}
                                onChangeText={v => updateField('diaNac', v.replace(/[^0-9]/g, '').slice(0, 2))}
                                keyboardType="numeric"
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[styles.inputWrapperHalf, { flex: 0.3 }]}>
                            <TextInput
                                style={[styles.input, errors.diaNac && styles.inputError]}
                                placeholder="MM"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.mesNac}
                                onChangeText={v => updateField('mesNac', v.replace(/[^0-9]/g, '').slice(0, 2))}
                                keyboardType="numeric"
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[styles.inputWrapperHalf, { flex: 0.4 }]}>
                            <TextInput
                                style={[styles.input, errors.diaNac && styles.inputError]}
                                placeholder="AAAA"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.anioNac}
                                onChangeText={v => updateField('anioNac', v.replace(/[^0-9]/g, '').slice(0, 4))}
                                keyboardType="numeric"
                                returnKeyType="next"
                            />
                        </View>
                    </View>
                    {errors.diaNac && <Text style={[styles.errorText, { marginTop: -8, marginBottom: 12 }]}>{errors.diaNac}</Text>}

                    <View style={styles.inputWrapper}>
                        <TouchableOpacity
                            style={[styles.dropdown, errors.region && styles.inputError]}
                            onPress={() => openModal('region')}
                            activeOpacity={0.7}
                        >
                            <Text style={form.region ? styles.dropdownText : styles.dropdownPlaceholder}>
                                {form.region || 'Seleccionar Región'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                        {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                    </View>

                    <View style={styles.inputWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.dropdown,
                                !form.region && styles.dropdownDisabled,
                                errors.comuna && styles.inputError
                            ]}
                            onPress={() => openModal('comuna')}
                            activeOpacity={0.7}
                            disabled={!form.region}
                        >
                            <Text style={form.comuna ? styles.dropdownText : styles.dropdownPlaceholder}>
                                {form.comuna || 'Seleccionar Comuna'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                        {errors.comuna && <Text style={styles.errorText}>{errors.comuna}</Text>}
                    </View>

                    <SectionLabel text="Datos de Acceso" withTopMargin />

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.input, errors.rut && styles.inputError]}
                            placeholder="RUT (Ej: 12.345.678-9)"
                            placeholderTextColor={COLORS.textMuted}
                            value={form.rut}
                            onChangeText={v => updateField('rut', v)}
                            autoCapitalize="characters"
                            returnKeyType="next"
                        />
                        {errors.rut && <Text style={styles.errorText}>{errors.rut}</Text>}
                    </View>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.input, errors.password && styles.inputError]}
                            placeholder="Crear contraseña"
                            placeholderTextColor={COLORS.textMuted}
                            value={form.password}
                            onChangeText={v => updateField('password', v)}
                            secureTextEntry
                            returnKeyType="done"
                            onSubmitEditing={handleRegister}
                        />
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.registerButtonText}>Completar Registro</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal de selección */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalTarget === 'region' ? 'Seleccionar Región' : 'Seleccionar Comuna'}
                            </Text>
                        </View>
                        <FlatList
                            data={modalData}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
function SectionLabel({ text, withTopMargin }: { text: string; withTopMargin?: boolean }) {
    return (
        <Text style={[styles.sectionLabel, withTopMargin && styles.sectionLabelTop]}>
            {text}
        </Text>
    );
}

function ToggleButton({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.toggleButton, active && styles.toggleButtonActive]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    flex: { flex: 1 },

    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.headerShadow,
        elevation: 2,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: COLORS.surface,
        borderRadius: 50,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
        backgroundColor: COLORS.background,
    },

    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceAlt,
        padding: 6,
        borderRadius: 18,
        marginBottom: 28,
        gap: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 14,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.primary,
        elevation: 4,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: '#ffffff',
    },

    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginBottom: 14,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.sectionBorder,
    },
    sectionLabelTop: {
        marginTop: 24,
    },

    label: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
        marginLeft: 4,
        fontWeight: '500',
    },

    inputWrapper: {
        marginBottom: 12,
        width: '100%',
    },
    inputWrapperHalf: {
        flex: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    inputError: {
        borderColor: COLORS.error,
        borderWidth: 1.5,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 11,
        marginTop: 4,
        marginLeft: 4,
    },

    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownDisabled: {
        backgroundColor: '#e2e8f0',
        opacity: 0.7,
    },
    dropdownText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    dropdownPlaceholder: {
        fontSize: 14,
        color: COLORS.textMuted,
    },

    registerButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        marginTop: 24,
        elevation: 8,
    },
    registerButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '60%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalItem: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalItemText: {
        fontSize: 15,
        color: COLORS.textPrimary,
    },
});
