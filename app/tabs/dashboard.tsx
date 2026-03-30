import { Colors } from '@/constants/Colors';
import { ASIG_CACHE_KEY, LAST_SYNC_TIME_KEY, CACHE_VALIDITY_MS, BITACORAS_CERRADAS_CACHE_KEY, BITACORAS_CERRADAS_TTL } from '@/constants/CacheKeys';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { asignacionesApi, bitacorasApi, offlineQueue, syncApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Asignacion } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TC: Record<string, string> = { BENEFICIARIO: '#7c3aed', ACTIVIDAD: '#0891b2' };

const getEstadoBitacoraColor = (item: Asignacion): string => {
  if (item.completado) return Colors.success;
  if (item.fecha_limite) {
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    const limite = new Date(item.fecha_limite);
    limite.setUTCHours(0, 0, 0, 0);
    if (limite.getTime() < hoy.getTime()) return Colors.danger;
  }
  return Colors.warning;
};
const fmt = (d: Date) => d.toISOString().split('T')[0];
const fmtL = (d: Date) => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Helper para comparar y mergear datos
const mergeAsignaciones = (cached: Asignacion[], fresh: Asignacion[]): Asignacion[] => {
  const map = new Map(cached.map(a => [a.id_asignacion, a]));
  fresh.forEach(f => map.set(f.id_asignacion, f)); // Last-write-wins
  return Array.from(map.values());
};

const tecnicoMatches = (asignacion: Asignacion, tecnicoId?: string) => {
  if (!tecnicoId) return true;
  if (asignacion.id_tecnico === null || asignacion.id_tecnico === undefined || asignacion.id_tecnico === '') return true;
  return String(asignacion.id_tecnico).trim() === String(tecnicoId).trim();
};

const sortAsignaciones = (items: Asignacion[]) =>
  [...items].sort((a, b) => {
    const fechaA = a.fecha_limite ?? a.updated_at ?? a.created_at ?? '';
    const fechaB = b.fecha_limite ?? b.updated_at ?? b.created_at ?? '';
    return fechaA.localeCompare(fechaB);
  });

const getAsignacionesCacheKey = (tecnicoId?: string) =>
  `${ASIG_CACHE_KEY}:${tecnicoId ?? 'anon'}`;

const getLastSyncTimeKey = (tecnicoId?: string) =>
  `${LAST_SYNC_TIME_KEY}:${tecnicoId ?? 'anon'}`;

const mapDeltaBeneficiarioToAsignacion = (beneficiario: any, syncTs: string): Asignacion => ({
  id: `beneficiario-${beneficiario.id_beneficiario ?? beneficiario.id}`,
  nombre: beneficiario.nombre_completo ?? beneficiario.nombre,
  descripcion: beneficiario.cadena_productiva ?? 'Beneficiario asignado',
  activo: beneficiario.activo ?? true,
  created_by: '',
  created_at: beneficiario.created_at ?? syncTs,
  updated_at: beneficiario.updated_at ?? syncTs,
  id_asignacion: `beneficiario-${beneficiario.id_beneficiario ?? beneficiario.id}`,
  id_tecnico: beneficiario.id_tecnico ?? beneficiario.tecnico_id ?? '',
  id_beneficiario: beneficiario.id_beneficiario ?? beneficiario.id,
  tipo_asignacion: 'beneficiario',
  descripcion_actividad: beneficiario.cadena_productiva ?? 'Seguimiento de beneficiario',
  prioridad: 'MEDIA',
  completado: false,
  beneficiario: {
    ...beneficiario,
    id: beneficiario.id_beneficiario ?? beneficiario.id,
    nombre: beneficiario.nombre ?? beneficiario.nombre_completo ?? '',
    nombre_completo: beneficiario.nombre_completo ?? beneficiario.nombre ?? '',
    activo: beneficiario.activo ?? true,
  },
});

