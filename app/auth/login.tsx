import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, spacing } from '@/lib/responsive';
import { Validators } from '@/lib/validators';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, Pattern, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PATTERN_SIZE = 60;

type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Login() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const ref = useRef<TextInput>(null);
  const { setAuth, clearAuth } = useAuthStore();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Background pattern animation
  const patternAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animated background pattern
    Animated.loop(
      Animated.timing(patternAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onChange = (t: string) => {
    const value = t.replace(/[^0-9]/g, '').slice(0, 5);  // Server expects exactly 5 digits
    setCodigo(value);
    setErrorMessage('');
    setStatus('idle');
    
    if (value.length === 5) {
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      });
    }
  };

  const onLogin = async () => {
  const validationResult = Validators.validateAccessCode(codigo);
  const validationError = validationResult.valid ? null : validationResult.error;
    if (validationError) {
      setErrorMessage(validationError);
      setStatus('error');
      shake();
      ref.current?.focus();
      return;
    }

    setLoading(true);
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await authApi.login(codigo);
      
      await setAuth(res.token, res.tecnico);
      console.log('[LOGIN] Auth guardado, token:', res.token.substring(0, 20) + '...');
      
      // Verificar que el token se guardó correctamente
      const storedToken = await AsyncStorage.getItem('@saderh:token');
      if (!storedToken || storedToken !== res.token) {
        console.error('[LOGIN] ❌ Token no se guardó correctamente');
        throw new Error('Error guardando sesión. Intenta de nuevo.');
      }
      console.log('[LOGIN] ✅ Token guardado y verificado');
      
      setStatus('success');
      if (res.offline) {
        setErrorMessage('Modo offline: sesión local iniciada. Verás los datos guardados en este dispositivo.');
      }
      
      setTimeout(() => {
        router.replace('/tabs/dashboard');
      }, 500);
    } catch (e: any) {
      const errorMsg = e.message ?? 'Código incorrecto';
      setErrorMessage(errorMsg);
      setStatus('error');
      
      // Si el error es de conexión, mostrar sugerencia
      if (errorMsg.includes('conexión') || errorMsg.includes('internet') || errorMsg.includes('servidor')) {
        setErrorMessage(errorMsg + '. Verifica tu conexión a internet e intenta de nuevo.');
      }
      
      // Si el error es de validación (Zod o similar), simplificar el mensaje
      if (errorMsg.includes('pattern') || errorMsg.includes('format')) {
        setErrorMessage('Formato de código inválido. Debe ser exactamente 5 dígitos.');
      }
      
      // Solo limpiar sesión si el error es de autenticación
      if (errorMsg.includes('autenticación') || errorMsg.includes('401') || errorMsg.includes('token')) {
        await clearAuth();
      }
      
      shake();
      setCodigo('');
      setTimeout(() => ref.current?.focus(), 300);
    } finally {
      setLoading(false);
    }
  };

  const isCodeValid = codigo.length === 5 && /^\d+$/.test(codigo);
  const isLoadingLocal = loading || status === 'loading';

  return (
    <SafeAreaView style={s.safe}>
      {/* Background Pattern */}
      <View style={s.backgroundContainer}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={s.backgroundSvg}>
          <Defs>
            <Pattern id="dots" width={PATTERN_SIZE} height={PATTERN_SIZE} patternUnits="userSpaceOnUse">
              <Circle cx={PATTERN_SIZE/2} cy={PATTERN_SIZE/2} r={1.5} fill="rgba(255,255,255,0.08)" />
            </Pattern>
            <Pattern id="diagonal" width={20} height={20} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Rect width={10} height={20} fill="rgba(255,255,255,0.03)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dots)" />
          <Rect width="100%" height="100%" fill="url(#diagonal)" />
        </Svg>
        
        {/* Gradient Overlay */}
        <View style={s.gradientTop} />
        <View style={s.gradientBottom} />
        
      {/* Decorative Circles */}
      <Animated.View style={[s.decorCircle1, { transform: [{ scale: pulseAnim }] }]} />
      <Animated.View style={[s.decorCircle2, { opacity: fadeAnim }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[s.head, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoContainer}>
              <View style={s.logoCircle}>
                <Text style={s.logoIcon}>🌾</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text style={s.gov}>GOBIERNO DEL ESTADO DE HIDALGO</Text>
              </Animated.View>
            </View>
            <Text style={s.title}>SADERH</Text>
            <Text style={s.sub}>Sistema de Gestión de Campo</Text>
          </Animated.View>

          <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }]}>
            {/* Decorative top border */}
            <View style={s.cardAccent} />
            
            <View style={s.cardHeader}>
              <View style={s.iconContainer}>
                <Text style={s.iconText}>🔐</Text>
              </View>
              <Text style={s.cardTitle}>Bienvenido</Text>
              <Text style={s.cardDesc}>Ingresa tu código de acceso de 5 dígitos</Text>
            </View>

            <View style={s.inputSection}>
              <Text style={s.lbl}>Código de Acceso</Text>
              
              <TouchableOpacity 
                style={[s.dotsContainer, status === 'error' && s.dotsError]} 
                onPress={() => ref.current?.focus()} 
                activeOpacity={0.8}
              >
                {[0,1,2,3,4].map(i => (
                  <View key={i} style={s.dotWrapper}>
                    <View style={[
                      s.dot, 
                      i < codigo.length && s.dotFilled,
                      codigo.length === 5 && i === codigo.length - 1 && s.dotLast,
                      status === 'error' && s.dotError,
                    ]}>
                      {i < codigo.length && (
                        <Animated.View style={[s.dotInner, status === 'success' && s.dotInnerSuccess]} />
                      )}
                    </View>
                    {i === codigo.length && codigo.length < 5 && (
                      <View style={s.cursor} />
                    )}
                  </View>
                ))}
              </TouchableOpacity>

              <TextInput
                ref={ref}
                value={codigo}
                onChangeText={onChange}
                maxLength={5}
                style={s.hiddenInput}
                keyboardType="number-pad"
                caretHidden
                autoFocus
                textContentType="oneTimeCode"
              />

              {errorMessage ? (
                <Animated.View style={s.errorContainer}>
                  <Text style={s.errorIcon}>⚠️</Text>
                  <Text style={s.errorText}>{errorMessage}</Text>
                </Animated.View>
              ) : null}

              {status === 'loading' && (
                <View style={s.loadingContainer}>
                  <ActivityIndicator color={Colors.guinda} size="small" />
                  <Text style={s.loadingText}>Verificando credenciales...</Text>
                </View>
              )}

              {status === 'success' && (
                <Animated.View style={s.successContainer}>
                  <Text style={s.successIcon}>✓</Text>
                  <Text style={s.successText}>Autenticación exitosa</Text>
                </Animated.View>
              )}
            </View>

            <TouchableOpacity 
              style={[
                s.btn, 
                (!isCodeValid || isLoadingLocal) && s.btnDisabled
              ]} 
              onPress={onLogin} 
              disabled={!isCodeValid || isLoadingLocal}
              activeOpacity={0.8}
            >
              {/* Glow effect */}
              {isCodeValid && !isLoadingLocal && <View style={s.btnGlow} />}
              
              <View style={s.btnContent}>
                {isLoadingLocal ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={s.btnIcon}>→</Text>
                    <Text style={s.btnT}>Entrar</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={s.forgot} 
              onPress={() => {
                Alert.alert(
                  '¿Olvidaste tu código?',
                  'Contacta a tu coordinador o al soporte técnico de SADERH.',
                  [{ text: 'Entendido', style: 'default' }]
                );
              }}
            >
              <Text style={s.forgotT}>¿Olvidaste tu Código de acceso?</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[s.footer, { opacity: fadeAnim }]}>
            <Text style={s.footerText}>Secretaría de Agricultura de Hidalgo</Text>
            <Text style={s.footerVersion}>Versión {Constants?.expoConfig?.version || '1.0.0'}</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.guinda },
  
  // Background decorative elements
  backgroundContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  backgroundSvg: { position: 'absolute', top: 0, left: 0 },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(179,142,93,0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingTop: spacing.xl, zIndex: 1 },
  head: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: 'rgba(179,142,93,0.5)',
  },
  logoIcon: { fontSize: 36 },
  gov: { fontSize: 10, fontWeight: '700', color: Colors.dorado, letterSpacing: 2.5, marginBottom: 8 },
  title: { fontSize: 52, fontWeight: '900', color: Colors.white, letterSpacing: 6, marginBottom: 4 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 8 },
  statusDotDemo: { backgroundColor: Colors.warning },
  statusText: { fontSize: 12, color: Colors.white, fontWeight: '500' },
  
  card: { 
    backgroundColor: Colors.white, 
    borderRadius: 28, 
    padding: 28, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 30, 
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(179,142,93,0.2)',
    overflow: 'hidden',
  },
  // Decorative border accent
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.guinda,
  },
  cardHeader: { alignItems: 'center', marginBottom: 28 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.guindaAlpha, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText: { fontSize: 28 },
  cardTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  
  inputSection: { marginBottom: 24 },
  lbl: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 14, marginLeft: 4 },
  dotsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 20, 
    marginBottom: 16,
    paddingVertical: 20,
  },
  dotsError: { borderColor: Colors.danger },
  dotWrapper: { position: 'relative' },
  dot: { 
    width: 52, height: 52, 
    borderRadius: 26, 
    borderWidth: 2.5, 
    borderColor: Colors.gray300, 
    backgroundColor: Colors.white, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dotFilled: { borderColor: Colors.guinda, backgroundColor: Colors.guinda, borderWidth: 0 },
  dotLast: { borderColor: Colors.dorado, borderWidth: 2.5 },
  dotError: { borderColor: Colors.danger, borderWidth: 2.5 },
  dotInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white },
  dotInnerSuccess: { backgroundColor: Colors.success },
  cursor: { 
    position: 'absolute', 
    width: 2, height: 24, 
    backgroundColor: Colors.guinda, 
    right: -10, top: 14,
    opacity: 0.8,
  },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.dangerLight, 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 16 
  },
  errorIcon: { fontSize: 16, marginRight: 8 },
  errorText: { flex: 1, fontSize: 13, color: Colors.danger, fontWeight: '500' },
  
  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.infoLight, 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 16 
  },
  loadingText: { marginLeft: 10, fontSize: 13, color: Colors.info, fontWeight: '500' },
  
  successContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.successLight, 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 16 
  },
  successIcon: { fontSize: 16, color: Colors.success, fontWeight: '800' },
  successText: { marginLeft: 8, fontSize: 13, color: Colors.success, fontWeight: '500' },
  
  btn: { 
    backgroundColor: Colors.guinda, 
    borderRadius: 16, 
    padding: 18, 
    alignItems: 'center', 
    marginBottom: 16,
    shadowColor: Colors.guinda,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.dorado,
    opacity: 0.3,
  },
  btnDisabled: { 
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnIcon: { fontSize: 18, marginRight: 8, color: Colors.white },
  btnT: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  
  forgot: { alignItems: 'center', marginBottom: 20 },
  forgotT: { color: Colors.guinda, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  
  demo: { 
    backgroundColor: Colors.warning + '20', 
    borderRadius: 14, 
    padding: 16, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  demoIcon: { fontSize: 18, marginBottom: 8 },
  demoT: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center' },
  demoC: { fontWeight: '800', color: Colors.guinda },
  
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' },
  footerVersion: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4 },
});
