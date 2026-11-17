import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, ms, radius, spacing, typography } from '../../theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Punto de color antes del texto (p. ej. naranja en "Con alertas"). */
  dot?: string;
}

interface Props<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

/** Fila desplazable de filtros: "Todos (5)", "En línea (5)", "Con alertas (1)"… */
export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.active]}
          >
            {o.dot && <View style={[styles.dot, { backgroundColor: o.dot }]} />}
            <Text style={[typography.label, { color: active ? colors.onPrimary : colors.textPrimary, fontWeight: '500' }]}>
              {o.label}
              {o.count != null ? ` (${o.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: ms(14),
    paddingVertical: ms(8),
  },
  active: { backgroundColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
