import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { IconName } from '../../types/common';

interface Props {
  title: string;
  subtitle?: string;
  /** Etiqueta pequeña encima del título (estilo "Temperatura" → "Celsius (°C)"). */
  overline?: string;
  icon?: IconName;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  boxed?: boolean;
}

/** Fila genérica de configuración / lista. */
export function ListRow({ title, subtitle, overline, icon, right, chevron, onPress, boxed }: Props) {
  const content = (
    <>
      {icon && <MaterialCommunityIcons name={icon} size={ms(20)} color={colors.textMuted} />}
      <View style={styles.texts}>
        {overline && <Text style={[typography.caption, { color: colors.textMuted }]}>{overline}</Text>}
        <Text style={[typography.body, styles.title]}>{title}</Text>
        {subtitle && <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '400' }]}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && <MaterialCommunityIcons name="chevron-right" size={ms(20)} color={colors.textSecondary} />}
    </>
  );
  const style = [styles.row, boxed && styles.boxed];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  boxed: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  texts: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontWeight: '500' },
});
