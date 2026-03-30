import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { beneficiariosApi, localidadesApi } from '@/lib/api';
import { MUNICIPIOS_HIDALGO } from '@/lib/demoData';
import { useAuthStore } from '@/store/authStore';
import { CrearBeneficiarioPayload, Localidad } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Función para generar folio automático
const generarFolio = (): string => {
  const anio = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `HGO-${anio}-${random}`;
};

const INI: CrearBeneficiarioPayload = { nombre_completo: '', curp: '', municipio: '', localidad: '', folio_saderh: '', cadena_productiva: '', telefono_contacto: '' };
const getDraftKey = (tecnicoId?: string) => `@saderh:draft:beneficiario:${tecnicoId ?? 'anon'}`;

export default function AltaBeneficiario() {
  const { tecnico } = useAuthStore();
  const [form, setForm] = useState(INI);
  const [loading, setLoading] = useState(false);
  const [showMunis, setShowMunis] = useState(false);
  const [searchMuni, setSearchMuni] = useState('');
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [showLocalidades, setShowLocalidades] = useState(false);
  const [searchLocalidad, setSearchLocalidad] = useState('');
  const set = <K extends keyof CrearBeneficiarioPayload>(k: K, v: CrearBeneficiarioPayload[K]) => setForm((p: CrearBeneficiarioPayload) => ({ ...p, [k]: v }));

  useEffect(() => {
    let active = true;
    const restoreDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(getDraftKey(tecnico?.id));
        if (!active) return;
        if (raw) {
          const parsed = JSON.parse(raw) as { form?: CrearBeneficiarioPayload };
          if (parsed?.form) {
            setForm({
              ...INI,
              ...parsed.form,
              folio_saderh: parsed.form.folio_saderh || generarFolio(),
            });
            return;
          }
        }
        setForm((prev) => ({ ...prev, folio_saderh: prev.folio_saderh || generarFolio() }));
      } catch {
        setForm((prev) => ({ ...prev, folio_saderh: prev.folio_saderh || generarFolio() }));
      }
    };
    restoreDraft();
    return () => { active = false; };
  }, [tecnico?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(
        getDraftKey(tecnico?.id),
        JSON.stringify({ form, updated_at: new Date().toISOString() }),
      ).catch(() => {});
    }, 350);
    return () => clearTimeout(timeout);
  }, [form, tecnico?.id]);

  // Cargar localidades cuando se seleccione un municipio
  useEffect(() => {
    let active = true;
    const cargarLocalidades = async () => {
      if (!form.municipio) {
        setLocalidades([]);
        return;
      }
      
      setLoadingLocalidades(true);
      try {
        const locs = await localidadesApi.listarPorMunicipio(form.municipio);
        if (active) {
          setLocalidades(locs);
        }
      } catch (error) {
        console.error('Error cargando localidades:', error);
        if (active) {
          setLocalidades([]);
        }
      } finally {
        if (active) {
          setLoadingLocalidades(false);
        }
      }
    };
    
    cargarLocalidades();
    return () => { active = false; };
  }, [form.municipio]);

  // El backend actual no provee permisos específicos, se permite por defecto
  if (!tecnico) {
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
    // Validar formato básico de CURP
    const curpRegex = /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]\d$/;
    if (!curpRegex.test(form.curp.trim())) return 'El formato de CURP no es válido';
    if (!form.municipio) return 'Selecciona un municipio';
    if (!form.localidad.trim()) return 'La localidad es requerida';
    if (!form.folio_saderh.trim()) return 'El folio SADERH es requerido';
    if (!form.cadena_productiva.trim()) return 'La cadena productiva es requerida';
    return null;
  };

  const guardar = async () => {
    const err = validar(); if (err) { Alert.alert('Datos incompletos', err); return; }
    setLoading(true);
    try {
      const created = await beneficiariosApi.crear(form);
      await AsyncStorage.removeItem(getDraftKey(tecnico?.id));
      const offlineSaved = created.id.startsWith('local_');
      Alert.alert(
        offlineSaved ? 'Guardado localmente' : '✅ Registrado',
        offlineSaved
          ? `${form.nombre_completo} quedó guardado en el dispositivo y se sincronizará automáticamente al recuperar internet.`
          : `${form.nombre_completo} fue registrado exitosamente.`,
        [{ text: 'OK', onPress: () => { setForm({ ...INI, folio_saderh: generarFolio() }); setSearchMuni(''); } }],
      );
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
            <TouchableOpacity style={s.sel} onPress={() => { setShowMunis(!showMunis); }}>
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
            <TouchableOpacity style={s.sel} onPress={() => { setShowLocalidades(!showLocalidades); }}>
              <Text style={[s.selT, !form.localidad && s.ph]}>{form.localidad || 'Seleccionar localidad...'}</Text>
              <Text style={s.arr}>{showLocalidades ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showLocalidades && (
              <View style={s.drop}>
                <TextInput style={s.dropS} value={searchLocalidad} onChangeText={setSearchLocalidad} placeholder="Buscar localidad..." placeholderTextColor={Colors.gray400} />
                <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                  {loadingLocalidades ? (
                    <View style={s.loadingLocalidades}>
                      <Text style={s.loadingLocalidadesText}>Cargando localidades...</Text>
                    </View>
                  ) : (
                    localidades
                      .filter(l => l.nombre.toLowerCase().includes(searchLocalidad.toLowerCase()))
                      .map(l => (
                        <TouchableOpacity key={l.id} style={[s.dropI, form.localidad === l.nombre && s.dropIA]} onPress={() => { set('localidad', l.nombre); setShowLocalidades(false); setSearchLocalidad(''); }}>
                          <Text style={[s.dropIT, form.localidad === l.nombre && s.dropITA]}>{l.nombre}</Text>
                        </TouchableOpacity>
                      ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={s.sec}><Text style={s.secT}>🌾 Datos Agrícolas</Text>
            <Text style={s.lbl}>Folio SADERH *</Text>
            <TextInput style={s.inp} value={form.folio_saderh} onChangeText={v => set('folio_saderh', v.toUpperCase())} placeholder="HGO-2024-000000" placeholderTextColor={Colors.gray400} autoCapitalize="characters" />
            <Text style={s.lbl}>Cadena Productiva *</Text>
            <TextInput style={s.inp} value={form.cadena_productiva} onChangeText={v => set('cadena_productiva', v)} placeholder="Ej: Maíz, Frjol, Chilcue, etc." placeholderTextColor={Colors.gray400} />
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
  loadingLocalidades: { padding: 13, alignItems: 'center' },
  loadingLocalidadesText: { fontSize: 13, color: Colors.textSecondary },
});
