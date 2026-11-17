import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, ms, spacing, typography } from '../../theme';

export function LoadingState() {
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name="cloud-alert-outline" size={ms(40)} color={colors.textSecondary} />
      <Text style={[typography.body, styles.text]}>{message ?? 'No se pudieron cargar los datos'}</Text>
      {onRetry && <Button label="Reintentar" variant="secondary" size="sm" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({ text, icon = 'magnify' }: { text: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name={icon} size={ms(36)} color={colors.textSecondary} />
      <Text style={[typography.body, styles.text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', paddingVertical: ms(60), gap: spacing.md },
  text: { color: colors.textSecondary, textAlign: 'center' },
});
