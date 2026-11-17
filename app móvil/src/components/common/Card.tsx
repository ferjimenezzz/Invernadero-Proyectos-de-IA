import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme';

type Variant = 'elevated' | 'muted' | 'sunken';

interface Props extends ViewProps {
  variant?: Variant;
  padded?: boolean;
}

/** Contenedor base de todas las tarjetas de la app. */
export function Card({ variant = 'elevated', padded = true, style, children, ...rest }: Props) {
  return (
    <View style={[styles.base, styles[variant], padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.xl, overflow: 'hidden' },
  padded: { padding: spacing.xl },
  elevated: { backgroundColor: colors.surface, ...shadow.card },
  muted: { backgroundColor: colors.surfaceMuted },
  sunken: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md },
});
