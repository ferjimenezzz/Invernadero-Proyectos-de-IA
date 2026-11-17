import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  IconBox,
  LoadingState,
  SearchBar,
} from '../../components/common';
import { ActivityCard, SelectField } from '../../components/activities';
import { TabScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { useResponsive } from '../../hooks/useResponsive';
import { getActivities } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import type { TabScreenProps } from '../../navigation/types';
import type { ActivityStatus } from '../../types/activities';

type Filter = 'todas' | ActivityStatus;

const CROPS = [
  { id: 'all', label: 'Cultivo: Todas las aromáticas (Albahaca, Romero, Menta)' },
  { id: 'ALBAHACA', label: 'Albahaca' },
  { id: 'ROMERO', label: 'Romero y Tomillo' },
  { id: 'MENTA', label: 'Menta Piperita' },
];

export function ActivitiesScreen({ navigation }: TabScreenProps<'Actividades'>) {
  const { data, setData, error, loading, refreshing, refresh } = useAsync(getActivities);
  const { isTablet } = useResponsive();
  const [query, setQuery] = useState('');
  const [crop, setCrop] = useState('all');
  const [filter, setFilter] = useState<Filter>('todas');

  // Recarga al volver de "Registrar actividad".
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const items = data?.items ?? [];
  const count = (s: ActivityStatus) => items.filter((a) => a.status === s).length;

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (a) =>
        (filter === 'todas' || a.status === filter) &&
        (crop === 'all' || a.location.includes(crop)) &&
        (!q || [a.title, a.location, a.assignee.name].some((f) => f.toLowerCase().includes(q))),
    );
  }, [items, query, crop, filter]);

  const complete = (id: string) =>
    setData((d) =>
      d ? { ...d, items: d.items.map((a) => (a.id === id ? { ...a, status: 'completada' } : a)) } : d,
    );

  return (
    <TabScreenLayout refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, styles.title]} accessibilityRole="header">
            Actividades del Cultivo
          </Text>
          <Text style={[typography.bodySm, { color: colors.textMuted }]}>Registro agronómico y bitácora universitaria</Text>
        </View>
        <Button
          label="Registrar"
          icon="calendar-plus"
          size="lg"
          onPress={() => navigation.navigate('RegistrarActividad')}
        />
      </View>

      {data && (
        <Card style={styles.summary}>
          <IconBox name="school-outline" size={44} background={colors.primary} color={colors.onPrimary} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <View style={styles.summaryHead}>
              <Text style={[typography.bodySm, { color: colors.primaryDark, fontWeight: '600' }]}>{data.summary.title}</Text>
              <Badge label={data.summary.compliance} />
            </View>
            <Text style={[typography.bodySm, { color: colors.primaryDark }]}>{data.summary.text}</Text>
          </View>
        </Card>
      )}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por tarea, cultivo o responsable..." />
      <SelectField icon="sprout-outline" title="Filtrar por cultivo" value={crop} options={CROPS} onChange={setCrop} />

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todas', label: 'Todas', count: items.length },
          { value: 'pendiente', label: 'Pendientes', count: count('pendiente') },
          { value: 'enProceso', label: 'En proceso', count: count('enProceso') },
          { value: 'completada', label: 'Completadas', count: count('completada') },
        ]}
      />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refresh} />
      ) : visible.length === 0 ? (
        <EmptyState text="No hay actividades con esos filtros" icon="clipboard-text-search-outline" />
      ) : (
        <View style={[styles.list, isTablet && styles.grid]}>
          {visible.map((a) => (
            <View key={a.id} style={isTablet ? styles.gridItem : undefined}>
              <ActivityCard activity={a} onComplete={complete} />
            </View>
          ))}
        </View>
      )}
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.textPrimary, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  list: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '48.5%' },
});
