/**
 * Paleta extraída (aproximada) del diseño de Figma del Invernadero Inteligente.
 * Todos los componentes deben consumir estos tokens, nunca hex sueltos.
 */
export const palette = {
  // Verde corporativo
  green900: '#0B3D2E', // texto sobre fondos menta, tooltip
  green700: '#0F5A45', // primario: botones, chip activo, línea de gráfica
  green500: '#2E7D5B', // íconos de estado, links
  green300: '#7FBFA3',
  green100: '#CFEBDD', // fondo de badges "Normal", "Conectado"
  green50: '#EAF6F0', // banda de confort de la gráfica
  lime200: '#D9F2A9', // badge "Activo", ícono de lámparas

  // Neutros / fondos
  white: '#FFFFFF',
  gray25: '#F7F9F8', // fondo de la app
  gray50: '#F1F4F3', // tarjeta hero, tarjeta de riego
  gray100: '#E8ECEA', // stat tiles, cajas de info, segmentado
  gray300: '#C9D0CD',
  gray500: '#6B7570', // texto secundario
  gray700: '#3C4541',
  gray900: '#141A17', // texto principal

  // Estados
  amber100: '#FDF0C8', // badge "Atención"
  amber700: '#8A5A00',
  rust50: '#FDF1EC', // fondo ícono humedad de suelo
  rust600: '#B5472B', // alertas / umbral mínimo
  rust800: '#7A2E1C', // valor crítico (68 %)
  red50: '#FBE3DF', // panel de seguridad / alerta alta
  red700: '#B3261E', // botón Kill Switch
  red500: '#E5484D', // contador de notificaciones
} as const;

export const colors = {
  background: palette.gray25,
  surface: palette.white,
  surfaceMuted: palette.gray50,
  surfaceSunken: palette.gray100,
  border: palette.gray100,

  primary: palette.green700,
  primaryDark: palette.green900,
  primarySoft: palette.green100,
  primaryTint: palette.green50,
  onPrimary: palette.white,

  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textMuted: palette.gray700,

  success: palette.green500,
  successBg: palette.green100,
  warning: palette.amber700,
  warningBg: palette.amber100,
  danger: palette.rust600,
  dangerStrong: palette.rust800,
  dangerBg: palette.rust50,
  dangerSoft: palette.red50,
  emergency: palette.red700,
  warningSoft: '#FCE9D7',
  lime: palette.lime200,
  overlay: 'rgba(11, 61, 46, 0.35)',
  badge: palette.red500,

  chartLine: palette.green700,
  chartBand: palette.green50,
  chartGrid: palette.gray300,
} as const;

export type ColorToken = keyof typeof colors;
