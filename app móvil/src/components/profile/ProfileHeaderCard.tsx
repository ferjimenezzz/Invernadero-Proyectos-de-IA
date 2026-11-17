import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { UserProfile } from '../../types/profile';

/** Cabecera del perfil: foto, nombre, rol y estadísticas (Turnos, Lotes, Alertas). */
export function ProfileHeaderCard({ user }: { user: UserProfile }) {
  const AV = ms(96);
  return (
    <Card style={styles.card}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={[styles.avatarRing, { width: AV + 8, height: AV + 8, borderRadius: (AV + 8) / 2 }]}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: AV, height: AV, borderRadius: AV / 2 }} />
        ) : (
          <View style={[styles.avatarFallback, { width: AV, height: AV, borderRadius: AV / 2 }]}>
            <MaterialCommunityIcons name="account" size={AV * 0.55} color={colors.primary} />
          </View>
        )}
        <View style={styles.leaf}>
          <MaterialCommunityIcons name="leaf" size={ms(13)} color={colors.primary} />
        </View>
      </View>

      <Text style={[typography.h2, styles.name]}>{user.name}</Text>
      <Text style={[typography.bodySm, { color: colors.primary, fontWeight: '600' }]}>{user.role}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '400' }]}>{user.faculty}</Text>
      <Badge label="Miembro Activo del Proyecto" dot style={{ alignSelf: 'center', marginTop: spacing.sm }} />

      <View style={styles.stats}>
        {user.stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '400' }]}>{s.label}</Text>
            <Text style={[typography.h2, { color: colors.primaryDark }]}>{s.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.xxs, paddingTop: spacing.xxl },
  glow: {
    position: 'absolute',
    top: -ms(60),
    left: -ms(40),
    width: ms(220),
    height: ms(220),
    borderRadius: ms(110),
    backgroundColor: colors.primaryTint,
  },
  avatarRing: {
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  leaf: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.textPrimary, textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs },
});
