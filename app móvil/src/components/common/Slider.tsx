import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, ms } from '../../theme';

const THUMB = ms(22);
const TRACK = ms(8);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const snap = (v: number, step: number) => Math.round(v / step) * step;

interface CommonProps {
  min: number;
  max: number;
  step?: number;
  style?: ViewStyle;
  trackColor?: string;
  fillColor?: string;
  /** Llamado al soltar (para enviar al backend sin saturarlo). */
  onRelease?: () => void;
}

interface SingleProps extends CommonProps {
  value: number;
  onChange: (v: number) => void;
}

interface RangeProps extends CommonProps {
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** Distancia mínima entre ambos pulgares. */
  minGap?: number;
}

/** Hook interno: convierte posición x ↔ valor. */
function useScale(min: number, max: number, step: number) {
  const [width, setWidth] = useState(0);
  const usable = Math.max(1, width - THUMB);
  const toX = (v: number) => ((v - min) / (max - min)) * usable;
  const toValue = (x: number) => clamp(snap(min + (x / usable) * (max - min), step), min, max);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return { width, toX, toValue, onLayout };
}

/** Slider de un pulgar (Atenuación PWM). Sin dependencias externas. */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  style,
  trackColor = colors.surfaceSunken,
  fillColor = colors.primary,
  onRelease,
}: SingleProps) {
  const { width, toX, toValue, onLayout } = useScale(min, max, step);
  const start = useRef(0);
  const ref = useRef({ value, onChange, onRelease, toX, toValue });
  ref.current = { value, onChange, onRelease, toX, toValue };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX - THUMB / 2;
          const v = ref.current.toValue(x);
          start.current = ref.current.toX(v);
          ref.current.onChange(v);
        },
        onPanResponderMove: (_, g) => ref.current.onChange(ref.current.toValue(start.current + g.dx)),
        onPanResponderRelease: () => ref.current.onRelease?.(),
      }),
    [],
  );

  const x = width ? toX(value) : 0;
  return (
    <View
      style={[styles.wrap, style]}
      onLayout={onLayout}
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]} />
      <View style={[styles.fill, { width: x + THUMB / 2, backgroundColor: fillColor }]} />
      <View style={[styles.thumb, styles.thumbDark, { left: x }]} />
    </View>
  );
}

/** Slider de rango con dos pulgares (Mínimo / Máximo consigna). */
export function RangeSlider({
  low,
  high,
  onChange,
  min,
  max,
  step = 1,
  minGap = step,
  style,
  trackColor = colors.surface,
  fillColor = colors.primary,
  onRelease,
}: RangeProps) {
  const { width, toX, toValue, onLayout } = useScale(min, max, step);
  const active = useRef<'low' | 'high'>('low');
  const start = useRef(0);
  const ref = useRef({ low, high, onChange, onRelease, toX, toValue, minGap });
  ref.current = { low, high, onChange, onRelease, toX, toValue, minGap };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const r = ref.current;
          const x = e.nativeEvent.locationX - THUMB / 2;
          // Se mueve el pulgar más cercano al toque.
          active.current = Math.abs(x - r.toX(r.low)) <= Math.abs(x - r.toX(r.high)) ? 'low' : 'high';
          start.current = r.toX(active.current === 'low' ? r.low : r.high);
        },
        onPanResponderMove: (_, g) => {
          const r = ref.current;
          const v = r.toValue(start.current + g.dx);
          if (active.current === 'low') r.onChange(Math.min(v, r.high - r.minGap), r.high);
          else r.onChange(r.low, Math.max(v, r.low + r.minGap));
        },
        onPanResponderRelease: () => ref.current.onRelease?.(),
      }),
    [],
  );

  const xl = width ? toX(low) : 0;
  const xh = width ? toX(high) : 0;
  return (
    <View
      style={[styles.wrap, style]}
      onLayout={onLayout}
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: `${low} a ${high}` }}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]} />
      <View style={[styles.fill, { left: xl + THUMB / 2, width: xh - xl, backgroundColor: fillColor }]} />
      <View style={[styles.thumb, styles.thumbRing, { left: xl }]} />
      <View style={[styles.thumb, styles.thumbRing, { left: xh }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: THUMB + 12, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: TRACK,
    borderRadius: TRACK / 2,
  },
  fill: { position: 'absolute', height: TRACK, borderRadius: TRACK / 2, left: 0 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  thumbDark: { backgroundColor: colors.primaryDark },
  thumbRing: {
    backgroundColor: colors.primaryDark,
    borderWidth: ms(5),
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