const mapDeltaActividadToAsignacion = (actividad: any): Asignacion => ({
  ...actividad,
  id_asignacion: actividad.id,
  id_tecnico: actividad.id_tecnico ?? actividad.tecnico_id ?? '',
  id_usuario_creo: actividad.created_by,
  id_beneficiario: actividad.id_beneficiario ?? actividad.beneficiario_id ?? '',
  tipo_asignacion: 'actividad',
  descripcion_actividad: actividad.descripcion,
  prioridad: 'MEDIA',
  completado: false,
});

export default function Dashboard() {
  const { tecnico, isOffline, setOffline, token } = useAuthStore();
  const [asigs, setAsigs] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendientes, setPendientes] = useState(0);
  const [queueFillPercent, setQueueFillPercent] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'warning' | 'error'>('synced');

  const pendientesAsigs = useMemo(() => asigs.filter(a => !a.completado).length, [asigs]);

  const syncPendientes = useCallback(async () => {
    const count = await offlineQueue.countPendingBitacoras();
    setPendientes(count);
    
    // Verificar si la cola offline está casi llena
    const fillPercentage = await offlineQueue.getQueueFillPercentage();
    setQueueFillPercent(fillPercentage);
    
    // Actualizar estado visual basado en cantidad de pendientes
    if (count === 0) {
      setSyncStatus('synced');
    } else if (count <= 5) {
      setSyncStatus('pending');
    } else if (count <= 10) {
      setSyncStatus('warning');
    } else {
      setSyncStatus('error');
    }
    
    if (fillPercentage > 80) {
      console.warn(`⚠️ Offline queue ${fillPercentage.toFixed(0)}% llena!`);
      setSyncStatus('error');
    }
    
    if (!count) return 0;

    const r = await syncApi.sincronizarPendientes();
    const remaining = await offlineQueue.countPendingBitacoras();
    setPendientes(remaining);
    
    // Actualizar estado después de sincronizar
    if (remaining === 0) {
      setSyncStatus('synced');
    } else if (remaining <= 5) {
      setSyncStatus('pending');
    } else if (remaining <= 10) {
      setSyncStatus('warning');
    } else {
      setSyncStatus('error');
    }
    
    return r.sincronizadas ?? 0;
  }, []);

  const cargar = useCallback(async () => {
    const asignacionesCacheKey = getAsignacionesCacheKey(tecnico?.id);
    const lastSyncTimeKey = getLastSyncTimeKey(tecnico?.id);
    try {
      setErrorMsg('');
      
      // Esperar a que el token esté disponible
      if (!token) {
        console.log('[DASHBOARD] Esperando token de autenticación...');
        // Intentar obtener el token directamente de AsyncStorage
        const storedToken = await AsyncStorage.getItem('@saderh:token');
        if (!storedToken) {
          setErrorMsg('Por favor, inicia sesión nuevamente');
          setLoading(false);
          return;
        }
      }
      
      const online = await syncApi.healthCheck();
      setOffline(!online);
      
      if (!online) {
        //Modo offline - cargar desde cache
        try {
          const cacheEntry = await AsyncStorage.getItem(asignacionesCacheKey);
          if (cacheEntry) {
            const parsed = JSON.parse(cacheEntry) as { data: Asignacion[]; timestamp: number };
            if (Array.isArray(parsed.data)) {
              const offlineData = parsed.data.filter((a) => tecnicoMatches(a, tecnico?.id));
              setAsigs(offlineData);
              setErrorMsg('📱 Offline: mostrando datos guardados localmente.');
            }
          }
        } catch { /* ignore cache errors */ }
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Online - sincronizar pendientes PRIMERO
      await syncPendientes();
      
      // Obtener bitácoras cerradas para actualizar estado de completado (con caché)
      let bitacorasCerradas: Array<{ id: string; tipo: string; beneficiario_id?: string; actividad_id?: string }> = [];
      try {
        const cachedCerradas = await AsyncStorage.getItem(BITACORAS_CERRADAS_CACHE_KEY);
        if (cachedCerradas) {
          const { data, timestamp } = JSON.parse(cachedCerradas);
          if (Date.now() - timestamp < BITACORAS_CERRADAS_TTL) {
            bitacorasCerradas = data;
          }
        }
        if (!bitacorasCerradas.length) {
          bitacorasCerradas = await bitacorasApi.listarCerradas();
          await AsyncStorage.setItem(BITACORAS_CERRADAS_CACHE_KEY, JSON.stringify({
            data: bitacorasCerradas,
            timestamp: Date.now()
          }));
        }
      } catch (e) {
        console.warn('Error obteniendo bitácoras cerradas:', e);
      }
      
      // Obtener último timestamp de sincronización
      const lastSyncTime = await AsyncStorage.getItem(lastSyncTimeKey);
      
      // CRÍTICO: Obtener delta de cambios desde el servidor
      let fresh: Asignacion[] = [];
      try {
        const deltaResponse = await syncApi.delta(lastSyncTime || undefined);
        const beneficiariosDelta = Array.isArray(deltaResponse.beneficiarios)
          ? deltaResponse.beneficiarios.map((beneficiario) => mapDeltaBeneficiarioToAsignacion(beneficiario, deltaResponse.sync_ts))
          : [];
        const actividadesDelta = Array.isArray(deltaResponse.actividades)
          ? deltaResponse.actividades.map((actividad) => mapDeltaActividadToAsignacion(actividad))
          : [];
        fresh = [...beneficiariosDelta, ...actividadesDelta];
      } catch (deltaError) {
        // Si delta falla, hacer fetch completo
        console.warn('Delta sync falló, haciendo fetch completo:', deltaError);
        const r = await asignacionesApi.listar();
        fresh = r.asignaciones ?? [];
      }
      
      // Obtener caché actual
      let cached: Asignacion[] = [];
      try {
        const cacheEntry = await AsyncStorage.getItem(asignacionesCacheKey);
        if (cacheEntry) {
          const parsed = JSON.parse(cacheEntry) as { data: Asignacion[]; timestamp: number };
          if (Array.isArray(parsed.data)) {
            cached = parsed.data.filter((a) => tecnicoMatches(a, tecnico?.id));
          }
        }
      } catch { /* ignore */ }

      // Si no había cache útil y el delta no trajo nada, pedir carga completa.
      if (fresh.length === 0 && cached.length === 0) {
        const fullResponse = await asignacionesApi.listar();
        fresh = fullResponse.asignaciones ?? [];
      }
      
      // Mergear datos (nuevos del servidor sobreescriben cache)
      const merged = sortAsignaciones(mergeAsignaciones(cached, fresh).filter((a) => a.activo !== false));
      
      // Filtrar por técnico
      const filtered = merged.filter((a) => tecnicoMatches(a, tecnico?.id));
      
      // Actualizar estado de completado basado en bitácoras cerradas
      const filteredWithCompletion = filtered.map(asig => {
        const tieneCerrada = bitacorasCerradas.some(bc => {
          if (asig.tipo_asignacion === 'beneficiario') {
            return bc.tipo === 'beneficiario' && bc.beneficiario_id === asig.id_beneficiario;
          } else {
            return bc.tipo === 'actividad' && bc.actividad_id === asig.id_asignacion;
          }
        });
        return { ...asig, completado: tieneCerrada };
      });
      
      setAsigs(filteredWithCompletion);
      
      // Guardar caché con metadata (incluyendo estado de completado)
      await AsyncStorage.setItem(asignacionesCacheKey, JSON.stringify({
        data: filteredWithCompletion,
        timestamp: Date.now(),
        version: 1
      }));
      
      // Actualizar última sincronización
      await AsyncStorage.setItem(lastSyncTimeKey, new Date().toISOString());
    }
    catch (e: any) {
      console.error('Error cargando asignaciones:', e);
      const isNetworkErr = syncApi.isNetworkError(e);
      
      try {
        const cacheEntry = await AsyncStorage.getItem(asignacionesCacheKey);
        if (cacheEntry) {
          const parsed = JSON.parse(cacheEntry) as { data: Asignacion[]; timestamp: number };
          const cacheAge = Date.now() - parsed.timestamp;
          const isCacheValid = cacheAge < CACHE_VALIDITY_MS;
          
          if (Array.isArray(parsed.data)) {
            const cachedData = parsed.data.filter((a) => tecnicoMatches(a, tecnico?.id));
            setAsigs(cachedData);
            const ageStr = isCacheValid ? `hace ${Math.round(cacheAge / 60000)}m` : 'cache expirado';
            setErrorMsg(isNetworkErr 
              ? `📡 Sin conexión: datos locales (${ageStr}).` 
              : `⚠️ Error del servidor: datos locales (${ageStr}).`);
          } else {
            setAsigs([]);
            setErrorMsg('No se pudieron cargar las asignaciones.');
          }
        } else {
          setAsigs([]);
          setErrorMsg('No se pudieron cargar las asignaciones.');
        }
      } catch {
        setAsigs([]);
        setErrorMsg('No se pudieron cargar las asignaciones.');
      }
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [setOffline, syncPendientes, tecnico?.id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const t = setInterval(() => {
      cargar().catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  }, [cargar]);

  const hoy = new Date();
  const man = new Date(hoy); man.setDate(hoy.getDate() + 1);

  const fil = asigs.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.beneficiario?.nombre_completo ?? '').toLowerCase().includes(q) ||
      (a.beneficiario?.nombre ?? '').toLowerCase().includes(q) ||
      (a.beneficiario?.municipio ?? '').toLowerCase().includes(q) ||
      (a.beneficiario?.folio_saderh ?? '').toLowerCase().includes(q) ||
      (a.descripcion_actividad ?? '').toLowerCase().includes(q);
  });

  const grp = {
    hoy: fil.filter(a => (a.fecha_limite ?? '') === fmt(hoy) && !a.completado),
    man: fil.filter(a => (a.fecha_limite ?? '') === fmt(man) && !a.completado),
    prox: fil.filter(a => (a.fecha_limite ?? '') > fmt(man) && !a.completado),
    sinFecha: fil.filter(a => !(a.fecha_limite ?? '').trim() && !a.completado),
    done: fil.filter(a => a.completado),
  };

  const VisitaCard = ({ item }: { item: Asignacion }) => {
    // Use time from API response or default
    const hora = '09:00 AM';
    const nombreVisible = item.beneficiario?.nombre_completo ?? item.beneficiario?.nombre ?? item.nombre ?? '—';
    const ini = nombreVisible.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    const tc = TC[item.tipo_asignacion ?? 'actividad'] ?? Colors.gray500;
    return (
      <TouchableOpacity
        style={[s.card, item.completado && s.cardDone]}
        onPress={() => router.push({ pathname: '/stack/detalle-asignacion', params: { id: String(item.id_asignacion) } })}
        activeOpacity={0.75}
      >
        <View style={[s.av, { backgroundColor: tc }]}><Text style={s.avT}>{ini}</Text></View>
        <View style={s.body}>
          <View style={s.row}>
            <Text style={s.nom} numberOfLines={1}>{nombreVisible}</Text>
            <Text style={s.hora}>{hora}</Text>
          </View>
          <View style={s.row2}>
            <View style={[s.badge, { backgroundColor: tc + '22' }]}>
              <Text style={[s.badgeT, { color: tc }]}>{(item.tipo_asignacion ?? 'actividad') === 'beneficiario' ? 'Visita' : 'Actividad'}</Text>
            </View>
            <Text style={s.muni} numberOfLines={1}>📍 {item.beneficiario?.municipio}</Text>
          </View>
          {!!item.descripcion_actividad && <Text style={s.desc} numberOfLines={1}>{item.descripcion_actividad}</Text>}
        </View>
        <View style={s.right}>
          <View style={[s.pdot, { backgroundColor: getEstadoBitacoraColor(item) }]} />
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
        {items.map(item => (
          // @ts-ignore
          <VisitaCard key={item.id_asignacion} item={item} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greet}>Buenos días 👋</Text>
          <Text style={s.uName}>{tecnico?.nombre?.split(' ')[0] ?? 'Técnico'}</Text>
          <Text style={s.zona}>{tecnico?.rol ?? ''}</Text>
        </View>
        <View style={s.hR}>
          {isOffline && <View style={s.offBadge}><Text style={s.offBadgeT}>OFFLINE</Text></View>}
          {pendientes > 0 && <View style={s.pendBadge}><Text style={s.pendBadgeT}>PEND {pendientes}</Text></View>}
          <View style={[s.syncBadge, s[`syncBadge${syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}`]]}>
            <Text style={s.syncBadgeT}>{syncStatus === 'synced' ? '✓' : syncStatus === 'pending' ? '⏳' : '⚠'}</Text>
          </View>
          <View style={s.cnt}>
            <Text style={s.cntN}>{pendientesAsigs}</Text>
            <Text style={s.cntL}>pendientes</Text>
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

      {/* Tarjeta de estado de sincronización */}
      <View style={s.syncStatusCard}>
        <View style={s.syncStatusRow}>
          <View style={[s.syncStatusDot, s[`syncDot${syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}`]]} />
          <Text style={s.syncStatusText}>
            {syncStatus === 'synced' && '✓ Todo sincronizado'}
            {syncStatus === 'pending' && `⏳ ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`}
            {syncStatus === 'warning' && `⚠️ ${pendientes} pendientes - Sincroniza pronto`}
            {syncStatus === 'error' && `🔴 ${pendientes} pendientes - Cola llena`}
          </Text>
        </View>
        {pendientes > 0 && (
          <Text style={s.syncStatusSubtext}>
            Se sincroniza automáticamente al reconectar
          </Text>
        )}
      </View>

      {/* Alerta de capacidad offline llena */}
      {queueFillPercent > 80 && (
        <View style={s.alertCapacity}>
          <Text style={s.alertCapacityText}>
            ⚠️ Almacenamiento offline {queueFillPercent.toFixed(0)}% lleno. Conéctate pronto para sincronizar.
          </Text>
        </View>
      )}

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
          <View style={s.serverCard}>
            <Text style={s.serverCardT}>Mostrando asignaciones desde el servidor. Desliza para actualizar.</Text>
          </View>
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
              <Text style={s.emptyT}>Sin asignaciones</Text>
              <Text style={s.emptyD}>
                {search
                  ? 'No hay resultados.'
                  : 'Este técnico no tiene beneficiarios ni actividades asignadas por el momento.'}
              </Text>
            </View>
          ) : (
            <>
              <Seccion titulo={`Hoy · ${fmtL(hoy)}`} items={grp.hoy} badge={grp.hoy.length} />
              <Seccion titulo={`Mañana · ${fmtL(man)}`} items={grp.man} />
              <Seccion titulo="Próximas" items={grp.prox} />
              <Seccion titulo="Asignadas Sin Fecha" items={grp.sinFecha} />
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
  syncBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  syncBadgeT: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  syncBadgeSynced: { backgroundColor: Colors.success },
  syncBadgePending: { backgroundColor: Colors.warning },
  syncBadgeWarning: { backgroundColor: Colors.danger },
  syncBadgeError: { backgroundColor: Colors.danger },
  syncDotSynced: { backgroundColor: Colors.success },
  syncDotPending: { backgroundColor: Colors.warning },
  syncDotWarning: { backgroundColor: Colors.danger },
  syncDotError: { backgroundColor: Colors.danger },
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
  syncStatusCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
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
  alertCapacity: { backgroundColor: Colors.warning + '20', borderTopWidth: 2, borderTopColor: Colors.warning, paddingHorizontal: 16, paddingVertical: 10 },
  alertCapacityText: { fontSize: 12, color: Colors.textPrimary, fontWeight: '600', lineHeight: 18 },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  syncStatusSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
