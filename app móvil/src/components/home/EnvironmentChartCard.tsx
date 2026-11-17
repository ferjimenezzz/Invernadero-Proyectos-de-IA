import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, SegmentedControl } from '../common';
import { LineChart } from './LineChart';
import { colors, ms, radius, spacing, typography } from '../../theme';
import { fetchSeries } from '../../services/homeService';
import type { ChartRange, ChartSeries, ChartVariable } from '../../types/home';

const VARIABLES: { value: ChartVariable; label: string }[] = [
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'humedad', label: 'Humedad' },
  { value: 'luz', label: 'Radiación Luz' },
];

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
];

const SUBTITLE: Record<ChartVariable, string> = {
  temperatura: 'Dinámica térmica de las últimas horas',
  humedad: 'Humedad relativa de las últimas horas',
  luz: 'Radiación lumínica de las últimas horas',
};

interface Props {
  onConfigureThresholds?: () => void;
}

/** "Comportamiento Ambiental": selector de variable + rango + gráfica. */
export function EnvironmentChartCard({ onConfigureThresholds }: Props) {
  const [variable, setVariable] = useState<ChartVariable>('temperatura');
  const [range, setRange] = useState<ChartRange>('6h');
  const [series, setSeries] = useState<ChartSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchSeries(variable, range)
      .then((s) => alive && setSeries(s))
      .catch(() => alive && setSeries(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [variable, range]);

  const average = useMemo(() => {
    if (!series?.points.length) return null;
    const sum = series.points.reduce((a, p) => a + p.value, 0);
    return (sum / series.points.length).toFixed(1);
  }, [series]);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Comportamiento Ambiental</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{SUBTITLE[variable]}</Text>
        </View>
        {average && series && (
          <View style={styles.avg}>
            <MaterialCommunityIcons name="chart-box-outline" size={ms(14)} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Prom: {average} {series.unit}
            </Text>
          </View>
        )}
      </View>

      <SegmentedControl options={VARIABLES} value={variable} onChange={setVariable} style={styles.tabs} />

      <View style={styles.rangeRow}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Rango de análisis:</Text>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} variant="chips" />
      </View>

      <View style={styles.chartArea}>
        {loading || !series ? (
          <View style={styles.placeholder}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[typography.bodySm, { color: colors.textSecondary }]}>
                No se pudo cargar el histórico
              </Text>
            )}
          </View>
        ) : (
          <LineChart
            points={series.points}
            unit={series.unit}
            bandMin={series.comfortMin}
            bandMax={series.comfortMax}
            xLabels={series.xLabels}
          />
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {series?.sensorName ?? 'Sensor'}
          </Text>
        </View>
        <Pressable onPress={onConfigureThresholds} hitSlop={8} accessibilityRole="link">
          <Text style={[typography.caption, { color: colors.primaryDark }]}>Configurar umbrales →</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  avg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  tabs: { marginTop: spacing.lg },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  chartArea: { marginTop: spacing.xl, minHeight: ms(250) },
  placeholder: { height: ms(250), alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chartLine },
});
