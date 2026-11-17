import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { IconName } from '../../types/common';

type Tone = 'neutral' | 'mint' | 'warning' | 'danger';

const TONES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  neutral: { bg: colors.surfaceSunken, fg: colors.textMuted, icon: colors.textMuted },
  mint: { bg: colors.primaryTint, fg: colors.primaryDark, icon: colors.primary },
  warning: { bg: colors.warningSoft, fg: colors.dangerStrong, icon: colors.danger },
  danger: { bg: colors.dangerSoft, fg: colors.emergency, icon: colors.emergency },
};

interface Props {
  text: string;
  icon?: IconName;
  tone?: Tone;
  /** Valor resaltado a la derecha ("Actual: 38%", "ACTIVO"). */
  right?: string;
  style?: ViewStyle;
}

/** Caja informativa con ícono. Se usa en casi todas las pantallas. */
export function InfoNote({ text, icon = 'information-outline', tone = 'neutral', right, style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }, style]}>
      <MaterialCommunityIcons name={icon} size={ms(18)} color={t.icon} />
      <Text style={[typography.bodySm, styles.text, { color: t.fg }]}>{text}</Text>
      {right && <Text style={[typography.label, { color: t.fg }]}>{right}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  text: { flex: 1, fontWeight: '500' },
});
