import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius, spacing } from '../../theme';
import type { IconName } from '../../types/common';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft' | 'light';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.surfaceSunken, fg: colors.primaryDark },
  ghost: { bg: 'transparent', fg: colors.primaryDark },
  danger: { bg: colors.emergency, fg: colors.onPrimary },
  dangerSoft: { bg: colors.dangerSoft, fg: colors.emergency },
  light: { bg: colors.surface, fg: colors.textPrimary },
};

const SIZES: Record<Size, { py: number; px: number; font: number; icon: number }> = {
  sm: { py: ms(7), px: ms(12), font: ms(13), icon: ms(16) },
  md: { py: ms(11), px: ms(16), font: ms(14.5), icon: ms(18) },
  lg: { py: ms(15), px: ms(20), font: ms(16), icon: ms(20) },
};

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: ViewStyle;
}

/** Botón único de la app: todas las variantes del diseño salen de aquí. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  block,
  style,
}: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, paddingVertical: s.py, paddingHorizontal: s.px },
        block && styles.block,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={s.icon} color={v.fg} />}
          <Text style={[styles.label, { color: v.fg, fontSize: s.font }]} numberOfLines={2}>
            {label}
          </Text>
          {iconRight && <MaterialCommunityIcons name={iconRight} size={s.icon} color={v.fg} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  block: { alignSelf: 'stretch' },
  label: { fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
