import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { ThresholdRule } from '../../types/sensors';

const TONES = {
  warning: { bg: colors.warningSoft, fg: colors.dangerStrong, accent: colors.danger },
  success: { bg: colors.primarySoft, fg: colors.primaryDark, accent: colors.primary },
  danger: { bg: colors.dangerSoft, fg: colors.emergency, accent: colors.emergency },
} as const;

/** Regla agronómica: Alerta Baja / Rango Óptimo / Alerta Alta. */
export function ThresholdRuleCard({ rule }: { rule: ThresholdRule }) {
  const t = TONES[rule.tone];
  return (
    <View style={[styles.card, { backgroundColor: t.bg }]}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name={rule.icon} size={ms(16)} color={t.accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[typography.body, styles.title, { color: t.fg }]}>{rule.title}</Text>
          <Text style={[typography.body, styles.value, { color: t.fg }]}>{rule.value}</Text>
        </View>
        <Text style={[typography.bodySm, { color: t.fg, opacity: 0.85 }]}>{rule.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.md, padding: spacing.md },
  icon: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontWeight: '600' },
  value: { fontWeight: '700' },
});
