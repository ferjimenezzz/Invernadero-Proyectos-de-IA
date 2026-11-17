import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from '../common';
import { colors, ms, radius, spacing, typography } from '../../theme';

interface Props {
  title: string;
  subtitle: string;
  connected: boolean;
  unread: number;
  avatarUrl?: string;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
}

/** Barra superior fija: logo, nombre, estado de conexión, campana y avatar. */
export function AppHeader({
  title,
  subtitle,
  connected,
  unread,
  avatarUrl,
  onPressNotifications,
  onPressAvatar,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="sprout" size={ms(20)} color={colors.onPrimary} />
      </View>

      <View style={styles.titles}>
        <Text style={[typography.h3, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[typography.caption, styles.subtitle]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <Badge
        label={connected ? 'Conectado' : 'Sin conexión'}
        tone={connected ? 'success' : 'danger'}
        dot
        style={styles.status}
      />

      <Pressable
        onPress={onPressNotifications}
        hitSlop={10}
        accessibilityLabel={`Notificaciones, ${unread} sin leer`}
        style={styles.bell}
      >
        <MaterialCommunityIcons name="bell-outline" size={ms(24)} color={colors.textPrimary} />
        {unread > 0 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Pressable onPress={onPressAvatar} accessibilityLabel="Perfil">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <MaterialCommunityIcons name="account" size={ms(22)} color={colors.primary} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const AVATAR = ms(40);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  logo: {
    width: ms(34),
    height: ms(34),
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textMuted, fontWeight: '500' },
  status: { alignSelf: 'center' },
  bell: { padding: spacing.xs },
  counter: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { color: colors.onPrimary, fontSize: 10, fontWeight: '700' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
