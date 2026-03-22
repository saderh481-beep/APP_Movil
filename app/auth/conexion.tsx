import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { API_CONFIG, getConnectionInfo, saveConnectionInfo, syncApi } from '@/lib/api';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Conexion() {
  const [url, setUrl] = useState(API_CONFIG.APP_API_URL);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setUrl(cfg.appApiUrl))
      .catch(() => {});
  }, []);

  const verificar = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      Alert.alert('URL inválida', 'Debe comenzar con http:// o https://');
      return;
    }
    setLoading(true);
    try {
      const ok = await syncApi.healthCheck(cleanUrl);
      if (ok) {
        await saveConnectionInfo({ appApiUrl: cleanUrl, modoDemo: false });
        router.replace('/auth/login');
      } else {
        Alert.alert('Sin conexión', 'No se pudo conectar al servidor. ¿Usar modo local?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Modo Local', onPress: modoLocal },
        ]);
      }
    } catch { Alert.alert('Error', 'No se pudo verificar la conexión'); }
    finally { setLoading(false); }
  };

  const modoLocal = async () => {
    await saveConnectionInfo({ appApiUrl: url.trim() || API_CONFIG.APP_API_URL, modoDemo: true });
    router.replace('/auth/login');
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
            <Text style={s.cardTitle}>Configurar Conexión</Text>
            <Text style={s.cardDesc}>Ingresa la URL del servidor o usa el modo local para trabajar sin internet.</Text>
            <Text style={s.lbl}>URL del Servidor API</Text>
            <TextInput style={s.inp} value={url} onChangeText={setUrl} placeholder="https://mi-servidor.railway.app" placeholderTextColor={Colors.gray400} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <TouchableOpacity style={[s.btnP, loading && s.dis]} onPress={verificar} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnPT}>Verificar y Conectar</Text>}
            </TouchableOpacity>
            <View style={s.div}><View style={s.divL} /><Text style={s.divT}>o</Text><View style={s.divL} /></View>
            <TouchableOpacity style={s.btnS} onPress={modoLocal}><Text style={s.btnST}>📱  Modo Local / Demo</Text></TouchableOpacity>
            <View style={s.hint}><Text style={s.hintT}>El modo local no requiere internet. Los datos se sincronizan automáticamente cuando haya conexión.</Text></View>
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
  card: { backgroundColor: Colors.white, borderRadius: 22, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  lbl: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  inp: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: rh(48),
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.gray50,
    marginBottom: 18,
    width: '100%',
  },
  btnP: { backgroundColor: Colors.guinda, borderRadius: 14, padding: 17, alignItems: 'center', marginBottom: 16 },
  dis: { opacity: 0.55 },
  btnPT: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  div: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divL: { flex: 1, height: 1, backgroundColor: Colors.border },
  divT: { color: Colors.textSecondary, fontSize: 13 },
  btnS: { borderWidth: 1.5, borderColor: Colors.guinda, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnST: { color: Colors.guinda, fontSize: 15, fontWeight: '600' },
  hint: { backgroundColor: Colors.infoLight, borderRadius: 10, padding: 12 },
  hintT: { fontSize: 12, color: Colors.info, lineHeight: 18, textAlign: 'center' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', marginTop: 24, fontSize: 12 },
});
