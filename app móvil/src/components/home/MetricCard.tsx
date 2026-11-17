import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, IconBox, toneFromStatus } from '../common';
import { colors, ms, radius, shadow, spacing, typography } from '../../theme';
import type { MetricReading } from '../../types/home';

const STATUS_LABEL = { normal: 'Normal', warning: 'Atención', critical: 'Crítico' } as const;

interface Props {
  metric: MetricReading;
  style?: ViewStyle;
  onPress?: (m: MetricReading) => void;
}

/** Tarjeta de variable ambiental (temperatura, humedad, luz…). */
export const MetricCard = memo(function MetricCard({ metric, style, onPress }: Props) {
  const alert = metric.status !== 'normal';
  const valueColor = alert ? colors.dangerStrong : colors.textPrimary;
  const footColor = metric.footnote.tone === 'danger' ? colors.danger : colors.primaryDark;

  return (
    <Pressable
      onPress={() => onPress?.(metric)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`${metric.label}: ${metric.value} ${metric.unit}, ${STATUS_LABEL[metric.status]}`}
    >
      <View style={styles.top}>
        <IconBox
          name={metric.icon}
          size={38}
          color={alert ? colors.danger : colors.primaryDark}
          background={alert ? colors.dangerBg : colors.surfaceSunken}
        />
        <Badge label={STATUS_LABEL[metric.status]} tone={toneFromStatus(metric.status)} />
      </View>

      <Text style={[typography.bodySm, styles.label]} numberOfLines={1}>
        {metric.label}
      </Text>

      <View style={styles.valueRow}>
        <Text
          style={[typography.display, { color: valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {metric.value}
        </Text>
        <Text style={[typography.unit, { color: alert ? colors.danger : colors.textSecondary }]}>
          {metric.unit}
        </Text>
      </View>

      <View style={styles.foot}>
        <MaterialCommunityIcons name={metric.footnote.icon} size={ms(14)} color={footColor} />
        <Text style={[typography.caption, { color: footColor, flex: 1 }]} numberOfLines={1}>
          {metric.footnote.text}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { color: colors.textMuted, marginTop: spacing.lg },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xxs },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
});
