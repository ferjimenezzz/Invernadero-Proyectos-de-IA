import { TextStyle } from 'react-native';
import { ms } from './metrics';
import { colors } from './colors';

/**
 * Escala tipográfica. El diseño usa una sans geométrica (tipo Inter).
 * Si cargas Inter con expo-font, cambia `family` aquí y se aplica a toda la app.
 */
const family = {
  regular: undefined as string | undefined, // 'Inter_400Regular'
  medium: undefined as string | undefined, // 'Inter_500Medium'
  bold: undefined as string | undefined, // 'Inter_700Bold'
};

export const typography = {
  display: { fontSize: ms(34), fontWeight: '700', letterSpacing: -0.5, fontFamily: family.bold },
  h1: { fontSize: ms(26), fontWeight: '600', lineHeight: ms(32), fontFamily: family.medium },
  h2: { fontSize: ms(21), fontWeight: '600', lineHeight: ms(26), fontFamily: family.medium },
  h3: { fontSize: ms(17), fontWeight: '600', fontFamily: family.medium },
  body: { fontSize: ms(15), lineHeight: ms(21), fontFamily: family.regular },
  bodySm: { fontSize: ms(13), lineHeight: ms(18), fontFamily: family.regular },
  label: { fontSize: ms(13), fontWeight: '600', letterSpacing: 0.3, fontFamily: family.medium },
  caption: { fontSize: ms(11.5), fontWeight: '600', letterSpacing: 0.4, fontFamily: family.medium },
  unit: { fontSize: ms(14), fontWeight: '400', fontFamily: family.regular },
} satisfies Record<string, TextStyle>;

export const textColor = {
  primary: { color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
  muted: { color: colors.textMuted },
};
