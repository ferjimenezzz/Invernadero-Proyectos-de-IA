import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Button, Card, CardHeader, ErrorState, InfoNote, ListRow, LoadingState, Toggle } from '../../components/common';
import { MeshNodeRow, ModeSwitch, TechTile } from '../../components/network/NetworkParts';
import { StackScreenLayout } from '../../components/layout/ScreenLayout';
import { useAsync } from '../../hooks/useAsync';
import { getNetworkStatus, pingGateway } from '../../services/api';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { TelemetryMode } from '../../types/network';

const quality = (ms: number) => (ms < 30 ? 'Excelente' : ms < 80 ? 'Buena' : 'Inestable');

export function ConnectivityScreen() {
  const { data, setData, error, loading, refreshing, refresh } = useAsync(getNetworkStatus);
  const [pinging, setPinging] = useState(false);

  const setMode = (mode: TelemetryMode) => setData((d) => (d ? { ...d, mode } : d));

  const ping = async () => {
    if (!data) return;
    setPinging(true);
    try {
      const latencyMs = await pingGateway(data.gateway.apiUrl);
      setData((d) => (d ? { ...d, gateway: { ...d.gateway, latencyMs } } : d));
    } catch {
      Alert.alert('Sin respuesta', `No se pudo alcanzar ${data.gateway.apiUrl}. Revisa que el teléfono esté en la misma red.`);
    } finally {
      setPinging(false);
    }
  };

  return (
    <StackScreenLayout title="Conexión ESP32" refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState onRetry={refresh} />
      ) : (
        <>
          <Card style={styles.gap}>
            <CardHeader
              icon="tune-variant"
              title="Fuente de Telemetría"
              right={<Badge label={data.synced ? 'Sincronizado' : 'Sin sincronizar'} tone={data.synced ? 'success' : 'warning'} dot />}
            />
            <ModeSwitch value={data.mode} onChange={setMode} />
            <InfoNote
              icon="graph-outline"
              tone="mint"
              text={
                data.mode === 'real'
                  ? 'Conexión activa: Enlace bidireccional directo con microcontrolador ESP32-S3 a 50Hz de refresco.'
                  : 'Modo demostración: los valores se generan localmente, sin hardware conectado.'
              }
            />
          </Card>

          <Card style={styles.gap}>
            <CardHeader icon="router-wireless" title="Gateway ESP32" right={<Badge label={data.gateway.band} />} />
            <Text style={[typography.bodySm, { color: colors.textPrimary, fontWeight: '500' }]}>Servidor API / Broker Local</Text>
            <View style={styles.urlBox}>
              <MaterialCommunityIcons name="server" size={ms(20)} color={colors.textMuted} />
              <Text style={[typography.bodySm, styles.mono]} numberOfLines={1}>
                {data.gateway.apiUrl}
              </Text>
              <Pressable
                hitSlop={8}
                accessibilityLabel="Compartir URL"
                onPress={() => Share.share({ message: data.gateway.apiUrl })}
              >
                <MaterialCommunityIcons name="content-copy" size={ms(18)} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.row}>
              <TechTile label="DIRECCIÓN IP" value={data.gateway.ip} caption="Asignación DHCP" />
              <TechTile label="DIRECCIÓN MAC" value={data.gateway.mac} caption="ESP-IDF Hardware" />
            </View>
            <ListRow
              boxed
              icon="swap-horizontal"
              overline="Puerto Telemetría"
              title={data.gateway.port}
              right={<Badge label={data.gateway.portOpen ? 'Abierto' : 'Cerrado'} tone={data.gateway.portOpen ? 'success' : 'danger'} />}
            />
            <View style={styles.channel}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>Estado del Canal</Text>
              <Badge label={`${data.gateway.latencyMs} ms (${quality(data.gateway.latencyMs)})`} tone="info" />
            </View>
            <Button label="Probar Conexión (Ping)" icon="access-point-network" size="lg" loading={pinging} onPress={ping} />
          </Card>

          <Card style={styles.gap}>
            <CardHeader
              icon="lan"
              title="Nodos en Malla"
              right={<Badge label={`${data.nodes.filter((n) => n.healthy).length} Activos`} />}
            />
            {data.nodes.map((n) => (
              <MeshNodeRow key={n.id} node={n} />
            ))}
          </Card>

          <Card style={styles.gap}>
            <CardHeader icon="cloud-sync-outline" title="Nube & Telemetría" />
            <ListRow
              boxed
              title="Sincronización AgroCloud"
              subtitle="Respaldo de series temporales cada 5 min"
              right={
                <Toggle value={data.cloudSync} onChange={(v) => setData((d) => (d ? { ...d, cloudSync: v } : d))} size="lg" />
              }
            />
            <Button
              label="Exportar Datos de Telemetría (CSV)"
              variant="secondary"
              icon="download"
              onPress={() => Alert.alert('Exportación', 'Conecta este botón a GET /mediciones/export')}
            />
          </Card>
        </>
      )}
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  mono: { flex: 1, fontFamily: 'monospace', color: colors.textPrimary },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
