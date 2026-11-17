import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Badge, Button, Card, CardHeader, ListRow, Toggle } from '../../components/common';
import { ProfileHeaderCard } from '../../components/profile/ProfileHeaderCard';
import { TabScreenLayout } from '../../components/layout/ScreenLayout';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getGreenhouseInfo } from '../../services/api';
import { unitRows } from '../../data/mockModules';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { TabScreenProps } from '../../navigation/types';
import type { NotificationPrefs, SystemPrefs } from '../../types/profile';

export function ProfileScreen({ navigation }: TabScreenProps<'Perfil'>) {
  const { user, logout } = useAuth();
  const { data: info } = useAsync(getGreenhouseInfo);
  const [notif, setNotif] = useState<NotificationPrefs>({ criticalAlerts: true, tasks: true, dailyReport: false });
  const [system, setSystem] = useState<SystemPrefs>({ demoMode: false, offlineSync: true });

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta universitaria?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);

  if (!user) return null;

  return (
    <TabScreenLayout>
      <ProfileHeaderCard user={user} />

      {info && (
        <Card style={styles.gap}>
          <CardHeader icon="greenhouse" title="Información del Invernadero" right={<Badge label={'IOT\nV2'} tone="neutral" />} />
          <View style={styles.infoBox}>
            <Text style={[typography.caption, styles.overline]}>PROYECTO ASIGNADO</Text>
            <Text style={[typography.body, styles.strong]}>{info.project}</Text>
          </View>
          <ListRow boxed icon="texture-box" overline="Superficie Total" title={info.surface} />
          <View style={styles.infoBox}>
            <View style={styles.inline}>
              <MaterialCommunityIcons name="sprout-outline" size={ms(14)} color={colors.textMuted} />
              <Text style={[typography.caption, styles.overline]}>ESPECIES CULTIVADAS</Text>
            </View>
            <Text style={[typography.bodySm, { color: colors.textMuted }]}>
              {info.species.map((s, i) => (
                <Text key={s.common}>
                  <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>{s.common}</Text>
                  <Text style={{ fontStyle: 'italic' }}> ({s.scientific})</Text>
                  {i < info.species.length - 1 ? ', ' : ''}
                </Text>
              ))}
            </Text>
          </View>
          <ListRow
            boxed
            icon="graph-outline"
            overline="Red Telemétrica"
            title={info.network}
            chevron
            onPress={() => navigation.navigate('Conectividad')}
            right={<View style={styles.onlineDot} />}
          />
        </Card>
      )}

      <Card style={styles.gap}>
        <CardHeader
          icon="bell-ring-outline"
          title="Preferencias de Notificaciones"
          subtitle="Alertas y frecuencias de monitoreo agronómico"
        />
        <ListRow
          title="Alertas críticas de sensores"
          subtitle="Suelo seco / Estrés hídrico severo"
          right={<Toggle value={notif.criticalAlerts} onChange={(v) => setNotif({ ...notif, criticalAlerts: v })} />}
        />
        <ListRow
          title="Tareas de cultivo asignadas"
          subtitle="Recordatorios de riego y poda"
          right={<Toggle value={notif.tasks} onChange={(v) => setNotif({ ...notif, tasks: v })} />}
        />
        <ListRow
          title="Reporte diario matutino"
          subtitle="Resumen de microclima a las 07:00"
          right={<Toggle value={notif.dailyReport} onChange={(v) => setNotif({ ...notif, dailyReport: v })} />}
        />
      </Card>

      <Card style={styles.gap}>
        <CardHeader icon="ruler-square" title="Unidades y Metrología" subtitle="Estándares para fórmulas agronómicas" />
        {unitRows.map((u) => (
          <ListRow
            key={u.id}
            boxed
            icon={u.icon}
            overline={u.label}
            title={u.value}
            chevron
            onPress={() => Alert.alert(u.label, 'Selector de unidades pendiente de definir con el equipo.')}
          />
        ))}
      </Card>

      <Card style={styles.gap}>
        <CardHeader icon="tune-variant" title="Apariencia y Sistema" subtitle="Parámetros de visualización y enlace local" />
        <ListRow
          boxed
          icon="white-balance-sunny"
          overline="Tema de Pantalla"
          title="Claro (Recomendado campo)"
          right={<Badge label="Activo" />}
        />
        <ListRow
          title="Modo Demostración / Simulado"
          subtitle={system.demoMode ? 'Datos simulados' : 'Conexión Real (ESP32 Gateway)'}
          right={<Toggle value={system.demoMode} onChange={(v) => setSystem({ ...system, demoMode: v })} />}
        />
        <ListRow
          title="Sincronización Offline"
          subtitle="Almacenar lecturas localmente en SQLite"
          right={<Toggle value={system.offlineSync} onChange={(v) => setSystem({ ...system, offlineSync: v })} />}
        />
      </Card>

      <Button label="Cerrar sesión universitaria" variant="dangerSoft" icon="logout" size="lg" onPress={confirmLogout} />

      <View style={styles.footer}>
        <View style={styles.inline}>
          <MaterialCommunityIcons name="school-outline" size={ms(14)} color={colors.textMuted} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>Invernadero Inteligente v{version}</Text>
        </View>
        <Text style={[typography.caption, styles.footerText]}>
          Build Académico • Depto. Horticultura & Microcontroladores
        </Text>
      </View>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  infoBox: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs },
  overline: { color: colors.textMuted, letterSpacing: 0.5 },
  strong: { color: colors.textPrimary, fontWeight: '600' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  footer: { alignItems: 'center', gap: spacing.xxs, paddingBottom: spacing.md },
  footerText: { color: colors.textMuted, fontWeight: '400', textAlign: 'center' },
});
