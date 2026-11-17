import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconBox } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { MeshNode, TelemetryMode } from '../../types/network';

/** Selector Modo Demo / Modo Real (dos tarjetas grandes). */
export function ModeSwitch({ value, onChange }: { value: TelemetryMode; onChange: (m: TelemetryMode) => void }) {
  const opts: { v: TelemetryMode; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; sub: string }[] = [
    { v: 'demo', icon: 'flask-outline', title: 'Modo Demo', sub: 'Datos simulados' },
    { v: 'real', icon: 'lightning-bolt-outline', title: 'Modo Real', sub: 'REST / WebSocket' },
  ];
  return (
    <View style={styles.modeWrap} accessibilityRole="radiogroup">
      {opts.map((o) => {
        const active = o.v === value;
        const fg = active ? colors.onPrimary : colors.textPrimary;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[styles.mode, active && styles.modeActive]}
          >
            <View style={styles.modeTitle}>
              <MaterialCommunityIcons name={o.icon} size={ms(18)} color={fg} />
              <Text style={[typography.body, { color: fg, fontWeight: '600' }]}>{o.title}</Text>
              {active && <View style={styles.liveDot} />}
            </View>
            <Text style={[typography.caption, { color: active ? colors.primarySoft : colors.textMuted }]}>{o.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Caja de dato técnico (Dirección IP, MAC…). */
export function TechTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.6 }]}>{label}</Text>
      <Text style={[typography.bodySm, styles.mono]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '500' }]}>{caption}</Text>
    </View>
  );
}

/** Fila de nodo en la red malla. */
export function MeshNodeRow({ node }: { node: MeshNode }) {
  return (
    <View style={styles.node}>
      <IconBox name={node.icon} size={40} background={colors.primarySoft} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.inline}>
          <Text style={[typography.bodySm, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
            {node.name}
          </Text>
          {node.healthy && <MaterialCommunityIcons name="check-circle-outline" size={ms(15)} color={colors.primaryDark} />}
        </View>
        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {node.detail}
        </Text>
      </View>
      <View style={[styles.nodeBadge, { backgroundColor: node.badgeTone === 'lime' ? colors.lime : colors.primarySoft }]}>
        <Text style={[typography.caption, { color: colors.primaryDark }]}>{node.badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modeWrap: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.xs },
  mode: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.md, borderRadius: radius.sm },
  modeActive: { backgroundColor: colors.primary },
  modeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  tile: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs },
  mono: { fontFamily: 'monospace', color: colors.textPrimary, fontWeight: '700' },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nodeBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 1 },
});
