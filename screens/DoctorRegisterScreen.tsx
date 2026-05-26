import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
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
interface FormState {
    nombres: string;
    apellidos: string;
    rut: string;
    password: string;
}

// ─── Paleta de colores consistente con la aplicación ─────────────────────────
const COLORS = {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceAlt: '#f2f9f9',
    primary: '#0d9488', // teal-600
    primaryDark: '#0f766e', // teal-700
    primaryShadow: '#99f6e4',
    textPrimary: '#1e293b', // slate-800
    textSecondary: '#64748b', // slate-500
    textMuted: '#94a3b8', // slate-400
    border: '#f1f5f9', // slate-100
    borderFocus: '#0d9488',
    sectionBorder: '#f8fafc',
    headerShadow: '#f1f5f9',
    error: '#ef4444',
} as const;

// ─── Pantalla de Registro de Médicos ──────────────────────────────────────────
export default function DoctorRegisterScreen() {
    const [form, setForm] = useState<FormState>({
        nombres: '',
        apellidos: '',
        rut: '',
        password: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const updateField = (field: keyof FormState, value: string): void => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Limpiar el error cuando el usuario empieza a escribir
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormState, string>> = {};

        if (!form.nombres.trim()) {
            newErrors.nombres = 'El nombre es requerido';
        }
        if (!form.apellidos.trim()) {
            newErrors.apellidos = 'El apellido es requerido';
        }

        // Validación de RUT (máx 12 caracteres, formato X.XXX.XXX-X o XX.XXX.XXX-X)
        if (!form.rut) {
            newErrors.rut = 'El RUT es requerido';
        } else if (form.rut.length > 12 || !/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]$/.test(form.rut)) {
            newErrors.rut = 'RUT inválido. Ej: 12.345.678-9';
        }

        // Validación de contraseña: Al menos 1 mayúscula, 1 símbolo y mín. 6 caracteres
        if (!form.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (!/(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}/.test(form.password)) {
            newErrors.password = 'Mín. 6 caracteres, 1 mayúscula y 1 símbolo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = (): void => {
        if (validate()) {
            console.log('Registrando Médico:', form);
            alert('¡Registro de Médico exitoso!');
            router.replace('/');
        }
    };

    const handleGoBack = (): void => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Cabecera */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Registro de Médico</Text>
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
                    <View style={styles.infoBox}>
                        <Feather name="shield" size={24} color={COLORS.primary} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoTitle}>Acceso Exclusivo</Text>
                            <Text style={styles.infoDescription}>
                                Formulario de registro restringido para personal médico de Innercore.
                            </Text>
                        </View>
                    </View>

                    <SectionLabel text="Datos Personales" />

                    <View style={styles.row}>
                        <View style={styles.inputWrapperHalf}>
                            <Text style={styles.label}>Nombres</Text>
                            <TextInput
                                style={[styles.input, errors.nombres && styles.inputError]}
                                placeholder="Ej: Juan Carlos"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.nombres}
                                onChangeText={v => updateField('nombres', v)}
                                returnKeyType="next"
                            />
                            {errors.nombres && <Text style={styles.errorText}>{errors.nombres}</Text>}
                        </View>
                        <View style={styles.inputWrapperHalf}>
                            <Text style={styles.label}>Apellidos</Text>
                            <TextInput
                                style={[styles.input, errors.apellidos && styles.inputError]}
                                placeholder="Ej: Pérez Rossi"
                                placeholderTextColor={COLORS.textMuted}
                                value={form.apellidos}
                                onChangeText={v => updateField('apellidos', v)}
                                returnKeyType="next"
                            />
                            {errors.apellidos && <Text style={styles.errorText}>{errors.apellidos}</Text>}
                        </View>
                    </View>

                    <SectionLabel text="Datos de Acceso" withTopMargin />

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>RUT</Text>
                        <TextInput
                            style={[styles.input, errors.rut && styles.inputError]}
                            placeholder="Ej: 12.345.678-9"
                            placeholderTextColor={COLORS.textMuted}
                            value={form.rut}
                            onChangeText={v => updateField('rut', v)}
                            autoCapitalize="characters"
                            returnKeyType="next"
                        />
                        {errors.rut && <Text style={styles.errorText}>{errors.rut}</Text>}
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Contraseña</Text>
                        <TextInput
                            style={[styles.input, errors.password && styles.inputError]}
                            placeholder="Crea tu contraseña"
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

    infoBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceAlt,
        padding: 16,
        borderRadius: 18,
        marginBottom: 24,
        alignItems: 'center',
        gap: 14,
    },
    infoIcon: {
        padding: 10,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primaryDark,
        marginBottom: 2,
    },
    infoDescription: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 16,
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
        marginBottom: 16,
        width: '100%',
    },
    inputWrapperHalf: {
        flex: 1,
        marginBottom: 16,
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

    registerButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: COLORS.primaryShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    },
    registerButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
