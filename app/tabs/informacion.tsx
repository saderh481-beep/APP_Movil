import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { API_CONFIG, getConnectionInfo } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROL: Record<string, string> = { SUPER_ADMIN: 'Super Administrador', ADMIN: 'Administrador', COORDINADOR: 'Coordinador', TECNICO: 'Técnico de Campo' };
const ESP: Record<string, string> = { AGRICOLA: '🌾 Agrícola', AGROPECUARIO: '🐄 Agropecuario', ACTIVIDAD_GENERAL: '⚙️ Actividad General' };

const Row = ({ l, v }: { l: string; v: string }) => (
  <View style={s.row}><Text style={s.rowL}>{l}</Text><Text style={s.rowV} numberOfLines={2}>{v}</Text></View>
);

export default function Informacion() {
  const { tecnico, clearAuth } = useAuthStore();
  const [conexion, setConexion] = useState({ appApiUrl: API_CONFIG.APP_API_URL });
  const ini = (tecnico?.nombre ?? '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setConexion(cfg))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      <View style={s.header}><Text style={s.hT}>Mi Perfil</Text></View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.avSec}>
          <View style={s.av}><Text style={s.avT}>{ini}</Text></View>
          <Text style={s.nom}>{tecnico?.nombre ?? '—'}</Text>
          <Text style={s.rol}>Técnico de Campo</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardT}>Información Personal</Text>
          <Row l="Nombre" v={tecnico?.nombre ?? '—'} />
          <Row l="ID" v={tecnico?.id ?? '—'} />
          <Row l="Rol" v="Técnico de Campo" />
          <Row l="Código" v="•••••" />
        </View>

        <View style={s.card}>
          <Text style={s.cardT}>⚙️ Servidor / Conexión</Text>
          <Row l="API App" v={conexion.appApiUrl} />
          <Row l="API Web" v={API_CONFIG.WEB_API_URL} />
          <Row l="Supabase" v={API_CONFIG.SUPABASE_URL} />
          <Row l="Servidor" v={conexion.appApiUrl} />
          <TouchableOpacity style={s.btnCfg} onPress={() => router.replace('/auth/conexion')}>
            <Text style={s.btnCfgT}>🔧 Cambiar configuración del servidor</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardT}>Acerca de SADERH</Text>
          <Row l="Versión" v="1.0.0" />
          <Row l="SDK" v="Expo 55 · React Native 0.83" />
          <Row l="Gobierno" v="Estado de Hidalgo" />
          <Row l="Dependencia" v="Secretaría de Agricultura y Desarrollo Rural" />
        </View>

        <TouchableOpacity style={s.btnOut}
          onPress={() => Alert.alert('Cerrar sesión', '¿Confirmas que deseas salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/auth/splash'); } },
          ])}>
          <Text style={s.btnOutT}>🚪  Cerrar Sesión</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.guinda, paddingHorizontal: 20, paddingVertical: 16 },
  hT: { fontSize: 22, fontWeight: '800', color: Colors.white },
  avSec: { backgroundColor: Colors.guinda, alignItems: 'center', paddingBottom: 30, paddingTop: 4, gap: 8 },
  av: { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.dorado, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avT: { fontSize: 30, fontWeight: '900', color: Colors.white },
  nom: { fontSize: 20, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  rol: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  demoBadge: { backgroundColor: Colors.dorado, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  demoBadgeT: { fontSize: 12, fontWeight: '700', color: Colors.white },
  card: { backgroundColor: Colors.white, borderRadius: 16, margin: 16, marginBottom: 0, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardT: { fontSize: 14, fontWeight: '700', color: Colors.guinda, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  rowL: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  rowV: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', flex: 2, textAlign: 'right' },
  btnCfg: { marginTop: 14, backgroundColor: Colors.gray100, borderRadius: 10, padding: 13, alignItems: 'center' },
  btnCfgT: { fontSize: 14, color: Colors.guinda, fontWeight: '600' },
  btnOut: { margin: 16, marginTop: 20, backgroundColor: Colors.dangerLight, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger + '50' },
  btnOutT: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
});
