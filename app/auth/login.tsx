import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { asignacionesApi, authApi, getConnectionInfo } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const ref = useRef<TextInput>(null);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setIsDemoMode(cfg.modoDemo))
      .catch(() => {});
  }, []);

  const onChange = (t: string) => {
    const value = t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
    setCodigo(value);
    if (value.length === 5) ref.current?.blur();
  };

  const onLogin = async () => {
    if (codigo.length !== 5) { Alert.alert('Código inválido', 'Debe tener exactamente 5 caracteres'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(codigo);
      await setAuth(res.token, res.usuario, res.token === 'demo-token-saderh-local');
      if (!isDemoMode) {
        // Verifica conexión real y que el técnico tenga asignaciones visibles en servidor
        await asignacionesApi.listar(false);
      }
      router.replace('/tabs/dashboard');
    } catch (e: any) {
      await clearAuth();
      Alert.alert('Acceso denegado', e.message ?? 'Código incorrecto');
      setCodigo(''); ref.current?.focus();
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.head}>
            <Text style={s.gov}>GOBIERNO DEL ESTADO DE HIDALGO</Text>
            <Text style={s.title}>SADERH</Text>
            <Text style={s.sub}>Sistema de Gestión de Campo</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Iniciar Sesión</Text>
            <Text style={s.cardDesc}>Ingresa tu código de acceso de 5 caracteres</Text>
            <TouchableOpacity style={s.dots} onPress={() => ref.current?.focus()} activeOpacity={0.9}>
              {[0,1,2,3,4].map(i => (
                <View key={i} style={[s.dot, i < codigo.length && s.dotOn, i === codigo.length && s.dotCur]}>
                  {i < codigo.length && <View style={s.dotIn} />}
                </View>
              ))}
            </TouchableOpacity>
            <TextInput ref={ref} value={codigo} onChangeText={onChange} maxLength={5} style={s.hidden} caretHidden autoFocus autoCapitalize="characters" />
            <Text style={s.lbl}>Código de Acceso</Text>
            <TouchableOpacity style={s.display} onPress={() => ref.current?.focus()}>
              <Text style={[s.displayT, !codigo && s.displayPH]}>{codigo ? '•'.repeat(codigo.length).padEnd(5, '_') : '_  _  _  _  _'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, (loading || codigo.length < 5) && s.dis]} onPress={onLogin} disabled={loading || codigo.length < 5}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnT}>Entrar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.forgot} onPress={() => Alert.alert('¿Olvidaste tu código?', 'Contacta a tu coordinador o al soporte técnico de SADERH.', [{ text: 'Entendido' }])}>
              <Text style={s.forgotT}>¿Olvidaste tu Código de acceso?</Text>
            </TouchableOpacity>
            {isDemoMode && <View style={s.demo}><Text style={s.demoT}>Modo Demo · código: <Text style={s.demoC}>00000</Text></Text></View>}
          </View>
          <Text style={s.footer}>Secretaría de Agricultura de Hidalgo</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.guinda },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  head: { alignItems: 'center', marginBottom: 32 },
  gov: { fontSize: 9, fontWeight: '700', color: Colors.dorado, letterSpacing: 2, marginBottom: 10 },
  title: { fontSize: 46, fontWeight: '900', color: Colors.white, letterSpacing: 4 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 22, elevation: 14 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 24 },
  dot: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: Colors.guinda, backgroundColor: Colors.guinda },
  dotCur: { borderColor: Colors.guinda, borderStyle: 'dashed' },
  dotIn: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.white },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  lbl: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  display: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 16, backgroundColor: Colors.gray50, marginBottom: 20 },
  displayT: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 10, textAlign: 'center' },
  displayPH: { color: Colors.gray300, fontWeight: '400', fontSize: 18 },
  btn: { backgroundColor: Colors.guinda, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
  dis: { opacity: 0.45 },
  btnT: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  forgot: { alignItems: 'center', marginBottom: 20 },
  forgotT: { color: Colors.guinda, fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  demo: { backgroundColor: Colors.infoLight, borderRadius: 10, padding: 12, alignItems: 'center' },
  demoT: { fontSize: 13, color: Colors.info },
  demoC: { fontWeight: '800' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', marginTop: 24, fontSize: 12 },
});
