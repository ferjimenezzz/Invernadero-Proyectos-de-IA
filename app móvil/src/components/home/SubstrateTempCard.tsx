import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Card, IconBox, toneFromStatus } from '../common';
import { colors, ms, spacing, typography } from '../../theme';
import type { HomeData } from '../../types/home';

type Props = HomeData['substrate'];

/** Tarjeta horizontal para la sonda de sustrato (DS18B20). */
export function SubstrateTempCard({ label, sensor, value, unit, status }: Props) {
  return (
    <Card style={styles.card}>
      <IconBox name="thermometer-lines" size={46} />
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={[typography.bodySm, styles.title]} numberOfLines={1}>
            {label}
          </Text>
          <Badge label={status === 'normal' ? 'Normal' : 'Atención'} tone={toneFromStatus(status)} />
        </View>
        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {sensor}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[typography.display, styles.value]}>{value}</Text>
        <Text style={[typography.unit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.textPrimary, fontWeight: '500' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: { color: colors.textPrimary, fontSize: ms(30) },
});
