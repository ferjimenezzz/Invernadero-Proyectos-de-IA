import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../home/AppHeader';
import { Avatar, Badge } from '../common';
import { useAuth } from '../../context/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { mockNotifications } from '../../data/mockModules';
import { colors, ms, radius, spacing, typography } from '../../theme';

interface BaseProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Contenido fijo bajo el scroll (botones de guardar, etc.). */
  footer?: React.ReactNode;
  scroll?: boolean;
}

/** Envoltura responsiva: centra el contenido y limita el ancho en tablets. */
function Body({ children, refreshing, onRefresh, scroll = true }: BaseProps) {
  const { gutter, contentMaxWidth } = useResponsive();
  const inner = <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>{children}</View>;
  if (!scroll) return <View style={[styles.flex, { paddingHorizontal: gutter }]}>{inner}</View>;
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {inner}
    </ScrollView>
  );
}

function HeaderBar({ children }: { children: React.ReactNode }) {
  const { gutter, contentMaxWidth } = useResponsive();
  return (
    <View style={[styles.headerWrap, { paddingHorizontal: gutter }]}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

/** Pantallas de pestaña: header con logo, conexión, campana y avatar. */
export function TabScreenLayout(props: BaseProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const unread = mockNotifications.filter((n) => !n.read).length;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar>
        <AppHeader
          title="Invernadero Inteligente"
          subtitle="Univ. • Hierbas Aromáticas"
          connected
          unread={unread}
          avatarUrl={user?.avatarUrl}
          onPressNotifications={() => navigation.navigate('Notificaciones')}
          onPressAvatar={() => navigation.navigate('Main', { screen: 'Perfil' })}
        />
      </HeaderBar>
      <Body {...props} />
      {props.footer}
    </SafeAreaView>
  );
}

interface StackProps extends BaseProps {
  title: string;
}

/** Pantallas de detalle: flecha atrás + título + estado de conexión. */
export function StackScreenLayout({ title, ...props }: StackProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar>
        <View style={styles.stackHeader}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Regresar">
            <MaterialCommunityIcons name="arrow-left" size={ms(24)} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="sprout" size={ms(16)} color={colors.onPrimary} />
          </View>
          <Text style={[typography.h3, styles.stackTitle]} numberOfLines={1}>
            {title}
          </Text>
          <Badge label="Conectado" dot />
          <Avatar uri={user?.avatarUrl} initials="SR" size={34} />
        </View>
      </HeaderBar>
      <Body {...props} />
      {props.footer}
    </SafeAreaView>
  );
}

/** Píldora "← Sensores" + etiqueta a la derecha (debajo del header de detalle). */
export function BackPill({ label, right }: { label: string; right?: React.ReactNode }) {
  const navigation = useNavigation();
  return (
    <View style={styles.pillRow}>
      <Pressable onPress={() => navigation.goBack()} style={styles.pill} accessibilityRole="button">
        <MaterialCommunityIcons name="arrow-left" size={ms(16)} color={colors.textPrimary} />
        <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '500' }]}>{label}</Text>
      </Pressable>
      {right}
    </View>
  );
}

export const layoutStyles = StyleSheet.create({
  stack: { gap: spacing.lg },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inner: { width: '100%', alignSelf: 'center', gap: spacing.lg },
  scroll: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  stackHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logo: {
    width: ms(28),
    height: ms(28),
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackTitle: { flex: 1, color: colors.textPrimary },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
