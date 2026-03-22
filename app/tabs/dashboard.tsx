import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { asignacionesApi, getConnectionInfo, offlineQueue, syncApi } from '@/lib/api';
import { DEMO_HORARIOS } from '@/lib/demoData';
import { useAuthStore } from '@/store/authStore';
import { Asignacion } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PC: Record<string, string> = { ALTA: Colors.danger, MEDIA: Colors.warning, BAJA: Colors.success };
const TC: Record<string, string> = { BENEFICIARIO: '#7c3aed', ACTIVIDAD: '#0891b2' };
const fmt = (d: Date) => d.toISOString().split('T')[0];
const fmtL = (d: Date) => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
const ASIG_CACHE_KEY = '@saderh:asignaciones_cache';

export default function Dashboard() {
  const { usuario, isDemo, isOffline, setOffline } = useAuthStore();
  const [asigs, setAsigs] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setIsDemoMode(cfg.modoDemo))
      .catch(() => {});
  }, []);

  const syncPendientes = useCallback(async () => {
    const count = await offlineQueue.countPendingBitacoras();
    setPendientes(count);
    if (!count) return 0;

    const r = await syncApi.sincronizarPendientes();
    const remaining = await offlineQueue.countPendingBitacoras();
    setPendientes(remaining);
    return r.sincronizadas ?? 0;
  }, []);

  const cargar = useCallback(async () => {
    try {
      setErrorMsg('');
      const online = await syncApi.healthCheck();
      setOffline(!online);
      if (online) {
        await syncPendientes();
      }
      const r = await asignacionesApi.listar(false);
      const raw = r.asignaciones ?? [];
      const filtered = raw.filter((a) => !usuario?.id_usuario || !a.id_tecnico || a.id_tecnico === usuario.id_usuario);
      setAsigs(filtered);
      await AsyncStorage.setItem(ASIG_CACHE_KEY, JSON.stringify(filtered));
    }
    catch (e) {
      console.error(e);
      try {
        const rawCache = await AsyncStorage.getItem(ASIG_CACHE_KEY);
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed)) {
            setAsigs(parsed as Asignacion[]);
            setErrorMsg('Sin internet: mostrando asignaciones guardadas localmente.');
          } else {
            setAsigs([]);
            setErrorMsg('No se pudieron cargar tus asignaciones desde el servidor.');
          }
        } else {
          setAsigs([]);
          setErrorMsg('No se pudieron cargar tus asignaciones desde el servidor.');
        }
      } catch {
        setAsigs([]);
        setErrorMsg('No se pudieron cargar tus asignaciones desde el servidor.');
      }
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [setOffline, syncPendientes, usuario?.id_usuario]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const t = setInterval(() => {
      cargar().catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [cargar]);

  const hoy = new Date();
  const man = new Date(hoy); man.setDate(hoy.getDate() + 1);

  const fil = asigs.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.beneficiario?.nombre_completo ?? '').toLowerCase().includes(q) ||
      (a.beneficiario?.municipio ?? '').toLowerCase().includes(q) ||
      (a.descripcion_actividad ?? '').toLowerCase().includes(q);
  });

  const grp = {
    hoy: fil.filter(a => a.fecha_limite === fmt(hoy) && !a.completado),
    man: fil.filter(a => a.fecha_limite === fmt(man) && !a.completado),
    prox: fil.filter(a => a.fecha_limite > fmt(man) && !a.completado),
    done: fil.filter(a => a.completado),
  };

  const VisitaCard = ({ item }: { item: Asignacion }) => {
    const hora = DEMO_HORARIOS[item.id_asignacion] ?? '09:00 AM';
    const ini = (item.beneficiario?.nombre_completo ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const tc = TC[item.tipo_asignacion] ?? Colors.gray500;
    return (
      <TouchableOpacity
        style={[s.card, item.completado && s.cardDone]}
        onPress={() => router.push({ pathname: '/stack/detalle-asignacion', params: { id: String(item.id_asignacion) } })}
        activeOpacity={0.75}
      >
        <View style={[s.av, { backgroundColor: tc }]}><Text style={s.avT}>{ini}</Text></View>
        <View style={s.body}>
          <View style={s.row}>
            <Text style={s.nom} numberOfLines={1}>{item.beneficiario?.nombre_completo ?? '—'}</Text>
            <Text style={s.hora}>{hora}</Text>
          </View>
          <View style={s.row2}>
            <View style={[s.badge, { backgroundColor: tc + '22' }]}>
              <Text style={[s.badgeT, { color: tc }]}>{item.tipo_asignacion === 'BENEFICIARIO' ? 'Visita' : 'Actividad'}</Text>
            </View>
            <Text style={s.muni} numberOfLines={1}>📍 {item.beneficiario?.municipio}</Text>
          </View>
          {!!item.descripcion_actividad && <Text style={s.desc} numberOfLines={1}>{item.descripcion_actividad}</Text>}
        </View>
        <View style={s.right}>
          <View style={[s.pdot, { backgroundColor: PC[item.prioridad] }]} />
          <Text style={s.chev}>{item.completado ? '✅' : '›'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const Seccion = ({ titulo, items, badge }: { titulo: string; items: Asignacion[]; badge?: number }) => {
    if (!items.length) return null;
    return (
      <View style={s.sec}>
        <View style={s.secH}>
          <Text style={s.secT}>{titulo}</Text>
          {badge !== undefined && <View style={s.secB}><Text style={s.secBT}>{badge} visita{badge !== 1 ? 's' : ''}</Text></View>}
        </View>
        {items.map(item => <VisitaCard key={item.id_asignacion} item={item} />)}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greet}>Buenos días 👋</Text>
          <Text style={s.uName}>{usuario?.nombre_completo?.split(' ')[0] ?? 'Técnico'}</Text>
          <Text style={s.zona}>{usuario?.zona_nombre ?? ''}</Text>
        </View>
        <View style={s.hR}>
          {isDemo && <View style={s.demoBadge}><Text style={s.demoBadgeT}>DEMO</Text></View>}
          {isOffline && <View style={s.offBadge}><Text style={s.offBadgeT}>OFFLINE</Text></View>}
          {pendientes > 0 && <View style={s.pendBadge}><Text style={s.pendBadgeT}>PEND {pendientes}</Text></View>}
          <View style={s.cnt}>
            <Text style={s.cntN}>{grp.hoy.length}</Text>
            <Text style={s.cntL}>hoy</Text>
          </View>
        </View>
      </View>

      {/* Buscador */}
      <View style={s.srchWrap}>
        <View style={s.srchBox}>
          <Text style={{ fontSize: 15 }}>🔍</Text>
          <TextInput
            style={s.srchIn} value={search} onChangeText={setSearch}
            placeholder="Buscar beneficiarios o municipios..."
            placeholderTextColor={Colors.gray400} returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: Colors.gray400, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={s.load}>
          <ActivityIndicator size="large" color={Colors.guinda} />
          <Text style={s.loadT}>Cargando visitas...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.list} contentContainerStyle={s.listC}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={Colors.guinda} colors={[Colors.guinda]} />}
        >
          {!isDemoMode && (
            <View style={s.serverCard}>
              <Text style={s.serverCardT}>Mostrando solo asignaciones previamente cargadas en web para tu usuario.</Text>
            </View>
          )}
          {pendientes > 0 && (
            <View style={s.pendingCard}>
              <Text style={s.pendingCardT}>
                Tienes {pendientes} registro{pendientes !== 1 ? 's' : ''} guardado{pendientes !== 1 ? 's' : ''} offline. Se sincroniza automáticamente al reconectar.
              </Text>
            </View>
          )}
          {!!errorMsg && (
            <View style={s.errorCard}>
              <Text style={s.errorCardT}>{errorMsg}</Text>
            </View>
          )}
          {!fil.length ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 52 }}>📭</Text>
              <Text style={s.emptyT}>Sin visitas asignadas</Text>
              <Text style={s.emptyD}>
                {search
                  ? 'No hay resultados.'
                  : 'Solo verás beneficiarios y actividades que te asignaron previamente en la plataforma web.'}
              </Text>
            </View>
          ) : (
            <>
              <Seccion titulo={`Hoy · ${fmtL(hoy)}`} items={grp.hoy} badge={grp.hoy.length} />
              <Seccion titulo={`Mañana · ${fmtL(man)}`} items={grp.man} />
              <Seccion titulo="Próximas" items={grp.prox} />
              <Seccion titulo="Completadas" items={grp.done} />
            </>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.guinda, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  greet: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  uName: { fontSize: 22, fontWeight: '800', color: Colors.white },
  zona: { fontSize: 11, color: Colors.dorado, fontWeight: '500' },
  hR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoBadge: { backgroundColor: Colors.dorado, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  demoBadgeT: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  offBadge: { backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  offBadgeT: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  pendBadge: { backgroundColor: Colors.info, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  pendBadgeT: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  cnt: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', minWidth: 52 },
  cntN: { fontSize: 24, fontWeight: '900', color: Colors.white, lineHeight: 28 },
  cntL: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  srchWrap: { backgroundColor: Colors.guinda, paddingHorizontal: 16, paddingBottom: 16 },
  srchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  srchIn: { flex: 1, fontSize: 14, color: Colors.textPrimary, minHeight: rh(24), paddingVertical: 0 },
  load: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadT: { fontSize: 14, color: Colors.textSecondary },
  list: { flex: 1 }, listC: { padding: 16 },
  sec: { marginBottom: 6 },
  secH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 10 },
  secT: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  secB: { backgroundColor: Colors.guinda, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  secBT: { fontSize: 11, color: Colors.white, fontWeight: '700' },
  serverCard: {
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.info + '33',
  },
  serverCardT: { color: Colors.info, fontSize: 12, fontWeight: '600' },
  pendingCard: {
    backgroundColor: Colors.warning + '14',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
  },
  pendingCardT: { color: Colors.warning, fontSize: 12, fontWeight: '600' },
  errorCard: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.danger + '33',
  },
  errorCardT: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardDone: { opacity: 0.5 },
  av: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avT: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  body: { flex: 1, minWidth: 0, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nom: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  hora: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeT: { fontSize: 11, fontWeight: '700' },
  muni: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  desc: { fontSize: 12, color: Colors.textLight, fontStyle: 'italic' },
  right: { alignItems: 'center', gap: 6, flexShrink: 0 },
  pdot: { width: 8, height: 8, borderRadius: 4 },
  chev: { fontSize: 22, color: Colors.gray300 },
  empty: { alignItems: 'center', paddingTop: 70, gap: 12 },
  emptyT: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyD: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
