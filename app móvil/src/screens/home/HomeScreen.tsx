import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  EnvironmentChartCard,
  GreenhouseStatusCard,
  ManualIrrigationCard,
  MetricsGrid,
  SubstrateTempCard,
  WelcomeHero,
} from '../../components/home';
import { TabScreenLayout } from '../../components/layout/ScreenLayout';
import { useResponsive } from '../../hooks/useResponsive';
import { useAsync } from '../../hooks/useAsync';
import { fetchHome, toggleManualIrrigation } from '../../services/homeService';
import { colors } from '../../theme';
import type { TabScreenProps } from '../../navigation/types';

/** Mapea cada tarjeta de métrica al sensor que la mide. */
const METRIC_TO_SENSOR: Record<string, string> = {
  temp: 'SENS-ENV-01',
  'hum-aire': 'SENS-HUM-01',
  'hum-suelo': 'SENS-SOIL-02',
  luz: 'SENS-LUX-01',
};

export function HomeScreen({ navigation }: TabScreenProps<'Inicio'>) {
  const { metricColumns } = useResponsive();
  const { data, refreshing, refresh } = useAsync(fetchHome);
  const [irrigating, setIrrigating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setIrrigating(data.manualIrrigation.active);
  }, [data]);

  // Refresco periódico de telemetría (cada 30 s)
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const onToggleIrrigation = useCallback(async () => {
    setBusy(true);
    try {
      await toggleManualIrrigation(!irrigating);
      setIrrigating((v) => !v);
    } finally {
      setBusy(false);
    }
  }, [irrigating]);

  return (
    <TabScreenLayout refreshing={refreshing} onRefresh={refresh}>
      {!data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <WelcomeHero {...data.hero} />
          <GreenhouseStatusCard status={data.status} />
          <MetricsGrid
            title="Variables Ambientales"
            zoneLabel={data.zoneLabel}
            metrics={data.metrics}
            columns={metricColumns}
            onPressMetric={(m) =>
              navigation.navigate('SensorDetalle', { sensorId: METRIC_TO_SENSOR[m.id] ?? 'SENS-ENV-01' })
            }
          />
          <SubstrateTempCard {...data.substrate} />
          <EnvironmentChartCard
            onConfigureThresholds={() => navigation.navigate('SensorDetalle', { sensorId: 'SENS-ENV-01' })}
          />
          <ManualIrrigationCard
            title={data.manualIrrigation.title}
            valve={data.manualIrrigation.valve}
            active={irrigating}
            loading={busy}
            onToggle={onToggleIrrigation}
          />
        </>
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 80, alignItems: 'center' },
});
