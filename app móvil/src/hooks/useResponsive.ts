import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints fluidos. Se recalculan al rotar o al cambiar tamaño (tablets / web).
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmall = width < 360;

  /** Columnas para la cuadrícula de variables ambientales. */
  const metricColumns = width >= 1024 ? 4 : isTablet ? 3 : 2;

  /** Ancho máximo del contenido para que no se estire en tablets. */
  const contentMaxWidth = isTablet ? 820 : width;

  /** Padding horizontal de la pantalla. */
  const gutter = isSmall ? 12 : isTablet ? 24 : 16;

  return { width, height, isTablet, isSmall, metricColumns, contentMaxWidth, gutter };
}
