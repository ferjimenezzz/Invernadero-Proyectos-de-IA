import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { ChartPoint } from '../../types/home';

interface Props {
  points: ChartPoint[];
  unit: string;
  bandMin: number;
  bandMax: number;
  xLabels: string[];
  height?: number;
  /** Línea punteada horizontal (umbral de riego). */
  threshold?: number;
  thresholdLabel?: string;
  /** Texto de la banda; por defecto "BANDA CONFORT: min - max". */
  bandLabel?: string;
}

const PAD_TOP = 44; // espacio para el tooltip
const PAD_BOTTOM = 10;

/** Curva suave Catmull-Rom → Bézier cúbica. */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Gráfica de línea responsiva con banda de confort, área degradada y tooltip.
 * Toca o arrastra sobre la gráfica para inspeccionar un punto.
 */
export function LineChart({
  points,
  unit,
  bandMin,
  bandMax,
  xLabels,
  height = ms(220),
  threshold,
  thresholdLabel,
  bandLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const maxIndex = useMemo(
    () => points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0),
    [points],
  );
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected ?? maxIndex;

  const geo = useMemo(() => {
    if (!width || points.length === 0) return null;
    const values = points.map((p) => p.value);
    const extra = threshold != null ? [threshold] : [];
    const min = Math.min(...values, bandMin, ...extra) - 1;
    const max = Math.max(...values, bandMax, ...extra) + 1;
    const x = (i: number) => (i / (points.length - 1)) * width;
    const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * (height - PAD_TOP - PAD_BOTTOM);
    const xy = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
    const line = smoothPath(xy);
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return {
      xy,
      line,
      area,
      bandTop: y(bandMax),
      bandBottom: y(bandMin),
      thresholdY: threshold != null ? y(threshold) : null,
    };
  }, [width, height, points, bandMin, bandMax, threshold]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pick = (e: GestureResponderEvent) => {
    if (!width) return;
    const i = Math.round((e.nativeEvent.locationX / width) * (points.length - 1));
    setSelected(Math.max(0, Math.min(points.length - 1, i)));
  };

  const activePt = geo?.xy[active];
  const TOOLTIP_W = ms(128);

  return (
    <View>
      <View
        style={{ height }}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        accessible
        accessibilityLabel={`Gráfica. Valor seleccionado ${points[active]?.value} ${unit} a las ${points[active]?.label}`}
      >
        {geo && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.chartLine} stopOpacity={0.18} />
                <Stop offset="1" stopColor={colors.chartLine} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            <Rect
              x={0}
              y={geo.bandTop}
              width={width}
              height={geo.bandBottom - geo.bandTop}
              fill={colors.chartBand}
            />
            {[geo.bandBottom, (geo.bandBottom + height) / 2].map((gy) => (
              <Line
                key={gy}
                x1={0}
                x2={width}
                y1={gy}
                y2={gy}
                stroke={colors.chartGrid}
                strokeDasharray="4 5"
                strokeWidth={1}
              />
            ))}

            {geo.thresholdY != null && (
              <Line
                x1={0}
                x2={width}
                y1={geo.thresholdY}
                y2={geo.thresholdY}
                stroke={colors.danger}
                strokeDasharray="6 5"
                strokeWidth={1.6}
              />
            )}

            <Path d={geo.area} fill="url(#area)" />
            <Path d={geo.line} stroke={colors.chartLine} strokeWidth={3} fill="none" strokeLinecap="round" />

            {activePt && (
              <>
                <Line
                  x1={activePt.x}
                  x2={activePt.x}
                  y1={activePt.y}
                  y2={height}
                  stroke={colors.chartLine}
                  strokeOpacity={0.25}
                />
                <Circle cx={activePt.x} cy={activePt.y} r={7} fill={colors.surface} stroke={colors.chartLine} strokeWidth={3} />
              </>
            )}
          </Svg>
        )}

        {geo && (
          <Text style={[typography.caption, styles.bandLabel, { top: geo.bandTop + 6 }]}>
            {bandLabel ?? `BANDA CONFORT: ${bandMin}${unit} - ${bandMax}${unit}`}
          </Text>
        )}

        {geo?.thresholdY != null && thresholdLabel && (
          <Text style={[typography.caption, styles.thresholdLabel, { top: geo.thresholdY - ms(16) }]}>
            {thresholdLabel}
          </Text>
        )}

        {activePt && (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                width: TOOLTIP_W,
                top: Math.max(0, activePt.y - ms(46)),
                left: Math.min(Math.max(0, activePt.x - TOOLTIP_W / 2), width - TOOLTIP_W),
              },
            ]}
          >
            <View style={styles.tooltipDot} />
            <Text style={styles.tooltipText} numberOfLines={1}>
              {points[active].label}: {points[active].value} {unit}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.xAxis}>
        {xLabels.map((l) => (
          <Text key={l} style={[typography.caption, { color: colors.textMuted }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bandLabel: { position: 'absolute', left: spacing.sm, color: colors.success, fontWeight: '500' },
  thresholdLabel: { position: 'absolute', left: spacing.xs, color: colors.danger, fontWeight: '500' },
  tooltip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
  },
  tooltipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.onPrimary },
  tooltipText: { color: colors.onPrimary, fontSize: ms(12), fontWeight: '600' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
