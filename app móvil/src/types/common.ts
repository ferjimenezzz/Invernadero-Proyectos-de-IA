import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type StatusLevel = 'normal' | 'warning' | 'critical';

/** Tonos de color reutilizados por Badge, tarjetas de reglas, notificaciones… */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
