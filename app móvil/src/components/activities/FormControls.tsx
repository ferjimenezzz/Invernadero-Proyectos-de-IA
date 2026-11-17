import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { IconName } from '../../types/common';

/** Etiqueta de campo: "Tipo de actividad *" + texto auxiliar a la derecha. */
export function FieldLabel({
  label,
  required,
  optional,
  hint,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={[typography.body, styles.label]}>
        {label}
        {required && <Text style={{ color: colors.danger }}> *</Text>}
        {optional && <Text style={[typography.caption, { color: colors.textMuted }]}> (Opcional)</Text>}
      </Text>
      {hint && <Text style={[typography.caption, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

export interface TileOption<T extends string> {
  value: T;
  title: string;
  subtitle: string;
  icon: IconName;
  /** Ocupa toda la fila (ej. "Mantenimiento"). */
  wide?: boolean;
}

/** Selector en cuadrícula con tarjetas (Riego, Inspección, Medición…). */
export function TileSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: TileOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.tiles} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[styles.tile, o.wide && styles.tileWide, active && styles.tileActive]}
          >
            <View style={[styles.tileIcon, active && { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name={o.icon} size={ms(18)} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySm, { color: colors.textPrimary, fontWeight: '600' }]}>{o.title}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
                {o.subtitle}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Campo tipo "select" que abre una hoja inferior con opciones. */
export function SelectField({
  icon,
  value,
  options,
  onChange,
  title,
  overline,
  style,
}: {
  icon: IconName;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  title: string;
  overline?: string;
  style?: object;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.field, style]} accessibilityRole="button">
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon} size={ms(20)} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          {overline && <Text style={[typography.caption, { color: colors.textMuted }]}>{overline}</Text>}
          <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
            {current?.label ?? 'Seleccionar'}
          </Text>
        </View>
        {!overline && <MaterialCommunityIcons name="chevron-down" size={ms(20)} color={colors.textMuted} />}
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.md }]}>{title}</Text>
        {options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              onChange(o.id);
              setOpen(false);
            }}
            style={[styles.option, o.id === value && styles.optionActive]}
          >
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{o.label}</Text>
            {o.id === value && <MaterialCommunityIcons name="check" size={ms(20)} color={colors.primary} />}
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}

/** Área de texto con contador de caracteres. */
export function TextArea({
  value,
  onChangeText,
  placeholder,
  maxLength = 500,
  showCount,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  maxLength?: number;
  showCount?: boolean;
}) {
  return (
    <View style={styles.textArea}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={maxLength}
        textAlignVertical="top"
        style={[typography.body, styles.input]}
      />
      {showCount && (
        <Text style={[typography.caption, styles.count]}>{value.length} caracteres</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48.8%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tileWide: { width: '100%' },
  tileActive: { backgroundColor: colors.primarySoft },
  tileIcon: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: ms(56),
  },
  fieldIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  optionActive: { backgroundColor: colors.primaryTint },
  textArea: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  input: { minHeight: ms(80), color: colors.textPrimary, padding: 0 },
  count: { alignSelf: 'flex-end', color: colors.textMuted, marginTop: spacing.xs },
});
