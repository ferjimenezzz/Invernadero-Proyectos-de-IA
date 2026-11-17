import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { HomeData } from '../../types/home';

type Props = HomeData['hero'];

/** Tarjeta de bienvenida con lote, hora de actualización y dispositivo activo. */
export function WelcomeHero({ lot, updatedAt, title, description, device }: Props) {
  return (
    <Card variant="muted">
      {/* Arco decorativo de fondo (esquina inferior derecha) */}
      <View pointerEvents="none" style={styles.decoration} />

      <View style={styles.topRow}>
        <Badge label={lot} icon="sprout-outline" />
        <View style={styles.time}>
          <MaterialCommunityIcons name="sync" size={ms(14)} color={colors.textMuted} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>{updatedAt}</Text>
        </View>
      </View>

      <Text style={[typography.h1, styles.title]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[typography.body, styles.description]}>{description}</Text>

      <View style={styles.device}>
        <MaterialCommunityIcons name="chip" size={ms(16)} color={colors.textMuted} />
        <Text style={[typography.caption, styles.deviceText]} numberOfLines={1}>
          {device}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  decoration: {
    position: 'absolute',
    right: -ms(60),
    bottom: -ms(80),
    width: ms(200),
    height: ms(200),
    borderRadius: ms(100),
    borderWidth: ms(14),
    borderColor: colors.surfaceSunken,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.textPrimary, marginTop: spacing.md },
  description: { color: colors.textMuted, marginTop: spacing.xs },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deviceText: { color: colors.textMuted, flex: 1 },
});
