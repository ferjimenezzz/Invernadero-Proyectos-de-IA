import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, Badge, Button, Card, IconBox } from '../common';
import { colors, ms, palette, radius, spacing, typography } from '../../theme';
import type { Activity, ActivityStatus } from '../../types/activities';
import type { IconName, Tone } from '../../types/common';

export const STATUS_META: Record<ActivityStatus, { label: string; tone: Tone; icon?: IconName }> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  enProceso: { label: 'En proceso', tone: 'success' },
  completada: { label: 'Completada', tone: 'success', icon: 'check-circle-outline' },
};

interface Props {
  activity: Activity;
  onComplete?: (id: string) => void;
}

/** Tarjeta de bitácora: estado, descripción, foto opcional, métrica opcional y responsable. */
export const ActivityCard = memo(function ActivityCard({ activity: a, onComplete }: Props) {
  const st = STATUS_META[a.status];
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <IconBox name={a.icon} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.caption, { color: colors.primaryDark, letterSpacing: 0.5 }]} numberOfLines={1}>
            {a.location}
          </Text>
          <Text style={[typography.bodySm, { color: colors.textMuted }]}>{a.when}</Text>
        </View>
        <Badge label={st.label} tone={st.tone} dot={!st.icon} icon={st.icon} />
      </View>

      <Text style={[typography.h2, styles.title]}>{a.title}</Text>
      <Text style={[typography.bodySm, { color: colors.textMuted }]}>{a.description}</Text>

      {(a.imageUrl || a.hasEvidence) && (
        <View style={styles.photo}>
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="sprout" size={ms(44)} color={palette.green300} />
          </View>
          {a.imageUrl && <Image source={{ uri: a.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          <View style={styles.photoTag}>
            <MaterialCommunityIcons name="camera-outline" size={ms(13)} color={colors.onPrimary} />
            <Text style={[typography.caption, { color: colors.onPrimary }]}>Evidencia fotográfica</Text>
          </View>
        </View>
      )}

      {a.growth && (
        <View style={styles.growth}>
          <View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{a.growth.label}</Text>
            <Text style={[typography.h2, { color: colors.primaryDark, fontWeight: '700' }]}>{a.growth.value}</Text>
          </View>
          <View style={styles.bars}>
            {a.growth.bars.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: ms(30) * h,
                    backgroundColor: i === a.growth!.bars.length - 1 ? colors.primary : palette.green300,
                    opacity: i === a.growth!.bars.length - 1 ? 1 : 0.4 + i * 0.15,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Avatar initials={a.assignee.initials} color={a.assignee.color} size={28} />
        <Text style={[typography.bodySm, styles.person]} numberOfLines={1}>
          {a.assignee.name} ({a.assignee.role})
        </Text>
        {a.status === 'pendiente' && onComplete ? (
          <Button label="Marcar completada" icon="check" size="sm" onPress={() => onComplete(a.id)} />
        ) : a.status === 'enProceso' ? (
          <View style={styles.running}>
            <MaterialCommunityIcons name="loading" size={ms(14)} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>Ejecutando</Text>
          </View>
        ) : (
          a.footerNote && <Text style={[typography.caption, { color: colors.textMuted }]}>{a.footerNote}</Text>
        )}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  title: { color: colors.textPrimary },
  photo: {
    height: ms(140),
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  photoPlaceholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  photoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    margin: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  growth: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  bar: { width: ms(12), borderRadius: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  person: { flex: 1, color: colors.textPrimary, fontWeight: '500' },
  running: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
