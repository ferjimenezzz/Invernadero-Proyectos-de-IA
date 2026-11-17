import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

/** Pestañas inferiores (barra principal). */
export type TabParamList = {
  Inicio: undefined;
  Sensores: undefined;
  Control: undefined;
  Actividades: undefined;
  Perfil: undefined;
};

/** Stack raíz: pestañas + pantallas que se abren encima de ellas. */
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  SensorDetalle: { sensorId: string };
  Notificaciones: undefined;
  RegistrarActividad: undefined;
  Conectividad: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/** Props de una pestaña que también puede navegar al stack raíz. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Permite useNavigation() tipado en toda la app sin genéricos.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
