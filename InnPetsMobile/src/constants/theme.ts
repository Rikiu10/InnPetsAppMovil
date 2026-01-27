import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#ee7320',      // Tu Naranja
  primaryLight: '#f18844',
  secondary: '#e94c50',
  white: '#FFFFFF',
  black: '#000000',
  background: '#f8f9fa',
  textDark: '#2c3e50',
  textLight: '#7f8c8d',
  border: '#e0e0e0',
  success: '#27ae60',
  danger: '#e74c3c',
  warning: '#f39c12',
};

export const FONTS = {
  bold: 'FredokaOne_400Regular',
  regular: 'OpenSans_400Regular',
  semiBold: 'OpenSans_600SemiBold',
};

export const SIZES = {
  width,
  height,
  base: 10,
  h1: 32,
  h2: 24,
  h3: 18,
  body: 14,
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
};