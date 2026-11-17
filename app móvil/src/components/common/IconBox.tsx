import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, radius } from '../../theme';
import type { IconName } from '../../types/home';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  background?: string;
  round?: boolean;
}

/** Ícono dentro de un cuadro redondeado (tarjetas de métricas, estado, riego). */
export function IconBox({
  name,
  size = 40,
  color = colors.primaryDark,
  background = colors.surfaceSunken,
  round = false,
}: Props) {
  const box = ms(size);
  return (
    <View
      style={[
        styles.box,
        { width: box, height: box, backgroundColor: background, borderRadius: round ? box / 2 : radius.md },
      ]}
    >
      <MaterialCommunityIcons name={name} size={box * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
