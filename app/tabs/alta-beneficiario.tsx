import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { beneficiariosApi, getConnectionInfo } from '@/lib/api';
import { MUNICIPIOS_HIDALGO, TIPOS_CULTIVO } from '@/lib/demoData';
import { useAuthStore } from '@/store/authStore';
import { CrearBeneficiarioPayload } from '@/types/models';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INI: CrearBeneficiarioPayload = { nombre_completo: '', curp: '', municipio: '', localidad: '', folio_saderh: '', cadena_productiva: '', telefono_contacto: '' };

export default function AltaBeneficiario() {
  const { usuario } = useAuthStore();
  const [form, setForm] = useState(INI);
  const [loading, setLoading] = useState(false);
  const [showMunis, setShowMunis] = useState(false);
  const [showCultivos, setShowCultivos] = useState(false);
  const [searchMuni, setSearchMuni] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const set = <K extends keyof CrearBeneficiarioPayload>(k: K, v: CrearBeneficiarioPayload[K]) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setIsDemoMode(cfg.modoDemo))
      .catch(() => {});
  }, []);

  if (!isDemoMode) {
    return (
      <SafeAreaView style={s.cont} edges={['top']}>
        <View style={s.header}><Text style={s.hT}>Beneficiarios</Text></View>
        <View style={s.noAcc}>
          <Text style={{ fontSize: 52 }}>📌</Text>
          <Text style={s.noAccT}>Alta desde plataforma web</Text>
          <Text style={s.noAccD}>
            En modo servidor solo se muestran y validan beneficiarios previamente cargados y asignados en la web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!usuario?.puede_registrar_beneficiarios) {
    return (
      <SafeAreaView style={s.cont} edges={['top']}>
        <View style={s.header}><Text style={s.hT}>Alta de Beneficiario</Text></View>
        <View style={s.noAcc}>
          <Text style={{ fontSize: 52 }}>🔒</Text>
          <Text style={s.noAccT}>Sin permiso</Text>
          <Text style={s.noAccD}>Tu cuenta no tiene permiso para registrar beneficiarios.{'\n'}Contacta a tu coordinador.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validar = () => {
    if (!form.nombre_completo.trim()) return 'El nombre es requerido';
    if (form.curp.trim().length !== 18) return 'La CURP debe tener 18 caracteres';
    if (!form.municipio) return 'Selecciona un municipio';
    if (!form.localidad.trim()) return 'La localidad es requerida';
    if (!form.folio_saderh.trim()) return 'El folio SADERH es requerido';
    if (!form.cadena_productiva) return 'Selecciona una cadena productiva';
    return null;
  };

  const guardar = async () => {
    const err = validar(); if (err) { Alert.alert('Datos incompletos', err); return; }
    setLoading(true);
    try {
      await beneficiariosApi.crear(form);
      Alert.alert('✅ Registrado', `${form.nombre_completo} fue registrado exitosamente.`, [{ text: 'OK', onPress: () => { setForm(INI); setSearchMuni(''); } }]);
    } catch (e: any) { Alert.alert('Error', e.message ?? 'No se pudo registrar'); }
    finally { setLoading(false); }
  };

  const munis = MUNICIPIOS_HIDALGO.filter(m => m.toLowerCase().includes(searchMuni.toLowerCase()));

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      <View style={s.header}>
        <Text style={s.hT}>Alta de Beneficiario</Text>
        <Text style={s.hS}>Registrar nuevo beneficiario en el sistema</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.sec}><Text style={s.secT}>👤 Datos Personales</Text>
            <Text style={s.lbl}>Nombre Completo *</Text>
            <TextInput style={s.inp} value={form.nombre_completo} onChangeText={v => set('nombre_completo', v)} placeholder="Nombre completo o razón social" placeholderTextColor={Colors.gray400} />
            <Text style={s.lbl}>CURP *</Text>
            <TextInput style={s.inp} value={form.curp} onChangeText={v => set('curp', v.toUpperCase().slice(0, 18))} placeholder="XXXX000000XXXXXXXX" placeholderTextColor={Colors.gray400} autoCapitalize="characters" maxLength={18} />
            <Text style={s.hint}>{form.curp.length}/18</Text>
            <Text style={s.lbl}>Teléfono</Text>
            <TextInput style={s.inp} value={form.telefono_contacto ?? ''} onChangeText={v => set('telefono_contacto', v)} placeholder="771-000-0000" placeholderTextColor={Colors.gray400} keyboardType="phone-pad" />
          </View>

          <View style={s.sec}><Text style={s.secT}>📍 Ubicación</Text>
            <Text style={s.lbl}>Municipio *</Text>
            <TouchableOpacity style={s.sel} onPress={() => { setShowMunis(!showMunis); setShowCultivos(false); }}>
              <Text style={[s.selT, !form.municipio && s.ph]}>{form.municipio || 'Seleccionar municipio...'}</Text>
              <Text style={s.arr}>{showMunis ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showMunis && (
              <View style={s.drop}>
                <TextInput style={s.dropS} value={searchMuni} onChangeText={setSearchMuni} placeholder="Buscar municipio..." placeholderTextColor={Colors.gray400} />
                <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                  {munis.map(m => (
                    <TouchableOpacity key={m} style={[s.dropI, form.municipio === m && s.dropIA]} onPress={() => { set('municipio', m); setShowMunis(false); setSearchMuni(''); }}>
                      <Text style={[s.dropIT, form.municipio === m && s.dropITA]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={s.lbl}>Localidad / Ejido *</Text>
            <TextInput style={s.inp} value={form.localidad} onChangeText={v => set('localidad', v)} placeholder="Nombre de la localidad" placeholderTextColor={Colors.gray400} />
          </View>

          <View style={s.sec}><Text style={s.secT}>🌾 Datos Agrícolas</Text>
            <Text style={s.lbl}>Folio SADERH *</Text>
            <TextInput style={s.inp} value={form.folio_saderh} onChangeText={v => set('folio_saderh', v.toUpperCase())} placeholder="HGO-2024-000000" placeholderTextColor={Colors.gray400} autoCapitalize="characters" />
            <Text style={s.lbl}>Cadena Productiva *</Text>
            <TouchableOpacity style={s.sel} onPress={() => { setShowCultivos(!showCultivos); setShowMunis(false); }}>
              <Text style={[s.selT, !form.cadena_productiva && s.ph]}>{form.cadena_productiva || 'Seleccionar cultivo...'}</Text>
              <Text style={s.arr}>{showCultivos ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCultivos && (
              <ScrollView style={[s.drop, { maxHeight: 220 }]} nestedScrollEnabled>
                {TIPOS_CULTIVO.map(c => (
                  <TouchableOpacity key={c} style={[s.dropI, form.cadena_productiva === c && s.dropIA]} onPress={() => { set('cadena_productiva', c); setShowCultivos(false); }}>
                    <Text style={[s.dropIT, form.cadena_productiva === c && s.dropITA]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity style={[s.btn, loading && s.btnD]} onPress={guardar} disabled={loading}>
            <Text style={s.btnT}>{loading ? 'Guardando...' : '💾  Registrar Beneficiario'}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.guinda, paddingHorizontal: 20, paddingVertical: 16 },
  hT: { fontSize: 22, fontWeight: '800', color: Colors.white },
  hS: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  content: { padding: 16 },
  sec: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  secT: { fontSize: 14, fontWeight: '700', color: Colors.guinda, marginBottom: 16 },
  lbl: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 2 },
  inp: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    minHeight: rh(46),
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.gray50,
    marginBottom: 12,
    width: '100%',
  },
  hint: { fontSize: 11, color: Colors.textLight, marginTop: -8, marginBottom: 12, textAlign: 'right' },
  ph: { color: Colors.gray400 },
  sel: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.gray50, marginBottom: 12 },
  selT: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  arr: { fontSize: 11, color: Colors.textSecondary },
  drop: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.white, overflow: 'hidden', marginBottom: 12 },
  dropS: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: rh(42),
    fontSize: 13,
    color: Colors.textPrimary,
    width: '100%',
  },
  dropI: { padding: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dropIA: { backgroundColor: Colors.guindaAlpha },
  dropIT: { fontSize: 14, color: Colors.textPrimary },
  dropITA: { color: Colors.guinda, fontWeight: '700' },
  btn: { backgroundColor: Colors.guinda, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4, shadowColor: Colors.guinda, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnD: { opacity: 0.55 },
  btnT: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  noAcc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  noAccT: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  noAccD: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
