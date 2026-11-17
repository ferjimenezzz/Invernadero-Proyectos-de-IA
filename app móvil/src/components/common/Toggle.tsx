import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, ms, palette } from '../../theme';
import type { IconName } from '../../types/common';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  /** Ícono opcional dentro del pulgar (como en las tarjetas de actuadores). */
  icon?: IconName;
  size?: 'md' | 'lg';
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Interruptor animado con el verde corporativo (iOS y Android se ven igual). */
export function Toggle({ value, onChange, icon, size = 'md', disabled, accessibilityLabel }: Props) {
  const W = ms(size === 'lg' ? 68 : 50);
  const H = ms(size === 'lg' ? 40 : 30);
  const PAD = 3;
  const THUMB = H - PAD * 2;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, anim]);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [palette.gray300, colors.primary] });
  const x = anim.interpolate({ inputRange: [0, 1], outputRange: [PAD, W - THUMB - PAD] });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, { width: W, height: H, borderRadius: H / 2, backgroundColor: bg }]}>
        <Animated.View
          style={[styles.thumb, { width: THUMB, height: THUMB, borderRadius: THUMB / 2, left: x }]}
        >
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={THUMB * 0.55}
              color={value ? colors.primary : colors.textSecondary}
            />
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { justifyContent: 'center' },
  thumb: {
    position: 'absolute',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
