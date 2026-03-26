import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { API_CONFIG, getConnectionInfo, KEYS } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, PermissionsAndroid, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROL: Record<string, string> = { SUPER_ADMIN: 'Super Administrador', ADMIN: 'Administrador', COORDINADOR: 'Coordinador', TECNICO: 'Técnico de Campo' };

const Row = ({ l, v }: { l: string; v: string }) => (
  <View style={s.row}><Text style={s.rowL}>{l}</Text><Text style={s.rowV} numberOfLines={2}>{v}</Text></View>
);

// Modal de Términos y Condiciones
const TerminosModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={s.modalOverlay}>
      <View style={s.modalContent}>
        <Text style={s.modalTitle}>Términos y Condiciones</Text>
        <ScrollView style={s.modalScroll}>
          <Text style={s.modalText}>
            {'\n'}
            <Text style={s.modalSubtitle}>1. USO DE LA APLICACIÓN</Text>{'\n'}
            Esta aplicación es propiedad del Gobierno del Estado de Hidalgo y está destinada exclusivamente al uso de los técnicos de campo autorizados para el registro y seguimiento de beneficiarios del programa SADERH.{'\n\n'}
            
            <Text style={s.modalSubtitle}>2. PRIVACIDAD Y DATOS</Text>{'\n'}
            Los datos recopilados mediante esta aplicación son propiedad del Gobierno del Estado de Hidalgo y serán utilizados únicamente para los fines del programa. El usuario se compromete a manejar la información de manera confidencial.{'\n\n'}
            
            <Text style={s.modalSubtitle}>3. RESPONSABILIDADES</Text>{'\n'}
            El usuario es responsable de:
            - Mantener la confidencialidad de sus credenciales de acceso
            - Reportar cualquier uso no autorizado de su cuenta
            - Garantizar la veracidad de la información registrada
            - Realizar el respaldo de datos cuando sea necesario{'\n\n'}
            
            <Text style={s.modalSubtitle}>4. ALMACENAMIENTO LOCAL</Text>{'\n'}
            La aplicación puede almacenar datos localmente para funcionar sin conexión a internet. El usuario es responsable de gestionar el espacio de almacenamiento y realizar respaldos periódicamente.{'\n\n'}
            
            <Text style={s.modalSubtitle}>5. MODIFICACIONES</Text>{'\n'}
            El Gobierno del Estado de Hidalgo se reserva el derecho de modificar estos términos en cualquier momento. El uso continuo de la aplicación constituye aceptación de los términos actualizados.{'\n\n'}
            
            <Text style={s.modalSubtitle}>6. CONTACTO</Text>{'\n'}
            Para cualquier duda o comentario sobre estos términos, contacte a su coordinador o al área de soporte técnico de SADERH.{'\n\n'}
            
            <Text style={s.modalBold}>Última actualización: Marzo 2026</Text>
          </Text>
        </ScrollView>
        <TouchableOpacity style={s.modalBtn} onPress={onClose}>
          <Text style={s.modalBtnT}>Aceptar y Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function Informacion() {
  const { tecnico, clearAuth } = useAuthStore();
  const [showTerminos, setShowTerminos] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const ini = (tecnico?.nombre ?? '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  // Función para solicitar permisos de almacenamiento
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Permiso de Almacenamiento',
            message: 'SADERH necesita acceso al almacenamiento para exportar datos.',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Error requesting storage permission:', err);
        return false;
      }
    }
    return true; // iOS no necesita permisos para compartir
  };

  // Función para exportar datos
  const exportarDatos = async () => {
    setDescargando(true);
    try {
      // Solicitar permiso
      const tienePermiso = await requestStoragePermission();
      if (!tienePermiso && Platform.OS === 'android') {
        Alert.alert('Permiso denegado', 'No se puede exportar datos sin permiso de almacenamiento.');
        setDescargando(false);
        return;
      }

      // Recolectar datos
      const datos: Record<string, unknown> = {
        fecha_exportacion: new Date().toISOString(),
        tecnico: tecnico,
        app_version: '1.0.0',
      };

      // Obtener datos locales
      try {
        const [token, usuario, conexion, offline] = await AsyncStorage.multiGet([
          KEYS.TOKEN,
          KEYS.USUARIO,
          KEYS.CONEXION,
          KEYS.OFFLINE,
        ]);
        datos.auth = { tiene_token: !!token[1], usuario: usuario[1] ? JSON.parse(usuario[1]) : null };
        datos.configuracion = conexion[1] ? JSON.parse(conexion[1]) : null;
        datos.offline_queue = offline[1] ? 'disponible' : 'vacía';
      } catch (e) {
        console.warn('Error leyendo datos locales:', e);
      }

      const jsonStr = JSON.stringify(datos, null, 2);
      const fileName = `saderh_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Datos SADERH',
          UTI: 'public.json',
        });
        Alert.alert('✅ Éxito', 'Datos exportados correctamente.');
      } else {
        Alert.alert('Error', 'No se puede compartir archivos en este dispositivo.');
      }
    } catch (e) {
      console.error('Error exportando datos:', e);
      Alert.alert('Error', 'No se pudieron exportar los datos.');
    } finally {
      setDescargando(false);
    }
  };

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
          <Text style={s.cardT}>👤 Información Personal</Text>
          <Row l="Nombre" v={tecnico?.nombre ?? '—'} />
          <Row l="Rol" v="Técnico de Campo" />
          <Row l="Código" v="•••••" />
        </View>

        {/* Sección de Datos y Respaldo */}
        <View style={s.card}>
          <Text style={s.cardT}>💾 Datos y Respaldo</Text>
          <Text style={s.cardDesc}>Exporta una copia de seguridad de tus datos locales.</Text>
          <TouchableOpacity 
            style={[s.btnExport, descargando && s.btnDisabled]} 
            onPress={exportarDatos}
            disabled={descargando}
          >
            <Text style={s.btnExportT}>
              {descargando ? '⏳ Exportando...' : '📥 Exportar Mis Datos'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Términos y Condiciones */}
        <View style={s.card}>
          <Text style={s.cardT}>📋 Legal</Text>
          <TouchableOpacity style={s.btnTerminos} onPress={() => setShowTerminos(true)}>
            <Text style={s.btnTerminosT}>📜 Ver Términos y Condiciones</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardT}>ℹ️ Acerca de SADERH</Text>
          <Row l="Versión" v="1.0.0" />
          <Row l="SDK" v="Expo 55 · React Native 0.83" />
          <Row l="Gobierno" v="Estado de Hidalgo" />
          <Row l="Dependencia" v="Secretaría de Agricultura" />
        </View>

        {/* Crédito Universidad */}
        <View style={s.card}>
          <Text style={s.cardT}>🎓 Crédito Universitario</Text>
          <View style={s.uniInfo}>
            <Text style={s.uniIcon}>🎓</Text>
            <Text style={s.uniText}>Desarrollado en colaboración con institución educativa</Text>
          </View>
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

      <TerminosModal visible={showTerminos} onClose={() => setShowTerminos(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.guinda, paddingHorizontal: 20, paddingVertical: 16 },
  hT: { fontSize: 22, fontWeight: '800', color: Colors.white },
  avSec: { alignItems: 'center', paddingVertical: 24 },
  av: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.guinda, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avT: { fontSize: 28, fontWeight: '700', color: Colors.white },
  nom: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  rol: { fontSize: 14, color: Colors.textSecondary },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardT: { fontSize: 14, fontWeight: '700', color: Colors.guinda, marginBottom: 12 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  rowL: { fontSize: 13, color: Colors.textSecondary },
  rowV: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  btnCfg: { marginTop: 12, padding: 12, backgroundColor: Colors.gray50, borderRadius: 10 },
  btnCfgT: { fontSize: 13, color: Colors.guinda, fontWeight: '600', textAlign: 'center' },
  btnOut: { marginHorizontal: 16, marginTop: 8, padding: 16, backgroundColor: Colors.danger + '15', borderRadius: 12, borderWidth: 1, borderColor: Colors.danger },
  btnOutT: { fontSize: 15, fontWeight: '700', color: Colors.danger, textAlign: 'center' },
  // Botón exportar
  btnExport: { backgroundColor: Colors.guinda, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginTop: 8 },
  btnExportT: { fontSize: 14, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  btnDisabled: { backgroundColor: Colors.gray400 },
  // Botón términos
  btnTerminos: { backgroundColor: Colors.gray100, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginTop: 4 },
  btnTerminosT: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.guinda, textAlign: 'center', marginBottom: 16 },
  modalScroll: { maxHeight: 400 },
  modalText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  modalSubtitle: { fontWeight: '700', color: Colors.guinda },
  modalBold: { fontWeight: '700', fontStyle: 'italic' },
  modalBtn: { backgroundColor: Colors.guinda, paddingVertical: 14, borderRadius: 10, marginTop: 16 },
  modalBtnT: { fontSize: 15, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  // Universidad
  uniInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  uniIcon: { fontSize: 28, marginRight: 4 },
  uniText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
});
