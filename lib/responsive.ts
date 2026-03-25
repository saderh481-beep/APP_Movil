/**
 * SADERH — Sistema de Responsividad
 * Escala proporcional para todos los tamaños de pantalla Android
 *
 * Basado en un diseño de referencia de 375x812 (iPhone-equivalent / Pixel base)
 * Funciona en: small (4"), medium (5-6"), large (6.5"+), tablets
 */
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Dimensiones base de diseño (referencia)
const BASE_W = 375;
const BASE_H = 812;

// Escala horizontal — para anchos, padding horizontal, iconos
export const rw = (size: number): number => {
  const scale = W / BASE_W;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

// Escala vertical — para alturas, padding vertical, márgenes
export const rh = (size: number): number => {
  const scale = H / BASE_H;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

// Escala moderada — para tipografía (evita texto demasiado grande en tablets)
// factor 0.5 = 50% de escala, más conservador que rw
export const rf = (size: number, factor = 0.45): number => {
  const scale = W / BASE_W;
  const newSize = size + (size * scale - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Clasificación de pantalla
export const screen = {
  width: W,
  height: H,
  isSmall: W < 360,      // Galaxy A series pequeños, Moto E
  isMedium: W >= 360 && W < 414,  // Pixel, Samsung S series
  isLarge: W >= 414,     // Samsung Note, Plus sizes
  isTablet: W >= 600,    // Tablets Android
  isDesktop: W >= 1024,  // Desktop/EScritorio
  isLandscape: W > H,    // Modo paisaje
};

// Espaciado responsivo
export const spacing = {
  xs: rw(4),
  sm: rw(8),
  md: rw(12),
  lg: rw(16),
  xl: rw(20),
  xxl: rw(24),
  xxxl: rw(32),
  xxxxl: rw(48),
};

// Tipografía responsiva
export const fontSize = {
  xs: rf(10),
  sm: rf(12),
  md: rf(14),
  base: rf(15),
  lg: rf(16),
  xl: rf(18),
  xxl: rf(20),
  xxxl: rf(22),
  display: rf(24),
  hero: rf(32),
  giant: rf(46),
};

// Bordes responsivos
export const radius = {
  sm: rw(8),
  md: rw(10),
  lg: rw(14),
  xl: rw(16),
  xxl: rw(22),
  full: rw(999),
};

// Tamaños de componentes
export const size = {
  avatar: rw(48),
  avatarLg: rw(68),
  avatarXl: rw(82),
  icon: rw(20),
  iconSm: rw(16),
  tabBar: Platform.OS === 'android' ? rh(58) : rh(80),
  headerBtn: rw(44),
  dot: rw(46),
  dotSm: rw(32),
  switchW: rw(52),
  switchH: rh(28),
  switchThumb: rw(24),
  saludBtn: rw(40),
  fotoPreview: rw(90),
};