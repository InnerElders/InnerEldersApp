import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatRut } from '@/utils/rutFormatter';

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
    View,
} from 'react-native';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type RoleId = 'senior' | 'caregiver' | 'doctor';

interface Role {
    id: RoleId;
    iconName: keyof typeof Feather.glyphMap;
    label: string;
}

interface RoleButtonProps {
    role: Role;
    isActive: boolean;
    onPress: (id: RoleId) => void;
}

// ─── Paleta de colores centralizada ───────────────────────────────────────────
const COLORS = {
    background: '#f0f9ff', // sky-50
    surface: '#ffffff',
    primary: '#0d9488', // teal-600
    primaryLight: '#ccfbf1', // teal-100
    primaryDark: '#0f766e', // teal-700
    primaryShadow: '#99f6e4',
    textPrimary: '#1e293b', // slate-800
    textSecondary: '#64748b', // slate-500
    textMuted: '#94a3b8', // slate-400
    border: '#e2e8f0', // slate-200
    roleSelected: '#f0fdfa', // teal-50
    roleSelectedBorder: '#0d9488',
} as const;

// ─── Roles disponibles ─────────────────────────────────────────────────────────
const ROLES: Role[] = [
    { id: 'senior', iconName: 'user', label: 'Adulto\nMayor' },
    { id: 'caregiver', iconName: 'users', label: 'Cuidador' },
    { id: 'doctor', iconName: 'activity', label: 'Médico' },
];

// ─── Sub-componente: Botón de Rol ──────────────────────────────────────────────
function RoleButton({ role, isActive, onPress }: RoleButtonProps) {
    const { id, iconName, label } = role;
    return (
        <TouchableOpacity
            style={[styles.roleButton, isActive && styles.roleButtonActive]}
            onPress={() => onPress(id)}
            activeOpacity={0.75}
        >
            <Feather
                name={iconName}
                size={24}
                color={isActive ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Pantalla de Login ─────────────────────────────────────────────────────────
export default function LoginScreen() {
    const [selectedRole, setSelectedRole] = useState<RoleId>('caregiver');
    const [rut, setRut] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [logoPressCount, setLogoPressCount] = useState<number>(0);
    const { login } = useAuth();

    const handleLogin = async (): Promise<void> => {
      if (!rut.trim() || !password) {
        alert('Por favor, ingresa tu RUT y contraseña');
        return;
      }

      const res = await login(rut.trim(), password);

      if (res.success) {
        console.log('Sesión iniciada con éxito. Rol:', res.role);
        if (res.role === 'adulto_mayor') {
            router.replace('/senior' as any);
        } else if (res.role === 'cuidador') {
            router.replace('/caregiver' as any);
        } else if (res.role === 'medico') {
            router.replace('/doctor' as any);
        }
      } else {
        alert(res.error || 'Credenciales incorrectas');
      }
    };

    const handleRegister = (): void => {
        router.push('/register');
    };

    const handleLogoPress = (): void => {
        const nextCount = logoPressCount + 1;
        if (nextCount >= 5) {
            setLogoPressCount(0);
            router.push('/doctor-register');
        } else {
            setLogoPressCount(nextCount);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── Logo ── */}
                    <TouchableOpacity
                        onPress={handleLogoPress}
                        activeOpacity={0.8}
                    >
                        <View style={styles.logoCircle}>
                            <Feather name="activity" size={52} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>

                    {/* ── Título ── */}
                    <Text style={styles.title}>Innercore</Text>
                    <Text style={styles.subtitle}>Holter de Movilidad</Text>

                    {/* ── Selector de perfil ── */}
                    <Text style={styles.roleLabel}>SELECCIONA TU PERFIL</Text>

                    <View style={styles.rolesRow}>
                        {ROLES.map((role) => (
                            <RoleButton
                                key={role.id}
                                role={role}
                                isActive={selectedRole === role.id}
                                onPress={setSelectedRole}
                            />
                        ))}
                    </View>

                    {/* ── Inputs ── */}
                    <View style={styles.inputsContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="RUT (Ej: 12345678-9)"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            value={rut}
                            onChangeText={(text) => setRut(formatRut(text))}
                            returnKeyType="next"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor={COLORS.textMuted}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />
                    </View>

                    {/* ── Botón principal ── */}
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                    </TouchableOpacity>

                    {/* ── Registro ── */}
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.registerButtonText}>Crear Cuenta</Text>
                    </TouchableOpacity>

                    {/* ── Registro ──
                    <Text style={styles.registerText}>
                        ¿No tienes cuenta?{' '}
                        <Text style={styles.registerLink} onPress={handleRegister}>
                            Regístrate
                        </Text>
                    </Text> */}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 48,
        backgroundColor: COLORS.background,
    },

    // Logo
    logoCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 4,
    },

    // Título
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primaryDark,
        marginBottom: 40,
    },

    // Selector de rol
    roleLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        letterSpacing: 1.6,
        marginBottom: 14,
    },
    rolesRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32,
        width: '100%',
    },
    roleButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 6,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        minHeight: 96,
        gap: 8,
    },
    roleButtonActive: {
        borderColor: COLORS.roleSelectedBorder,
        backgroundColor: COLORS.roleSelected,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 16,
    },
    roleTextActive: {
        color: COLORS.primaryDark,
    },

    // Inputs
    inputsContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    input: {
        width: '100%',
        paddingHorizontal: 18,
        paddingVertical: 17,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        fontSize: 16,
        color: COLORS.textPrimary,
    },

    // Botón login
    loginButton: {
        width: '100%',
        paddingVertical: 19,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.primaryShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // Botón login
    registerButton: {
        width: '100%',
        paddingVertical: 19,
        borderRadius: 18,
        backgroundColor: '#ff751f',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#ff751f',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    },
    registerButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // Registro
    registerText: {
        marginTop: 22,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    registerLink: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});
