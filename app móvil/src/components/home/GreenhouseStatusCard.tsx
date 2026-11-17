import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card, IconBox } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { GreenhouseStatus, IconName } from '../../types/home';

interface StatProps {
  icon: IconName;
  value: string;
  label: string;
  color?: string;
}

/** Mini-celda de estadística (Sensores en línea, Alertas, Última lectura). */
function StatTile({ icon, value, label, color = colors.textPrimary }: StatProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={styles.tileTop}>
        <MaterialCommunityIcons name={icon} size={ms(15)} color={color} />
        <Text style={[typography.label, { color }]}>{value}</Text>
      </View>
      <Text style={[typography.caption, styles.tileLabel]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function GreenhouseStatusCard({ status }: { status: GreenhouseStatus }) {
  const { message } = status;
  return (
    <Card>
      <View style={styles.header}>
        <IconBox name="leaf" round size={38} />
        <View style={styles.headerText}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Estado del invernadero</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{status.cycle}</Text>
        </View>
        <Badge label={status.condition} dot style={styles.condition} />
      </View>

      <View style={styles.stats}>
        <StatTile
          icon="access-point"
          value={`${status.sensorsOnline} / ${status.sensorsTotal}`}
          label="Sensores en línea"
        />
        <StatTile
          icon="alarm-light-outline"
          value={String(status.preventiveAlerts)}
          label={status.preventiveAlerts === 1 ? 'Alerta preventiva' : 'Alertas preventivas'}
          color={status.preventiveAlerts > 0 ? colors.danger : colors.textPrimary}
        />
        <StatTile icon="clock-outline" value={`${status.lastReadingMinutes} min`} label="Última lectura" />
      </View>

      <View style={styles.info}>
        <MaterialCommunityIcons name="information-outline" size={ms(18)} color={colors.textMuted} />
        <Text style={[typography.bodySm, styles.infoText]}>
          {message.text}
          {message.highlight && <Text style={styles.bold}>{message.highlight}</Text>}
          {message.suffix}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, minWidth: 0 },
  condition: { maxWidth: ms(112), alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tileLabel: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxs },
  info: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoText: { flex: 1, color: colors.textMuted },
  bold: { fontWeight: '700', color: colors.textPrimary },
});
