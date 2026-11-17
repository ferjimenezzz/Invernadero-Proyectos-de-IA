import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { MetricCard } from './MetricCard';
import { colors, spacing, typography } from '../../theme';
import type { MetricReading } from '../../types/home';

interface Props {
  title: string;
  zoneLabel: string;
  metrics: MetricReading[];
  columns: number;
  onPressMetric?: (m: MetricReading) => void;
}

const GAP = spacing.md;

/**
 * Cuadrícula fluida: mide su propio ancho y reparte las tarjetas en N columnas.
 * 2 columnas en teléfono, 3–4 en tablet (ver useResponsive).
 */
export function MetricsGrid({ title, zoneLabel, metrics, columns, onPressMetric }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const itemWidth = width ? (width - GAP * (columns - 1)) / columns : undefined;

  return (
    <View>
      <View style={styles.header}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.primaryDark }]}>{zoneLabel}</Text>
      </View>

      <View style={styles.grid} onLayout={onLayout}>
        {itemWidth != null &&
          metrics.map((m) => (
            <MetricCard key={m.id} metric={m} style={{ width: itemWidth }} onPress={onPressMetric} />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
