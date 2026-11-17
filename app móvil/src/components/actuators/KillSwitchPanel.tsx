import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';

interface Props {
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

/** Panel rojo "Seguridad Operativa" con confirmación antes del corte total. */
export function KillSwitchPanel({ onConfirm, loading }: Props) {
  const ask = () =>
    Alert.alert(
      '¿Detener todo?',
      'Se cortarán bombas, focos y relés de 220V de inmediato.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Detener', style: 'destructive', onPress: () => void onConfirm() },
      ],
      { cancelable: true },
    );

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="alert-outline" size={ms(22)} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.emergency }]}>Seguridad Operativa</Text>
          <Text style={[typography.caption, { color: colors.emergency }]}>
            Desconexión física inmediata ante desbordes, fugas o fallo eléctrico.
          </Text>
        </View>
      </View>
      <Button label="Detener Todo (Kill Switch)" variant="danger" icon="alert" size="lg" loading={loading} onPress={ask} />
      <Text style={[typography.caption, styles.note]}>Corte de emergencia de bombas, focos y relés de 220V</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.dangerSoft, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { color: colors.emergency, textAlign: 'center', fontWeight: '500' },
});
