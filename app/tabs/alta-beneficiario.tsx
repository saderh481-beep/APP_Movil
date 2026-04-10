import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { beneficiariosApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { CrearBeneficiarioPayload } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MUNICIPIOS_HIDALGO = [
  'Acatlán', 'Acaxochitlán', 'Actopan', 'Agua Blanca de Iturbide', 'Ajacuba',
  'Alfajayucan', 'Almoloya', 'Apan', 'Atitalaquia', 'Atlapexco',
  'Atotonilco el Grande', 'Atotonilco de Tula', 'Calnali', 'Cardonal',
  'Cuautepec de Hinojosa', 'Chapantongo', 'Chapulhuacán', 'Chilcuautla',
  'Eloxochitlán', 'Epazoyucan', 'Francisco I. Madero', 'Huasca de Ocampo',
  'Huautla', 'Huazalingo', 'Huehuetla', 'Huejutla de Reyes', 'Huichapan',
  'Ixmiquilpan', 'Jacala de Ledezma', 'Jaltocán', 'Juárez Hidalgo',
  'Lolotla', 'Metepec', 'San Agustín Metzquititlán', 'Metztitlán',
  'Mineral del Chico', 'Mineral del Monte', 'Mineral de la Reforma',
  'La Misión', 'Mixquiahuala de Juárez', 'Molango de Escamilla',
  'Nicolás Flores', 'Nopala de Villagrán', 'Omitlán de Juárez',
  'San Felipe Orizatlán', 'Pacula', 'Pachuca de Soto', 'Pisaflores',
  'Progreso de Obregón', 'San Agustín Tlaxiaca', 'San Bartolo Tutotepec',
  'San Salvador', 'Santiago de Anaya', 'Santiago Tulantepec de Lugo Guerrero',
  'Singuilucan', 'Tasquillo', 'Tecozautla', 'Tenango de Doria',
  'Tepeapulco', 'Tepehuacán de Guerrero', 'Tepeji del Río de Ocampo',
  'Tepetitlán', 'Tetepango', 'Tezontepec de Aldama', 'Tianguistengo',
  'Tizayuca', 'Tlahuelilpan', 'Tlahuiltepa', 'Tlanalapa', 'Tlanchinol',
  'Tlaxcoapan', 'Tolcayuca', 'Tula de Allende', 'Tulancingo de Bravo',
  'Xochiatipan', 'Xochicoatlán', 'Yahualica', 'Zacualtipán de Ángeles',
  'Zapotlán de Juárez', 'Zempoala', 'Zimapán',
];

const LOCALIDADES_HIDALGO = [
  'Acatlán', 'Acaxochitlán', 'Actopan', 'Agua Blanca de Iturbide', 'Ajacuba',
  'Alfajayucan', 'Almoloya', 'Apan', 'Atitalaquia', 'Atlapexco',
  'Atotonilco el Grande', 'Atotonilco de Tula', 'Calnali', 'Cardonal',
  'Cuautepec de Hinojosa', 'Chapantongo', 'Chapulhuacán', 'Chilcuautla',
  'Eloxochitlán', 'Epazoyucan', 'Francisco I. Madero', 'Huasca de Ocampo',
  'Huautla', 'Huazalingo', 'Huehuetla', 'Huejutla de Reyes', 'Huichapan',
  'Ixmiquilpan', 'Jacala de Ledezma', 'Jaltocán', 'Juárez Hidalgo',
  'Lolotla', 'Metepec', 'San Agustín Metzquititlán', 'Metztitlán',
  'Mineral del Chico', 'Mineral del Monte', 'Mineral de la Reforma',
  'La Misión', 'Mixquiahuala de Juárez', 'Molango de Escamilla',
  'Nicolás Flores', 'Nopala de Villagrán', 'Omitlán de Juárez',
  'San Felipe Orizatlán', 'Pacula', 'Pachuca de Soto', 'Pisaflores',
  'Progreso de Obregón', 'San Agustín Tlaxiaca', 'San Bartolo Tutotepec',
  'San Salvador', 'Santiago de Anaya', 'Santiago Tulantepec de Lugo Guerrero',
  'Singuilucan', 'Tasquillo', 'Tecozautla', 'Tenango de Doria',
  'Tepeapulco', 'Tepehuacán de Guerrero', 'Tepeji del Río de Ocampo',
  'Tepetitlán', 'Tetepango', 'Tezontepec de Aldama', 'Tianguistengo',
  'Tizayuca', 'Tlahuelilpan', 'Tlahuiltepa', 'Tlanalapa', 'Tlanchinol',
  'Tlaxcoapan', 'Tolcayuca', 'Tula de Allende', 'Tulancingo de Bravo',
  'Xochiatipan', 'Xochicoatlán', 'Yahualica', 'Zacualtipán de Ángeles',
  'Zapotlán de Juárez', 'Zempoala', 'Zimapán',
];

const REFRESH_BENEFICIARIOS_KEY = '@saderh:refresh_beneficiarios';

const generarFolio = (): string => {
  const anio = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `HGO-${anio}-${random}`;
};

const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

const INI: CrearBeneficiarioPayload = { nombre_completo: '', curp: '', municipio: '', localidad: '', folio_saderh: '', cadena_productiva: '', telefono_contacto: '', tecnico_id: '' };
const getDraftKey = (tecnicoId?: string) => `@saderh:draft:beneficiario:${tecnicoId ?? 'anon'}`;

export default function AltaBeneficiario() {
  const { tecnico } = useAuthStore();
  const [form, setForm] = useState(INI);
  const [loading, setLoading] = useState(false);
  const [showMunis, setShowMunis] = useState(false);
  const [searchMuni, setSearchMuni] = useState('');
  const [showLocs, setShowLocs] = useState(false);
  const [searchLoc, setSearchLoc] = useState('');
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
    if (tecnico?.id) {
      setForm(prev => ({ ...prev, tecnico_id: tecnico.id }));
    }
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
      const formToSave = { ...form, tecnico_id: tecnico?.id ?? form.tecnico_id };
      console.log('[alta-beneficiario] Guardando beneficiario con tecnico_id:', formToSave.tecnico_id);
      const created = await beneficiariosApi.crear(formToSave);
      console.log('[alta-beneficiario] Beneficiario creado:', created.id, created.tecnico_id);
      await AsyncStorage.removeItem(getDraftKey(tecnico?.id));
      await AsyncStorage.setItem(REFRESH_BENEFICIARIOS_KEY, Date.now().toString());
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

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      <View style={s.header}>
        <Text style={s.hT}>Alta de Beneficiario</Text>
        <Text style={s.hS}>Paso 1 de 2</Text>
      </View>
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: '50%' }]} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}><Text style={s.cardIconText}>👤</Text></View>
              <View style={s.cardTitleBox}>
                <Text style={s.cardTitle}>Datos Personales</Text>
                <Text style={s.cardSubtitle}>Información del beneficiario</Text>
              </View>
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Nombre Completo *</Text>
              <TextInput style={s.fieldInput} value={form.nombre_completo} onChangeText={v => set('nombre_completo', v)} placeholder="Nombre completo o razón social" placeholderTextColor={Colors.gray400} />
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CURP *</Text>
              <TextInput style={s.fieldInput} value={form.curp} onChangeText={v => set('curp', v.toUpperCase().slice(0, 18))} placeholder="XXXX000000XXXXXXXX" placeholderTextColor={Colors.gray400} autoCapitalize="characters" maxLength={18} />
              <Text style={s.fieldHint}>{form.curp.length}/18 caracteres</Text>
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Teléfono</Text>
              <TextInput style={s.fieldInput} value={form.telefono_contacto ?? ''} onChangeText={v => set('telefono_contacto', v)} placeholder="771-000-0000" placeholderTextColor={Colors.gray400} keyboardType="phone-pad" />
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}><Text style={s.cardIconText}>📍</Text></View>
              <View style={s.cardTitleBox}>
                <Text style={s.cardTitle}>Ubicación</Text>
                <Text style={s.cardSubtitle}>Dirección del beneficiario</Text>
              </View>
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Municipio *</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => { setShowMunis(!showMunis); }}>
                <Text style={[s.selectBtnText, !form.municipio && s.placeholder]}>{form.municipio || 'Seleccionar municipio...'}</Text>
                <Text style={s.selectArrow}>{showMunis ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showMunis && (
                <View style={s.dropdown}>
                  <TextInput style={s.searchInput} value={searchMuni} onChangeText={setSearchMuni} placeholder="Buscar municipio..." placeholderTextColor={Colors.gray400} />
                  <ScrollView style={{ maxHeight: rh(160) }} nestedScrollEnabled>
                    {MUNICIPIOS_HIDALGO
                      .filter(m => m.toLowerCase().includes(searchMuni.toLowerCase()))
                      .map(m => (
                        <TouchableOpacity key={m} style={[s.dropdownItem, form.municipio === m && s.dropdownItemActive]} onPress={() => { set('municipio', m); setShowMunis(false); setSearchMuni(''); }}>
                          <Text style={[s.dropdownItemText, form.municipio === m && s.dropdownItemTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </ScrollView>
                </View>
              )}
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Localidad / Ejido *</Text>
              <TextInput style={s.fieldInput} value={form.localidad} onChangeText={v => set('localidad', v)} placeholder="Escribe la localidad o ejido" placeholderTextColor={Colors.gray400} />
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}><Text style={s.cardIconText}>🌾</Text></View>
              <View style={s.cardTitleBox}>
                <Text style={s.cardTitle}>Datos Agrícolas</Text>
                <Text style={s.cardSubtitle}>Información de la parcela</Text>
              </View>
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Folio SADERH *</Text>
              <TextInput style={s.fieldInput} value={form.folio_saderh} onChangeText={v => set('folio_saderh', v.toUpperCase())} placeholder="HGO-2024-000000" placeholderTextColor={Colors.gray400} autoCapitalize="characters" />
            </View>
            
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Cadena Productiva *</Text>
              <TextInput style={s.fieldInput} value={form.cadena_productiva} onChangeText={v => set('cadena_productiva', v)} placeholder="Ej: Maíz, Frijol, Chile, etc." placeholderTextColor={Colors.gray400} />
            </View>
          </View>

          <TouchableOpacity style={[s.primaryBtn, loading && s.btnDisabled]} onPress={guardar} disabled={loading}>
            <Text style={s.primaryBtnText}>{loading ? '⏳ Guardando...' : '✅ Registrar Beneficiario'}</Text>
          </TouchableOpacity>
          <View style={{ height: rh(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.guinda, paddingHorizontal: rw(20), paddingVertical: rh(16) },
  hT: { fontSize: fontSize.xl, fontWeight: '800', color: Colors.white },
  hS: { fontSize: fontSize.sm, color: Colors.white + 'AA', marginTop: rh(2) },
  progressBg: { height: rh(3), backgroundColor: Colors.guindaDark },
  progressFill: { height: rh(3), backgroundColor: Colors.dorado },
  content: { padding: rw(16), gap: rh(12) },
  
  card: {
    backgroundColor: Colors.white,
    borderRadius: radius.lg,
    padding: rw(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rh(16) },
  cardIcon: { width: rw(44), height: rw(44), borderRadius: rw(22), backgroundColor: Colors.guindaAlpha, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 22 },
  cardTitleBox: { marginLeft: rw(12), flex: 1 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  cardSubtitle: { fontSize: fontSize.sm, color: Colors.textSecondary, marginTop: rh(2) },
  
  fieldGroup: { marginBottom: rh(14) },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: rh(6) },
  fieldInput: {
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: rw(12),
    paddingVertical: rh(10),
    minHeight: rh(46),
    fontSize: fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.gray50,
    width: '100%',
  },
  fieldHint: { fontSize: fontSize.xs, color: Colors.textSecondary, marginTop: rh(4), textAlign: 'right' },
  
  selectBtn: {
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: rw(12),
    paddingVertical: rh(10),
    minHeight: rh(46),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  selectBtnText: { fontSize: fontSize.base, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.gray400 },
  selectArrow: { fontSize: fontSize.xs, color: Colors.textSecondary },
  
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginTop: rh(8),
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: rw(10),
    paddingVertical: rh(10),
    minHeight: rh(42),
    fontSize: fontSize.base,
    color: Colors.textPrimary,
    width: '100%',
  },
  dropdownItem: { padding: rh(12), borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemActive: { backgroundColor: Colors.guindaAlpha },
  dropdownItemText: { fontSize: fontSize.base, color: Colors.textPrimary },
  dropdownItemTextActive: { color: Colors.guinda, fontWeight: '700' },
  
  primaryBtn: {
    backgroundColor: Colors.guinda,
    borderRadius: radius.md,
    paddingVertical: rh(14),
    alignItems: 'center',
    shadowColor: Colors.guinda,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: Colors.white, fontSize: fontSize.base, fontWeight: '700' },
  
  noAcc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rh(14), padding: rw(40) },
  noAccT: { fontSize: fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  noAccD: { fontSize: fontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});