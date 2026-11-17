import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  AppHeader,
  EnvironmentChartCard,
  GreenhouseStatusCard,
  ManualIrrigationCard,
  MetricsGrid,
  SubstrateTempCard,
  WelcomeHero,
} from '../components/home';
import { useResponsive } from '../hooks/useResponsive';
import { fetchHome, toggleManualIrrigation } from '../services/homeService';
import { colors, spacing } from '../theme';
import type { HomeData } from '../types/home';
import type { TabParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { metricColumns, contentMaxWidth, gutter } = useResponsive();

  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [irrigating, setIrrigating] = useState(false);
  const [irrigationBusy, setIrrigationBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchHome();
      setData(d);
      setIrrigating(d.manualIrrigation.active);
    } catch (e) {
      console.warn('[Home] error al cargar', e);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresco periódico de telemetría (cada 30 s)
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onToggleIrrigation = useCallback(async () => {
    const next = !irrigating;
    setIrrigationBusy(true);
    try {
      await toggleManualIrrigation(next);
      setIrrigating(next);
    } finally {
      setIrrigationBusy(false);
    }
  }, [irrigating]);

  if (!data) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header fijo */}
      <View style={[styles.headerWrap, { paddingHorizontal: gutter }]}>
        <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>
          <AppHeader
            title={data.greenhouseName}
            subtitle={data.subtitle}
            connected={data.connected}
            unread={data.unreadNotifications}
            avatarUrl={data.avatarUrl}
            onPressAvatar={() => navigation.navigate('Perfil')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={[styles.inner, styles.stack, { maxWidth: contentMaxWidth }]}>
          <WelcomeHero {...data.hero} />

          <GreenhouseStatusCard status={data.status} />

          <MetricsGrid
            title="Variables Ambientales"
            zoneLabel={data.zoneLabel}
            metrics={data.metrics}
            columns={metricColumns}
            onPressMetric={() => navigation.navigate('Sensores')}
          />

          <SubstrateTempCard {...data.substrate} />

          <EnvironmentChartCard onConfigureThresholds={() => navigation.navigate('Sensores')} />

          <ManualIrrigationCard
            title={data.manualIrrigation.title}
            valve={data.manualIrrigation.valve}
            active={irrigating}
            loading={irrigationBusy}
            onToggle={onToggleIrrigation}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inner: { width: '100%', alignSelf: 'center' },
  scroll: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  stack: { gap: spacing.xl },
});
