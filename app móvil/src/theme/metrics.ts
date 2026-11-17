import { Dimensions, PixelRatio } from 'react-native';

/** Ancho de referencia del frame de Figma (iPhone 13/14). */
const BASE_WIDTH = 390;

const { width } = Dimensions.get('window');
const ratio = Math.min(width, 600) / BASE_WIDTH; // se limita para tablets

/** Escala lineal según el ancho de pantalla. */
export const scale = (size: number) => PixelRatio.roundToNearestPixel(size * ratio);

/** Escala suavizada (recomendada para fuentes y paddings). */
export const ms = (size: number, factor = 0.4) =>
  PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);

export const spacing = {
  xxs: ms(2),
  xs: ms(4),
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(20),
  xxl: ms(24),
  xxxl: ms(32),
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const;
