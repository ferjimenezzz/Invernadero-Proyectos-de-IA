import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Button, Card, IconBox, Sparkline } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { Sensor } from '../../types/sensors';

interface Props {
  sensor: Sensor;
  onPressHistory: (s: Sensor) => void;
}

/** Tarjeta de la lista "Sensores del Invernadero". */
export const SensorCard = memo(function SensorCard({ sensor, onPressHistory }: Props) {
  const warn = sensor.status !== 'normal';
  const accent = warn ? colors.danger : colors.chartLine;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconBox
          name={sensor.icon}
          size={40}
          background={warn ? colors.warningSoft : colors.primaryTint}
          color={warn ? colors.danger : colors.primaryDark}
        />
        <View style={styles.titles}>
          <Text style={[typography.h3, styles.name]} numberOfLines={1}>
            {sensor.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            ID: {sensor.id} • {sensor.location}
          </Text>
        </View>
        {warn ? (
          <Badge label={sensor.statusLabel ?? 'Atención'} tone="warning" icon="alert-outline" />
        ) : (
          <Badge label={sensor.online ? 'En línea' : 'Desconectado'} tone={sensor.online ? 'success' : 'neutral'} dot />
        )}
      </View>

      {sensor.alertMessage && (
        <View style={styles.alert}>
          <MaterialCommunityIcons name="exclamation" size={ms(16)} color={colors.danger} />
          <Text style={[typography.bodySm, { color: colors.dangerStrong, flex: 1 }]}>{sensor.alertMessage}</Text>
        </View>
      )}

      <View style={styles.reading}>
        <View style={styles.readingText}>
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.8 }]}>
            {sensor.readingLabel}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[typography.display, { color: warn ? colors.dangerStrong : colors.textPrimary }]}>
              {sensor.value}
            </Text>
            <Text style={[typography.unit, { color: warn ? colors.danger : colors.textSecondary }]}>{sensor.unit}</Text>
          </View>
        </View>
        <View style={styles.trend}>
          <Sparkline data={sensor.trend} color={accent} height={ms(34)} area={warn} style={styles.spark} />
          <View style={styles.trendLabel}>
            <MaterialCommunityIcons name={sensor.trendLabel.icon} size={ms(12)} color={accent} />
            <Text style={[typography.caption, { color: warn ? colors.danger : colors.textMuted, fontWeight: '500' }]}>
              {sensor.trendLabel.text}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={ms(14)} color={warn ? colors.danger : colors.textMuted} />
            <Text style={[typography.bodySm, { color: colors.textPrimary }]}>{sensor.lastSeen}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name={sensor.hardware.icon} size={ms(13)} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {sensor.hardware.text}
            </Text>
          </View>
        </View>
        <Button label="Ver historial" size="sm" iconRight="chevron-right" onPress={() => onPressHistory(sensor)} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1, minWidth: 0 },
  name: { color: colors.textPrimary },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  readingText: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  trend: { width: '42%', alignItems: 'flex-end', gap: spacing.xxs },
  spark: { alignSelf: 'stretch' },
  trendLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meta: { flex: 1, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
