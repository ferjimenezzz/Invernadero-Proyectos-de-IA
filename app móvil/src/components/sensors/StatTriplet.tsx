import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../common';
import { colors, ms, spacing, typography } from '../../theme';
import type { SensorDetail } from '../../types/sensors';

/** Fila MÍNIMO / PROMEDIO / MÁXIMO del detalle de sensor. */
export function StatTriplet({ stats }: { stats: SensorDetail['stats'] }) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => {
        const tint = i === 0 ? colors.danger : colors.primary;
        return (
          <Card key={s.label} style={styles.card}>
            <View style={styles.top}>
              <Text style={[typography.caption, { color: colors.textPrimary, letterSpacing: 0.8 }]}>{s.label}</Text>
              <MaterialCommunityIcons name={s.icon} size={ms(16)} color={tint} />
            </View>
            <Text style={[typography.h2, styles.value]}>
              {s.value} <Text style={[typography.caption, { color: colors.textSecondary }]}>{s.unit}</Text>
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{s.caption}</Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: { flex: 1, padding: spacing.md, gap: spacing.xs },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { color: colors.textPrimary },
});
