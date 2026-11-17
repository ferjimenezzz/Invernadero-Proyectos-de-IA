import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SensorsScreen } from '../screens/sensors/SensorsScreen';
import { ActuatorsScreen } from '../screens/control/ActuatorsScreen';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { colors, ms } from '../theme';
import type { IconName } from '../types/common';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, IconName> = {
  Inicio: 'sprout-outline',
  Sensores: 'access-point',
  Control: 'lightning-bolt-outline',
  Actividades: 'format-list-checks',
  Perfil: 'account-cog-outline',
};

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color, focused }) => (
          <MaterialCommunityIcons name={ICONS[route.name]} size={ms(focused ? 26 : 24)} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Sensores" component={SensorsScreen} />
      <Tab.Screen name="Control" component={ActuatorsScreen} />
      <Tab.Screen name="Actividades" component={ActivitiesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    height: ms(64) + 8,
    paddingTop: 8,
  },
  label: { fontSize: ms(11.5), fontWeight: '500' },
});
