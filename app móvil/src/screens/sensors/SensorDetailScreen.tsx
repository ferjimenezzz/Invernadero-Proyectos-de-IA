import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  IconBox,
  LoadingState,
  SegmentedControl,
} from '../../components/common';
import { LineChart } from '../../components/home';
import { StatTriplet, ThresholdRuleCard, ThresholdSheet } from '../../components/sensors';
import { BackPill, StackScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { calibrateSensor, getSensorDetail, saveThresholds } from '../../services/api';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { RootScreenProps } from '../../navigation/types';
import type { ChartRange } from '../../types/home';

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 días' },
];

export function SensorDetailScreen({ route }: RootScreenProps<'SensorDetalle'>) {
  const { sensorId } = route.params;
  const { data, error, loading, refreshing, refresh, setData } = useAsync(
    () => getSensorDetail(sensorId),
    [sensorId],
  );
  const [range, setRange] = useState<ChartRange>('24h');
  const [sheet, setSheet] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const onSaveThresholds = async (min: number, max: number) => {
    await saveThresholds(sensorId, min, max);
    setData((d) => (d ? { ...d, thresholdEditor: { ...d.thresholdEditor, min, max } } : d));
  };

  const onCalibrate = async () => {
    setCalibrating(true);
    try {
      await calibrateSensor(sensorId);
      Alert.alert('Calibración enviada', `El nodo ${sensorId} recalibrará su lectura en el próximo ciclo.`);
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <StackScreenLayout title="Sensor Detalle" refreshing={refreshing} onRefresh={refresh}>
      <BackPill label="Sensores" right={<Badge label={sensorId} tone="neutral" icon="access-point" />} />

      {loading ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState onRetry={refresh} />
      ) : (
        <>
          {/* Lectura principal */}
          <Card>
            <View style={styles.watermark} pointerEvents="none">
              <MaterialCommunityIcons name={data.icon} size={ms(110)} color={colors.primaryTint} />
            </View>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.primary, letterSpacing: 0.8 }]}>{data.module}</Text>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>{data.title}</Text>
              </View>
              <IconBox name="crop-square" size={44} background={colors.primarySoft} />
            </View>

            <View style={styles.valueRow}>
              <MaterialCommunityIcons name={data.icon} size={ms(34)} color={colors.primaryDark} />
              <Text style={[typography.display, { color: colors.textPrimary, fontSize: ms(42) }]}>{data.value}</Text>
              <Text style={[typography.h3, { color: colors.textSecondary }]}>{data.unit}</Text>
              <View style={{ flex: 1 }} />
              <Badge
                label={data.statusLabel}
                tone={data.status === 'normal' ? 'success' : 'warning'}
                dot
              />
            </View>

            <View style={styles.transmission}>
              <MaterialCommunityIcons name="clock-outline" size={ms(15)} color={colors.textMuted} />
              <Text style={[typography.bodySm, { color: colors.textMuted }]}>{data.lastTransmission}</Text>
            </View>

            <View style={styles.diag}>
              <Diag icon="wifi" text={data.signal} />
              <Text style={styles.dot}>•</Text>
              <Diag icon="battery-80" text={data.battery} />
              <Text style={styles.dot}>•</Text>
              <Diag icon="chip" text={data.firmware} />
            </View>
          </Card>

          <StatTriplet stats={data.stats} />

          {/* Histórico */}
          <Card style={{ gap: spacing.lg }}>
            <CardHeader
              icon="chart-line"
              title={data.history.title}
              right={<Text style={[typography.caption, { color: colors.textMuted }]}>Unidad: {data.history.unit} HR</Text>}
            />
            <SegmentedControl options={RANGES} value={range} onChange={setRange} />
            <LineChart
              points={data.history.points}
              unit={data.history.unit}
              bandMin={data.history.comfortMin}
              bandMax={data.history.comfortMax}
              bandLabel={`Zona Óptima (${data.history.comfortMin}-${data.history.comfortMax}${data.history.unit})`}
              threshold={data.history.threshold}
              thresholdLabel={`Umbral de riego ${data.history.threshold}${data.history.unit}`}
              xLabels={data.history.xLabels}
            />
            <View style={styles.legend}>
              <Legend color={colors.chartLine} label="Humedad Real" />
              <Legend color={colors.danger} label={`Umbral ${data.history.threshold}%`} />
              <Legend color={colors.primarySoft} label="Rango Ideal" square />
            </View>
          </Card>

          {/* Reglas de cultivo */}
          <Card style={{ gap: spacing.md }}>
            <CardHeader
              icon="tune-variant"
              title={data.crop.name}
              right={
                <Text style={[typography.caption, styles.scientific]} numberOfLines={2}>
                  {data.crop.scientific}
                </Text>
              }
            />
            <Text style={[typography.bodySm, { color: colors.textMuted }]}>{data.crop.description}</Text>
            {data.rules.map((r) => (
              <ThresholdRuleCard key={r.id} rule={r} />
            ))}
            <Button label="Editar umbrales de cultivo" variant="secondary" icon="tune-variant" onPress={() => setSheet(true)} />
          </Card>

          <Button
            label="Calibrar lectura de sensor"
            icon="target"
            size="lg"
            loading={calibrating}
            onPress={onCalibrate}
          />
          <Button
            label="Exportar CSV de datos (Reporte Académico)"
            variant="light"
            icon="download"
            onPress={() => Alert.alert('Exportación', 'Conecta este botón a GET /mediciones/export?sensor=' + sensorId)}
          />

          <ThresholdSheet
            visible={sheet}
            config={data.thresholdEditor}
            onClose={() => setSheet(false)}
            onSave={onSaveThresholds}
          />
        </>
      )}
    </StackScreenLayout>
  );
}

function Diag({ icon, text }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; text: string }) {
  return (
    <View style={styles.diagItem}>
      <MaterialCommunityIcons name={icon} size={ms(15)} color={colors.textPrimary} />
      <Text style={[typography.caption, { color: colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

function Legend({ color, label, square }: { color: string; label: string; square?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[square ? styles.legendSquare : styles.legendLine, { backgroundColor: color }]} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: { position: 'absolute', right: -ms(10), bottom: -ms(10), opacity: 0.9 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  transmission: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  diag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  diagItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { color: colors.textSecondary },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendLine: { width: 12, height: 3, borderRadius: 2 },
  legendSquare: { width: 10, height: 10, borderRadius: 2 },
  scientific: { color: colors.primaryDark, maxWidth: ms(110), textAlign: 'right', fontWeight: '500' },
});
