import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { IconName, StatusLevel, Tone } from '../../types/common';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successBg, fg: colors.primaryDark },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.surfaceSunken, fg: colors.textMuted },
  info: { bg: colors.lime, fg: colors.primaryDark },
};

export const toneFromStatus = (s: StatusLevel): Tone =>
  s === 'normal' ? 'success' : s === 'warning' ? 'warning' : 'danger';

interface Props {
  label: string;
  tone?: Tone;
  dot?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}

/** Píldora de estado: "Normal", "Atención", "Conectado", "Lote Experimental A-1"… */
export function Badge({ label, tone = 'success', dot, icon, style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      {icon && <MaterialCommunityIcons name={icon} size={ms(13)} color={t.fg} />}
      <Text style={[typography.caption, { color: t.fg }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
