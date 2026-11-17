import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconBox } from './IconBox';
import { colors, spacing, typography } from '../../theme';
import type { IconName } from '../../types/common';

interface Props {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: React.ReactNode;
}

/** Encabezado estándar de tarjeta: ícono + título + subtítulo + elemento a la derecha. */
export function CardHeader({ title, subtitle, icon, right }: Props) {
  return (
    <View style={styles.row}>
      {icon && <IconBox name={icon} size={34} />}
      <View style={styles.texts}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[typography.caption, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Título de sección fuera de tarjeta ("EVENTOS RECIENTES", "Variables Ambientales"). */
export function SectionTitle({ title, right, caps }: { title: string; right?: React.ReactNode; caps?: boolean }) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          caps ? typography.label : typography.h2,
          { color: colors.textPrimary, flex: 1 },
          caps && { letterSpacing: 1, textTransform: 'uppercase' },
        ]}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  section: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
