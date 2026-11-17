import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, IconBox } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { AppNotification, NotificationKind } from '../../types/notifications';

const KIND: Record<NotificationKind, { bg: string; fg: string; iconBg: string }> = {
  advertencia: { bg: colors.warningBg, fg: colors.warning, iconBg: colors.warningBg },
  red: { bg: colors.primarySoft, fg: colors.primaryDark, iconBg: colors.primarySoft },
  critica: { bg: colors.dangerSoft, fg: colors.emergency, iconBg: colors.dangerSoft },
  actividad: { bg: colors.primarySoft, fg: colors.primaryDark, iconBg: colors.primarySoft },
};

/** Convierte **negrita** y `código` en <Text> con estilos. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Text style={[typography.bodySm, { color: colors.textMuted, lineHeight: ms(21) }]}>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700', color: colors.textPrimary }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('`') ? (
          <Text key={i} style={styles.code}>
            {' '}
            {p.slice(1, -1)}{' '}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

interface Props {
  item: AppNotification;
  onAction: (item: AppNotification, action: NonNullable<AppNotification['actions']>[number]['action']) => void;
}

export const NotificationCard = memo(function NotificationCard({ item, onAction }: Props) {
  const k = KIND[item.kind];
  return (
    <Card variant={item.read ? 'muted' : 'elevated'} style={styles.card}>
      <View style={styles.row}>
        <IconBox name={item.icon} size={44} background={k.iconBg} color={k.fg} />
        <View style={styles.body}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: k.bg }]}>
              <Text style={[typography.caption, { color: k.fg, letterSpacing: 0.6 }]}>{item.tag}</Text>
            </View>
            {!!item.time && (
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
                {item.kind === 'critica' ? '' : '• '}
                {item.time}
              </Text>
            )}
            {item.read ? (
              <View style={styles.readTag}>
                <MaterialCommunityIcons name="check" size={ms(13)} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>Leída</Text>
              </View>
            ) : (
              <View style={styles.unreadDot} accessibilityLabel="No leída" />
            )}
          </View>

          <Text style={[typography.body, styles.title]}>{item.title}</Text>
          <RichText text={item.body} />

          {item.detail && (
            <View style={styles.detail}>
              {item.detail.map((d) => (
                <View key={d.text} style={styles.detailItem}>
                  <MaterialCommunityIcons name={d.icon} size={ms(14)} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted, flexShrink: 1 }]}>{d.text}</Text>
                  {d.value && <Text style={[typography.caption, { color: colors.danger }]}>{d.value}</Text>}
                </View>
              ))}
            </View>
          )}

          {item.resolution && (
            <View style={styles.resolution}>
              <MaterialCommunityIcons name="check-circle-outline" size={ms(14)} color={colors.primaryDark} />
              <Text style={[typography.caption, { color: colors.primaryDark, flex: 1 }]}>{item.resolution}</Text>
            </View>
          )}

          {item.actions && (
            <View style={styles.actions}>
              {item.actions.map((a) => (
                <Button
                  key={a.label}
                  label={a.label}
                  icon={a.icon}
                  size="sm"
                  variant={a.primary ? 'primary' : a.icon === 'check' ? 'ghost' : 'secondary'}
                  onPress={() => onAction(item, a.action)}
                />
              ))}
            </View>
          )}

          <Text style={[typography.caption, styles.footer]}>{item.footer}</Text>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, minWidth: 0, gap: spacing.sm },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  readTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  title: { color: colors.textPrimary, fontWeight: '700' },
  code: {
    fontFamily: 'monospace',
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    fontSize: ms(12),
  },
  detail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flexShrink: 1, gap: spacing.xs },
  resolution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { color: colors.textMuted, fontWeight: '400' },
});
