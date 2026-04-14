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
      <View style={s.header}>
        <Text style={s.hT}>Mi Perfil</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.profileCard}>
          <View style={s.avatarBox}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{ini}</Text>
            </View>
            <View style={s.avatarStatus}>
              <Text style={s.avatarStatusText}>✓ Activo</Text>
            </View>
          </View>
          <Text style={s.profileName}>{tecnico?.nombre ?? '—'}</Text>
          <Text style={s.profileRole}>Técnico de Campo</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}><Text style={s.cardIconText}>👤</Text></View>
            <Text style={s.cardTitle}>Información Personal</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Nombre</Text>
            <Text style={s.infoValue}>{tecnico?.nombre ?? '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Rol</Text>
            <Text style={s.infoValue}>Técnico de Campo</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Código</Text>
            <Text style={s.infoValue}>•••••</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}><Text style={s.cardIconText}>💾</Text></View>
            <Text style={s.cardTitle}>Datos y Respaldo</Text>
          </View>
          <Text style={s.cardDesc}>Exporta una copia de seguridad de tus datos locales.</Text>
          <TouchableOpacity style={s.exportBtn} onPress={exportarDatos} disabled={descargando}>
            <Text style={s.exportBtnText}>
              {descargando ? '⏳ Exportando...' : '📥 Exportar Mis Datos'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}><Text style={s.cardIconText}>📋</Text></View>
            <Text style={s.cardTitle}>Legal</Text>
          </View>
          <TouchableOpacity style={s.legalBtn} onPress={() => setShowTerminos(true)}>
            <Text style={s.legalBtnText}>📜 Términos y Condiciones</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}><Text style={s.cardIconText}>ℹ️</Text></View>
            <Text style={s.cardTitle}>Acerca de SADERH</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Versión</Text>
            <Text style={s.infoValue}>1.0.0</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>SDK</Text>
            <Text style={s.infoValue}>Expo 55 · RN 0.83</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Gobierno</Text>
            <Text style={s.infoValue}>Estado de Hidalgo</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Dependencia</Text>
            <Text style={s.infoValue}>SAGRUH</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}><Text style={s.cardIconText}>🎓</Text></View>
            <Text style={s.cardTitle}>Universidad</Text>
          </View>
          <View style={s.uniBox}>
            <Image source={require('@/assets/images/logo-UTMIR.svg.jpeg')} style={s.uniLogo} resizeMode="contain" />
          </View>
          <Text style={s.devLabel}>Desarrolladores:</Text>
          <Text style={s.devName}>Jesus Aldair Quintana Samperio</Text>
          <Text style={s.devName}>Erick Angel Tenorio Alcantara</Text>
        </View>

        <TouchableOpacity style={s.logoutBtn}
          onPress={() => Alert.alert('Cerrar sesión', '¿Confirmas que deseas salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/auth/splash'); } },
          ])}>
          <Text style={s.logoutBtnText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>
        
        <View style={{ height: rh(40) }} />
      </ScrollView>

      <TerminosModal visible={showTerminos} onClose={() => setShowTerminos(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.guinda, paddingHorizontal: rw(20), paddingVertical: rh(16) },
  hT: { fontSize: fontSize.xl, fontWeight: '800', color: Colors.white },
  scrollContent: { padding: rw(16), gap: rh(12) },
  
  profileCard: { backgroundColor: Colors.guinda, borderRadius: radius.lg, padding: rw(20), alignItems: 'center' },
  avatarBox: { position: 'relative', marginBottom: rh(12) },
  avatar: { width: rw(80), height: rw(80), borderRadius: rw(40), backgroundColor: Colors.white + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.dorado },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.white },
  avatarStatus: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.success, paddingHorizontal: rw(8), paddingVertical: rh(4), borderRadius: radius.full },
  avatarStatusText: { fontSize: fontSize.xs, fontWeight: '700', color: Colors.white },
  profileName: { fontSize: fontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: rh(4) },
  profileRole: { fontSize: fontSize.sm, color: Colors.white + 'AA' },
  
  card: { backgroundColor: Colors.white, borderRadius: radius.lg, padding: rw(16), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rh(12) },
  cardIcon: { width: rw(36), height: rw(36), borderRadius: rw(18), backgroundColor: Colors.guindaAlpha, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 18 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: Colors.textPrimary, marginLeft: rw(10) },
  cardDesc: { fontSize: fontSize.sm, color: Colors.textSecondary, marginBottom: rh(12) },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rh(10), borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  infoLabel: { fontSize: fontSize.sm, color: Colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rh(8), borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  rowL: { fontSize: fontSize.sm, color: Colors.textSecondary, flex: 1 },
  rowV: { fontSize: fontSize.sm, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  
  exportBtn: { backgroundColor: Colors.guinda, paddingVertical: rh(12), borderRadius: radius.md, marginTop: rh(8) },
  exportBtnText: { fontSize: fontSize.base, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  
  legalBtn: { backgroundColor: Colors.gray50, paddingVertical: rh(12), borderRadius: radius.md },
  legalBtnText: { fontSize: fontSize.base, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  
  logoutBtn: { padding: rh(14), backgroundColor: Colors.danger + '12', borderRadius: radius.md, borderWidth: 1, borderColor: Colors.danger + '30' },
  logoutBtnText: { fontSize: fontSize.base, fontWeight: '700', color: Colors.danger, textAlign: 'center' },
  
  devName: { fontSize: fontSize.sm, color: Colors.textPrimary, marginTop: rh(8) },
  devLabel: { fontSize: fontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginTop: rh(12), marginBottom: rh(4) },
  uniBox: { alignItems: 'center', marginBottom: rh(12) },
  uniLogo: { width: rw(100), height: rw(50), borderRadius: radius.md },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: rw(20) },
  modalContent: { backgroundColor: Colors.white, borderRadius: radius.xl, padding: rw(20), maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: Colors.guinda, textAlign: 'center', marginBottom: rh(16) },
  modalScroll: { maxHeight: rh(400) },
  modalText: { fontSize: fontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  modalSubtitle: { fontWeight: '700', color: Colors.guinda },
  modalBold: { fontWeight: '700', fontStyle: 'italic' },
  modalBtn: { backgroundColor: Colors.guinda, paddingVertical: rh(14), borderRadius: radius.md, marginTop: rh(16) },
  modalBtnT: { fontSize: fontSize.base, fontWeight: '700', color: Colors.white, textAlign: 'center' },
});
