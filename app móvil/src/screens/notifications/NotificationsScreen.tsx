import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card, EmptyState, ErrorState, FilterChips, InfoNote, LoadingState } from '../../components/common';
import { NotificationCard } from '../../components/notifications/NotificationCard';
import { StackScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { getNotifications } from '../../services/api';
import { mockNotifications } from '../../data/mockModules';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { RootScreenProps } from '../../navigation/types';
import type { AppNotification, NotificationFilter } from '../../types/notifications';

const FILTER_KIND: Record<Exclude<NotificationFilter, 'todas'>, AppNotification['kind'][]> = {
  criticas: ['critica'],
  advertencias: ['advertencia'],
  actividades: ['actividad'],
};

export function NotificationsScreen({ navigation }: RootScreenProps<'Notificaciones'>) {
  const { data, setData, error, loading, refreshing, refresh } = useAsync(getNotifications);
  const [filter, setFilter] = useState<NotificationFilter>('todas');

  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;
  const countOf = (f: Exclude<NotificationFilter, 'todas'>) => items.filter((n) => FILTER_KIND[f].includes(n.kind)).length;

  const visible = useMemo(
    () => (filter === 'todas' ? items : items.filter((n) => FILTER_KIND[filter].includes(n.kind))),
    [items, filter],
  );

  const markAllRead = () => {
    setData((d) => d?.map((n) => ({ ...n, read: true })) ?? d);
    mockNotifications.forEach((n) => (n.read = true)); // actualiza el contador del header en demo
  };

  const onAction: React.ComponentProps<typeof NotificationCard>['onAction'] = (item, action) => {
    setData((d) => d?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? d);
    switch (action) {
      case 'verSensor':
        return navigation.navigate('SensorDetalle', { sensorId: item.sensorId ?? 'SENS-SOIL-02' });
      case 'programarRiego':
        return navigation.navigate('Main', { screen: 'Control' });
      case 'verBitacora':
      case 'completar':
        return navigation.navigate('Main', { screen: 'Actividades' });
    }
  };

  return (
    <StackScreenLayout title="Notificaciones" refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.link} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={ms(18)} color={colors.primaryDark} />
          <Text style={[typography.body, { color: colors.primaryDark, fontWeight: '500' }]}>Volver</Text>
        </Pressable>
        <Pressable onPress={markAllRead} style={styles.link} hitSlop={8} disabled={unread === 0}>
          <MaterialCommunityIcons name="check-all" size={ms(16)} color={colors.primaryDark} />
          <Text style={[typography.bodySm, { color: colors.primaryDark, fontWeight: '500', opacity: unread ? 1 : 0.5 }]}>
            Marcar todas como leídas
          </Text>
        </Pressable>
      </View>

      <View>
        <View style={styles.titleRow}>
          <Text style={[typography.h1, { color: colors.textPrimary, fontWeight: '700', flexShrink: 1 }]}>
            Centro de Notificaciones
          </Text>
          {unread > 0 && <Badge label={`${unread} nuevas`} />}
        </View>
        <Text style={[typography.bodySm, { color: colors.textMuted }]}>Telemetría en tiempo real y bitácora del Invernadero A</Text>
      </View>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todas', label: 'Todas', count: items.length },
          { value: 'criticas', label: 'Alertas Críticas', count: countOf('criticas') },
          { value: 'advertencias', label: 'Advertencias', count: countOf('advertencias') },
          { value: 'actividades', label: 'Actividades', count: countOf('actividades') },
        ]}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refresh} />
      ) : visible.length === 0 ? (
        <EmptyState text="Sin notificaciones en esta categoría" icon="bell-check-outline" />
      ) : (
        visible.map((n) => <NotificationCard key={n.id} item={n} onAction={onAction} />)
      )}

      <Card variant="sunken" style={styles.health}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <View style={styles.healthTag}>
            <MaterialCommunityIcons name="leaf" size={ms(14)} color={colors.primaryDark} />
            <Text style={[typography.caption, { color: colors.primaryDark, letterSpacing: 0.6 }]}>SALUD DEL CULTIVO</Text>
          </View>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Microclima Estable</Text>
          <Text style={[typography.bodySm, { color: colors.textMuted }]} numberOfLines={2}>
            Albahaca, Romero y Menta mantienen niveles óptimos de fotosíntesis y transpiración.
          </Text>
        </View>
        <View style={styles.healthIcon}>
          <MaterialCommunityIcons name="sprout" size={ms(34)} color={colors.primary} />
        </View>
      </Card>

      <InfoNote
        text="Las notificaciones urgentes respetan los umbrales agronómicos configurados por el docente responsable de la cátedra de Fisiología Vegetal."
        style={{ backgroundColor: 'transparent' }}
      />
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  health: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  healthTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  healthIcon: {
    width: ms(72),
    height: ms(72),
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
