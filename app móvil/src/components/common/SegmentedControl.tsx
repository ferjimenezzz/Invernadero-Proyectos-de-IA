import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, ms, radius, spacing, typography } from '../../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 'tabs' = fondo gris con pestaña blanca; 'chips' = píldora verde sólida. */
  variant?: 'tabs' | 'chips';
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'tabs',
  style,
}: Props<T>) {
  const isTabs = variant === 'tabs';
  return (
    <View style={[isTabs ? styles.tabsWrap : styles.chipsWrap, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              isTabs ? styles.tab : styles.chip,
              active && (isTabs ? styles.tabActive : styles.chipActive),
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                typography.label,
                { color: active ? (isTabs ? colors.primaryDark : colors.onPrimary) : colors.textMuted },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: ms(9),
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.surface },
  chipsWrap: { flexDirection: 'row', gap: spacing.xs },
  chip: { paddingHorizontal: ms(12), paddingVertical: ms(5), borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.primary },
});
