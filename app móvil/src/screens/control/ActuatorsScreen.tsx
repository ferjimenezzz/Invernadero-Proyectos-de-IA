import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card, ErrorState, IconBox, LoadingState } from '../../components/common';
import { ActuatorCard, KillSwitchPanel } from '../../components/actuators';
import { TabScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { getActuators, killSwitch, setActuatorPower, setFanLevel, setLightPwm } from '../../services/api';
import { colors, ms, spacing, typography } from '../../theme';
import type { Actuator, FanLevel } from '../../types/actuators';

export function ActuatorsScreen() {
  const { data, setData, error, loading, refreshing, refresh } = useAsync(getActuators);
  const [stopping, setStopping] = useState(false);

  /** Actualización optimista: cambia la UI y revierte si el backend falla. */
  const patch = useCallback(
    async (id: string, change: Partial<Actuator>, request: () => Promise<void>) => {
      let previous: Actuator | undefined;
      setData((d) =>
        d
          ? {
              ...d,
              actuators: d.actuators.map((a) => {
                if (a.id !== id) return a;
                previous = a;
                return { ...a, ...change } as Actuator;
              }),
            }
          : d,
      );
      try {
        await request();
      } catch {
        setData((d) =>
          d && previous ? { ...d, actuators: d.actuators.map((a) => (a.id === id ? previous! : a)) } : d,
        );
      }
    },
    [setData],
  );

  const onToggle = (id: string, on: boolean) => patch(id, { on }, () => setActuatorPower(id, on));

  // Mientras se arrastra solo cambia la UI; se envía al soltar.
  const onPwmChange = (id: string, pwm: number) =>
    setData((d) =>
      d ? { ...d, actuators: d.actuators.map((a) => (a.id === id && a.kind === 'light' ? { ...a, pwm } : a)) } : d,
    );
  const onPwmCommit = (id: string) => {
    const a = data?.actuators.find((x) => x.id === id);
    if (a?.kind === 'light') void setLightPwm(id, a.pwm);
  };

  const onFanLevel = (id: string, level: FanLevel) =>
    patch(id, { level, on: level !== 'off' } as Partial<Actuator>, () => setFanLevel(id, level));

  const onKill = async () => {
    setStopping(true);
    try {
      await killSwitch();
      setData((d) =>
        d
          ? {
              ...d,
              actuators: d.actuators.map((a) =>
                a.kind === 'fan' ? { ...a, on: false, level: 'off' } : a.kind === 'light' ? { ...a, on: false, pwm: 0 } : { ...a, on: false },
              ),
            }
          : d,
      );
    } finally {
      setStopping(false);
    }
  };

  const activeCount = data?.actuators.filter((a) => a.on).length ?? 0;

  return (
    <TabScreenLayout refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, styles.title]} accessibilityRole="header">
            Actuadores y Relés
          </Text>
          <View style={styles.subRow}>
            <View style={styles.dot} />
            <Text style={[typography.bodySm, { color: colors.textMuted, flex: 1 }]}>
              {data?.linked ?? '–'} dispositivos vinculados • {activeCount} activos • Control en tiempo real
            </Text>
          </View>
        </View>
        {data && <Badge label={`${data.totalPower} total`} icon="lightning-bolt" />}
      </View>

      {loading ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState onRetry={refresh} />
      ) : (
        <>
          {data.actuators.map((a) => (
            <ActuatorCard
              key={a.id}
              actuator={a}
              onToggle={onToggle}
              onPwmChange={onPwmChange}
              onPwmCommit={onPwmCommit}
              onFanLevel={onFanLevel}
            />
          ))}

          <Card variant="muted" style={styles.insight}>
            <IconBox name="solar-power-variant-outline" round size={40} background={colors.surface} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{data.insight.title}</Text>
              <Text style={[typography.bodySm, { color: colors.textMuted }]}>{data.insight.text}</Text>
            </View>
          </Card>

          <KillSwitchPanel onConfirm={onKill} loading={stopping} />
        </>
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.primaryDark, fontWeight: '700' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  dot: { width: ms(7), height: ms(7), borderRadius: 4, backgroundColor: colors.success },
  insight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
});
