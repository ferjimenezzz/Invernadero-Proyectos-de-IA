import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme';

interface Props {
  data: number[];
  height?: number;
  color?: string;
  /** Rellena el área bajo la curva con un degradado. */
  area?: boolean;
  /** Dibuja un punto en el último valor. */
  endDot?: boolean;
  style?: ViewStyle;
}

/** Mini-gráfica de tendencia para tarjetas de sensores y del dashboard. */
export function Sparkline({ data, height = 36, color = colors.chartLine, area, endDot, style }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const id = useMemo(() => `sp${Math.random().toString(36).slice(2, 8)}`, []);

  const geo = useMemo(() => {
    if (!width || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = 4;
    const pts = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (width - pad * 2),
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
    }
    const last = pts[pts.length - 1];
    return { d, area: `${d} L ${last.x} ${height} L ${pts[0].x} ${height} Z`, last };
  }, [data, width, height]);

  return (
    <View style={[{ height }, style]} onLayout={onLayout}>
      {geo && (
        <Svg width={width} height={height}>
          {area && (
            <>
              <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={geo.area} fill={`url(#${id})`} />
            </>
          )}
          <Path d={geo.d} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          {endDot && <Circle cx={geo.last.x} cy={geo.last.y} r={3.5} fill={color} />}
        </Svg>
      )}
    </View>
  );
}
