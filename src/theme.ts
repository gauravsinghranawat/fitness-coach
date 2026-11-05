import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F5F1',
  card: '#FFFFFF',
  text: '#16181D',
  muted: '#646A73',
  border: '#E3E1DA',
  accent: '#1F7A55',
  accentText: '#FFFFFF',
  accentSoft: '#E3F1EA',
  danger: '#B3261E',
  inputBg: '#FBFAF7',
};

const dark: typeof light = {
  bg: '#101214',
  card: '#1A1D21',
  text: '#ECEDEE',
  muted: '#9BA1A9',
  border: '#2B2F35',
  accent: '#3FB37F',
  accentText: '#0B1F15',
  accentSoft: '#173326',
  danger: '#F2B8B5',
  inputBg: '#15181B',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
