import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge, Card, IconBox, InfoNote, SegmentedControl, Slider, Toggle } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { Actuator, FanLevel } from '../../types/actuators';

interface Props {
  actuator: Actuator;
  onToggle: (id: string, on: boolean) => void;
  onPwmChange?: (id: string, pwm: number) => void;
  onPwmCommit?: (id: string) => void;
  onFanLevel?: (id: string, level: FanLevel) => void;
  onExtend?: (id: string) => void;
}

const ICON_BG = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  lime: { bg: colors.lime, fg: colors.primaryDark },
  dark: { bg: colors.primaryDark, fg: colors.onPrimary },
} as const;

const FAN_OPTIONS: { value: FanLevel; label: string }[] = [
  { value: 'off', label: 'Apagado' },
  { value: 'low', label: 'Bajo' },
  { value: 'high', label: 'Alto' },
];

/**
 * Tarjeta polimórfica de actuador. Comparte cabecera (ícono + nombre + toggle)
 * y cambia el cuerpo según `kind`: bomba (temporizador), lámpara (PWM), extractor (nivel).
 */
export function ActuatorCard({ actuator: a, onToggle, onPwmChange, onPwmCommit, onFanLevel, onExtend }: Props) {
  const ib = ICON_BG[a.iconBg];
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconBox name={a.icon} size={48} background={ib.bg} color={ib.fg} />
        <View style={styles.titles}>
          <Text style={[typography.body, styles.name]} numberOfLines={2}>
            {a.name}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: a.on ? colors.success : colors.textSecondary }]} />
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '500', flex: 1 }]} numberOfLines={2}>
              {a.on ? a.statusText : 'Apagado'}
            </Text>
          </View>
        </View>
        {a.kind === 'fan' ? (
          <Badge label={a.tempBadge} icon="thermometer" />
        ) : (
          <Toggle
            value={a.on}
            onChange={(v) => onToggle(a.id, v)}
            icon={a.toggleIcon}
            size="lg"
            accessibilityLabel={a.name}
          />
        )}
      </View>

      {a.kind === 'pump' && (
        <View style={styles.chips}>
          <View style={[styles.chip, styles.chipStrong]}>
            <MaterialCommunityIcons name="timer-sand" size={ms(16)} color={colors.primaryDark} />
            <Text style={[typography.label, { color: colors.primaryDark }]}>{a.remaining} restantes</Text>
          </View>
          <View style={styles.chip}>
            <MaterialCommunityIcons name="clock-plus-outline" size={ms(16)} color={colors.textMuted} />
            <Text
              style={[typography.label, { color: colors.textMuted, fontWeight: '500' }]}
              onPress={() => onExtend?.(a.id)}
              suppressHighlighting
            >
              + 5 min extra
            </Text>
          </View>
        </View>
      )}

      {a.kind === 'light' && (
        <View style={{ gap: spacing.xs }}>
          <View style={styles.pwmHead}>
            <MaterialCommunityIcons name="tune-variant" size={ms(16)} color={colors.textMuted} />
            <Text style={[typography.bodySm, { color: colors.textMuted, flex: 1, fontWeight: '500' }]}>Atenuación PWM</Text>
            <Text style={[typography.h3, { color: colors.primaryDark }]}>{a.pwm}%</Text>
          </View>
          <Slider
            value={a.pwm}
            min={0}
            max={100}
            step={5}
            onChange={(v) => onPwmChange?.(a.id, v)}
            onRelease={() => onPwmCommit?.(a.id)}
          />
          <View style={styles.scale}>
            {['0% (Eco)', '50%', '100% (Floración)'].map((l) => (
              <Text key={l} style={[typography.caption, { color: colors.textMuted, fontWeight: '500' }]}>
                {l}
              </Text>
            ))}
          </View>
        </View>
      )}

      {a.kind === 'fan' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.bodySm, { color: colors.textMuted, fontWeight: '500' }]}>Nivel de Flujo de Aire</Text>
          <SegmentedControl
            options={FAN_OPTIONS}
            value={a.level}
            onChange={(lvl) => onFanLevel?.(a.id, lvl)}
          />
        </View>
      )}

      <InfoNote icon={a.rule.icon} text={a.rule.text} right={a.rule.value} tone="mint" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1, minWidth: 0, gap: spacing.xxs },
  name: { color: colors.textPrimary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipStrong: { backgroundColor: colors.primarySoft },
  pwmHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
});
