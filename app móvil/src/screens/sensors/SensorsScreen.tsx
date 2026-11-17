import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  IconBox,
  InfoNote,
  LoadingState,
  SearchBar,
} from '../../components/common';
import { SensorCard } from '../../components/sensors';
import { TabScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { useResponsive } from '../../hooks/useResponsive';
import { getSensors } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import type { TabScreenProps } from '../../navigation/types';
import type { Sensor, SensorFilter } from '../../types/sensors';

const matches = (s: Sensor, q: string) =>
  [s.id, s.name, s.location].some((f) => f.toLowerCase().includes(q.toLowerCase()));

export function SensorsScreen({ navigation }: TabScreenProps<'Sensores'>) {
  const { data, error, loading, refreshing, refresh } = useAsync(getSensors);
  const { isTablet } = useResponsive();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SensorFilter>('todos');

  const sensors = data ?? [];
  const counts = {
    todos: sensors.length,
    enLinea: sensors.filter((s) => s.online).length,
    alertas: sensors.filter((s) => s.status !== 'normal').length,
    desconectados: sensors.filter((s) => !s.online).length,
  };

  const visible = useMemo(
    () =>
      sensors.filter((s) => {
        if (query && !matches(s, query)) return false;
        if (filter === 'enLinea') return s.online;
        if (filter === 'alertas') return s.status !== 'normal';
        if (filter === 'desconectados') return !s.online;
        return true;
      }),
    [sensors, query, filter],
  );

  const openDetail = (s: Sensor) => navigation.navigate('SensorDetalle', { sensorId: s.id });

  return (
    <TabScreenLayout refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.hero}>
        <Badge label="Telemetría Experimental" icon="access-point" />
        <Text style={[typography.h1, styles.title]} accessibilityRole="header">
          Sensores del Invernadero
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>Monitoreo en tiempo real de nodos IoT instalados</Text>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar sensor por ID, zona o especie..." />

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todos', label: 'Todos', count: counts.todos },
          { value: 'enLinea', label: 'En línea', count: counts.enLinea },
          { value: 'alertas', label: 'Con alertas', count: counts.alertas, dot: colors.warning },
          { value: 'desconectados', label: 'Desconectados', count: counts.desconectados },
        ]}
      />

      <InfoNote icon="sync" text="Valores actualizados vía protocolo MQTT" right="ACTIVO" />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refresh} />
      ) : visible.length === 0 ? (
        <EmptyState text="No hay sensores que coincidan con la búsqueda" />
      ) : (
        <View style={[styles.list, isTablet && styles.grid]}>
          {visible.map((s) => (
            <View key={s.id} style={isTablet ? styles.gridItem : undefined}>
              <SensorCard sensor={s} onPressHistory={openDetail} />
            </View>
          ))}
        </View>
      )}

      <Card variant="sunken" style={styles.policy}>
        <View style={styles.policyRow}>
          <IconBox name="wifi-sync" size={34} background={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
              Política de Enlace Inalámbrico
            </Text>
            <Text style={[typography.bodySm, { color: colors.textMuted }]}>
              El sistema notificará automáticamente si un sensor pierde conectividad por más de 10 minutos.
            </Text>
          </View>
        </View>
        <Button
          label="Escanear nuevos nodos IoT"
          variant="light"
          icon="radar"
          onPress={() => navigation.navigate('Conectividad')}
        />
      </Card>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs },
  title: { color: colors.textPrimary, fontWeight: '700' },
  list: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '48.5%' },
  policy: { gap: spacing.md, padding: spacing.lg },
  policyRow: { flexDirection: 'row', gap: spacing.md },
});
