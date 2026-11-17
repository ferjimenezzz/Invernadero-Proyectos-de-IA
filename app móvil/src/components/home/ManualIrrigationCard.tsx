import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, IconBox } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';

interface Props {
  title: string;
  valve: string;
  active: boolean;
  loading?: boolean;
  onToggle: () => void;
}

/** Acceso rápido para activar/detener el riego manual. */
export function ManualIrrigationCard({ title, valve, active, loading, onToggle }: Props) {
  return (
    <Card variant="muted" style={styles.card}>
      <IconBox name="shower-head" round size={40} background={colors.surfaceSunken} />
      <View style={styles.texts}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{valve}</Text>
      </View>
      <Pressable
        onPress={onToggle}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, checked: active }}
        style={({ pressed }) => [
          styles.button,
          active && styles.buttonStop,
          pressed && { opacity: 0.85 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} size="small" />
        ) : (
          <>
            <MaterialCommunityIcons
              name={active ? 'stop-circle-outline' : 'play-circle-outline'}
              size={ms(20)}
              color={colors.onPrimary}
            />
            <Text style={styles.buttonText}>{active ? 'Detener' : 'Activar'}</Text>
          </>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  texts: { flex: 1, gap: spacing.xxs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minWidth: ms(112),
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonStop: { backgroundColor: colors.danger },
  buttonText: { color: colors.onPrimary, fontSize: ms(15), fontWeight: '700' },
});
