import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet, Button, IconBox, RangeSlider, SectionTitle } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { SensorDetail } from '../../types/sensors';

interface Props {
  visible: boolean;
  config: SensorDetail['thresholdEditor'];
  onClose: () => void;
  onSave: (min: number, max: number) => Promise<void>;
}

const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));

/** Hoja "Ajuste de Umbrales" con slider de rango y automatizaciones. */
export function ThresholdSheet({ visible, config, onClose, onSave }: Props) {
  const [low, setLow] = useState(config.min);
  const [high, setHigh] = useState(config.max);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setLow(config.min);
      setHigh(config.max);
    }
  }, [visible, config.min, config.max]);

  const margin = ((high - low) * 0.1).toFixed(1);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(low, high);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <IconBox name="thermometer-lines" size={34} background={colors.primaryTint} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>{config.title}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{config.subtitle}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
          <MaterialCommunityIcons name="close" size={ms(20)} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.rangeBox}>
        <View style={styles.rangeHead}>
          <View>
            <Text style={[typography.caption, styles.overline]}>MÍNIMO CONSIGNA</Text>
            <Text style={[typography.h1, styles.bigValue]}>
              {fmt(low, config.step)} {config.unit}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[typography.caption, styles.overline]}>MÁXIMO CONSIGNA</Text>
            <Text style={[typography.h1, styles.bigValue]}>
              {fmt(high, config.step)} {config.unit}
            </Text>
          </View>
        </View>

        <RangeSlider
          low={low}
          high={high}
          min={config.scaleMin}
          max={config.scaleMax}
          step={config.step}
          minGap={config.step * 2}
          onChange={(l, h) => {
            setLow(l);
            setHigh(h);
          }}
          style={{ marginVertical: spacing.md }}
        />

        <View style={styles.scale}>
          <Text style={[typography.caption, styles.scaleText]}>
            Escala: {config.scaleMin} {config.unit}
          </Text>
          <Text style={[typography.caption, styles.scaleText]}>
            Margen Seguro: ±{margin}
            {config.unit}
          </Text>
          <Text style={[typography.caption, styles.scaleText]}>
            {config.scaleMax} {config.unit}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        <SectionTitle title="Automatizaciones asociadas" caps />
      </View>
      <View style={{ gap: spacing.sm }}>
        {config.automations.map((a) => (
          <View key={a.id} style={styles.automation}>
            <IconBox name={a.icon} size={34} background={colors.surface} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySm, { color: colors.textPrimary, fontWeight: '600' }]}>{a.title}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{a.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        label="Guardar Parámetros en Nodo ESP32"
        icon="chip"
        size="lg"
        loading={saving}
        onPress={save}
        style={{ marginTop: spacing.xl }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  close: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeBox: { backgroundColor: colors.primaryTint, borderRadius: radius.lg, padding: spacing.lg },
  rangeHead: { flexDirection: 'row', justifyContent: 'space-between' },
  overline: { color: colors.textMuted, letterSpacing: 0.6 },
  bigValue: { color: colors.primaryDark, fontWeight: '700' },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { color: colors.textMuted, fontWeight: '500' },
  automation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
