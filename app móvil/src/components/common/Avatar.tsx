import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, ms } from '../../theme';

interface Props {
  initials?: string;
  uri?: string;
  size?: number;
  color?: string;
}

/** Foto de usuario o iniciales sobre círculo verde ("CM", "SR"…). */
export function Avatar({ initials = '?', uri, size = 32, color = colors.primary }: Props) {
  const s = ms(size);
  if (uri) return <Image source={{ uri }} style={{ width: s, height: s, borderRadius: s / 2 }} />;
  return (
    <View style={[styles.circle, { width: s, height: s, borderRadius: s / 2, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize: s * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.onPrimary, fontWeight: '700' },
});
