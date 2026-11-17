import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { BottomTabs } from './BottomTabs';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SensorDetailScreen } from '../screens/sensors/SensorDetailScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { NewActivityScreen } from '../screens/activities/NewActivityScreen';
import { ConnectivityScreen } from '../screens/network/ConnectivityScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Flujo:
 *   Login ──► Main (tabs: Inicio · Sensores · Control · Actividades · Perfil)
 *               ├─ SensorDetalle      (desde Sensores / Inicio)
 *               ├─ Notificaciones     (campana del header)
 *               ├─ RegistrarActividad (modal, desde Actividades)
 *               └─ Conectividad       (desde Perfil › Red Telemétrica)
 */
export function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      {user == null ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={BottomTabs} />
          <Stack.Screen name="SensorDetalle" component={SensorDetailScreen} />
          <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
          <Stack.Screen name="Conectividad" component={ConnectivityScreen} />
          <Stack.Screen
            name="RegistrarActividad"
            component={NewActivityScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
