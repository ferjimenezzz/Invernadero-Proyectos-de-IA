import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, InfoNote } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { isDemo } from '../../services/api';
import { colors, ms, radius, spacing, typography } from '../../theme';

/**
 * Inicio de sesión universitario.
 * No viene en el Figma: se diseñó con los mismos tokens para cerrar el flujo
 * (el Perfil tiene "Cerrar sesión universitaria").
 */
export function LoginScreen() {
  const { login } = useAuth();
  const { contentMaxWidth, gutter } = useResponsive();
  const [email, setEmail] = useState(isDemo ? 'sofia.rodriguez@universidad.edu.mx' : '');
  const [password, setPassword] = useState(isDemo ? 'demo1234' : '');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.includes('@') || password.length < 4) {
      setError('Revisa tu correo institucional y contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus datos o tu conexión.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.inner, { maxWidth: Math.min(contentMaxWidth, 480) }]}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <MaterialCommunityIcons name="sprout" size={ms(40)} color={colors.onPrimary} />
              </View>
              <Text style={[typography.h1, styles.title]}>Invernadero Inteligente</Text>
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                Monitoreo IoT de hierbas aromáticas • Grupo de Investigación Hortícola
              </Text>
            </View>

            <Card style={{ gap: spacing.md }}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>Iniciar sesión</Text>

              <View style={styles.field}>
                <MaterialCommunityIcons name="email-outline" size={ms(20)} color={colors.textMuted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Correo institucional"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={[typography.body, styles.input]}
                />
              </View>

              <View style={styles.field}>
                <MaterialCommunityIcons name="lock-outline" size={ms(20)} color={colors.textMuted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!show}
                  autoComplete="password"
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  style={[typography.body, styles.input]}
                />
                <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} accessibilityLabel="Mostrar contraseña">
                  <MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={ms(20)} color={colors.textMuted} />
                </Pressable>
              </View>

              {error && <InfoNote tone="danger" icon="alert-circle-outline" text={error} />}

              <Button label="Entrar" icon="login" size="lg" loading={loading} onPress={submit} />
            </Card>

            {isDemo && (
              <InfoNote
                tone="mint"
                icon="flask-outline"
                text="Modo demostración: sin EXPO_PUBLIC_API_URL la app usa datos simulados. Puedes entrar con los datos precargados."
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxxl },
  inner: { width: '100%', alignSelf: 'center', gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: ms(80),
    height: ms(80),
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { color: colors.primaryDark, fontWeight: '700', textAlign: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: ms(52),
  },
  input: { flex: 1, color: colors.textPrimary },
});
