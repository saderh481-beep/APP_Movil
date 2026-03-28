import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw } from '@/lib/responsive';
import { asignacionesApi, bitacorasApi, offlineQueue, syncApi } from '@/lib/api';
import { TIPOS_INCIDENTE } from '@/lib/demoData';
import { useAuthStore } from '@/store/authStore';
import { Asignacion, Beneficiario, Bitacora, DatosExtendidos } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type Paso = 3 | 4 | 5;
type Punto = { x: number; y: number };
type Trazo = Punto[];
const OFFLINE_DIR = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}offline-bitacoras`;
const ASIG_CACHE_KEY = '@saderh:asignaciones_cache';
const getAsignacionesCacheKey = (tecnicoId?: string) =>
  `${ASIG_CACHE_KEY}:${tecnicoId ?? 'anon'}`;
const getBitacoraDraftKey = (tecnicoId?: string, asignacionId?: string) =>
  `@saderh:draft:bitacora:${tecnicoId ?? 'anon'}:${asignacionId ?? 'sin-asignacion'}`;
const tecnicoMatches = (asignacion: Asignacion, tecnicoId?: string) => {
  if (!tecnicoId) return true;
  if (asignacion.id_tecnico === null || asignacion.id_tecnico === undefined || asignacion.id_tecnico === '') return true;
  return String(asignacion.id_tecnico).trim() === String(tecnicoId).trim();
};

const pathFromStroke = (stroke: Trazo): string => {
  if (!stroke.length) return '';
  if (stroke.length === 1) {
    const p = stroke[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }

  let d = `M ${stroke[0].x.toFixed(1)} ${stroke[0].y.toFixed(1)}`;
  for (let i = 1; i < stroke.length; i += 1) {
    const prev = stroke[i - 1];
    const curr = stroke[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = stroke[stroke.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
};

function Stars({ val, onChange }: { val: number; onChange: (v: number) => void }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)}>
          <Text style={[s.star, i <= val && s.starOn]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Firma({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (payload: { ok: boolean; strokes: Trazo[] }) => void;
}) {
  const [strokes, setStrokes] = useState<Trazo[]>([]);
  const [current, setCurrent] = useState<Trazo>([]);
  const currentStroke = useRef<Trazo>([]);
  const strokesRef = useRef<Trazo[]>([]);
  const rafRef = useRef<number | null>(null);

  const syncCurrentStroke = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setCurrent([...currentStroke.current]);
    });
  };

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: () => enabled,
    onPanResponderGrant: (e: any) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      currentStroke.current = [{ x, y }];
      setCurrent([{ x, y }]);
    },
    onPanResponderMove: (e: any) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      currentStroke.current = [...currentStroke.current, { x, y }];
      syncCurrentStroke();
    },
    onPanResponderRelease: () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const stroke = currentStroke.current;
      if (stroke.length > 1) {
        const next = [...strokesRef.current, stroke];
        strokesRef.current = next;
        setStrokes(next);
        onChange({ ok: true, strokes: next });
      } else {
        onChange({ ok: strokesRef.current.length > 0, strokes: strokesRef.current });
      }
      currentStroke.current = [];
      setCurrent([]);
    },
  });

  const clear = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    currentStroke.current = [];
    strokesRef.current = [];
    setCurrent([]);
    setStrokes([]);
    onChange({ ok: false, strokes: [] });
  };

  return (
    <View>
      <View style={s.rowBetween}>
        <Text style={s.label}>Firma del beneficiario</Text>
        <TouchableOpacity onPress={clear} disabled={!strokes.length}>
          <Text style={[s.clear, !strokes.length && s.disabledText]}>Borrar</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.signatureCanvas, !enabled && s.signatureDisabled]} {...pan.panHandlers}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
          {strokes.map((stroke, i) => (
            <Path
              // @ts-ignore
              key={`stroke-${i}`}
              d={pathFromStroke(stroke)}
              stroke={Colors.guinda}
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {current.length > 1 && (
            <Path
              d={pathFromStroke(current)}
              stroke={Colors.guinda}
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
        {strokes.length === 0 && current.length === 0 && (
          <Text style={s.signatureHint}>{enabled ? 'Firme aquí con el dedo' : 'Primero toma foto de rostro'}</Text>
        )}
      </View>
    </View>
  );
}

const svgFirma = (strokes: Trazo[]) => {
  const points = strokes.flat();
  const maxX = Math.max(320, ...points.map((p) => p.x + 8));
  const maxY = Math.max(160, ...points.map((p) => p.y + 8));
  const paths = strokes
    .map(
      (stroke) =>
        `<path d="${pathFromStroke(stroke)}" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`,
    )
    .join('\n  ');
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${maxX}\" height=\"${maxY}\" viewBox=\"0 0 ${maxX} ${maxY}\">
  <rect width=\"100%\" height=\"100%\" fill=\"#ffffff\" />
  ${paths}
</svg>`;
};

const benFallback = (asig: Asignacion): Beneficiario => ({
  id: asig.id_beneficiario ?? 'unknown',
  nombre: 'Beneficiario sin datos',
  nombre_completo: 'Beneficiario sin datos',
  curp: '—',
  municipio: '—',
  localidad: '—',
  folio_saderh: '—',
  latitud_predio: null,
  longitud_predio: null,
  cadena_productiva: '—',
  telefono_contacto: null,
  activo: true,
  id_beneficiario: asig.id_beneficiario,
});

const extFromUri = (uri: string, fallback: string) => {
  const clean = uri.split('?')[0];
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  return m?.[1]?.toLowerCase() ?? fallback;
};

const persistForOffline = async (fromUri: string, prefix: string) => {
  if (!OFFLINE_DIR) throw new Error('No se pudo preparar almacenamiento offline.');
  await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
  const ext = extFromUri(fromUri, 'jpg');
  const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const toUri = `${OFFLINE_DIR}/${name}`;
  await FileSystem.copyAsync({ from: fromUri, to: toUri });
  return toUri;
};

const buildBitacoraTexts = (datos: DatosExtendidos) => {
  const incidentType = datos.tipo_incidente?.trim();
  const incidentDescription = datos.descripcion_incidente?.trim();
  const observaciones = datos.observaciones?.trim();
  const incidentSummary = [incidentType, incidentDescription].filter(Boolean).join(': ');
  const actividadesDesc = incidentSummary || observaciones || 'Visita de verificación completada en aplicación móvil.';

  return {
    observacionesCoordinador: observaciones || undefined,
    actividadesDesc,
    recomendaciones: observaciones || undefined,
    comentariosBeneficiario: incidentDescription || observaciones || undefined,
  };
};

export default function DetalleAsignacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tecnico, setOffline } = useAuthStore();
  const [paso, setPaso] = useState<Paso>(3);
  const [asig, setAsig] = useState<Asignacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [datos, setDatos] = useState<DatosExtendidos>({
    hay_incidentes: false,
    tipo_incidente: '',
    descripcion_incidente: '',
    observaciones: '',
    calidad_servicio: 0,
    calificacion_coordinacion: 0,
    cumplimiento_metas: true,
  });
  const [fotosCampo, setFotosCampo] = useState<string[]>([]);
  const [fotoRostro, setFotoRostro] = useState<string | null>(null);
  const [firmaOk, setFirmaOk] = useState(false);
  const [firmaStrokes, setFirmaStrokes] = useState<Trazo[]>([]);
  const [firmaKey, setFirmaKey] = useState(0);
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const progress = useRef(new Animated.Value(0.33)).current;

  const ensureGpsFix = async (): Promise<{ lat: number; lon: number } | null> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    const granted = permission.status === 'granted';
    setLocationPermissionGranted(granted);
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const nextGps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    setGps(nextGps);
    return nextGps;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const rawId = String(id ?? '');
      const idNum = Number.parseInt(rawId, 10);
      try {
        const res = await asignacionesApi.listar();
        if (!active) return;
        const visibles = (res.asignaciones ?? []).filter((a) => tecnicoMatches(a, tecnico?.id));
        setAsig(visibles.find((a) => String(a.id_asignacion ?? a.id) === rawId || (!Number.isNaN(idNum) && String(a.id_asignacion ?? a.id) === String(idNum))) ?? null);
      } catch {
        try {
          const rawCache = await AsyncStorage.getItem(getAsignacionesCacheKey(tecnico?.id));
          const parsed = rawCache ? JSON.parse(rawCache) : [];
          const arr = Array.isArray(parsed)
            ? (parsed as Asignacion[])
            : (Array.isArray(parsed?.data) ? parsed.data as Asignacion[] : []);
          const visibles = arr.filter((a) => tecnicoMatches(a, tecnico?.id));
          const found = visibles.find((a) => String(a.id_asignacion ?? a.id) === rawId || (!Number.isNaN(idNum) && Number(a.id_asignacion) === idNum)) ?? null;
          if (active) setAsig(found);
        } catch {
          if (active) setAsig(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      const granted = status === 'granted';
      if (active) setLocationPermissionGranted(granted);
      if (granted) {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then((l) => active && setGps({ lat: l.coords.latitude, lon: l.coords.longitude }))
          .catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [id, tecnico?.id]);

  useEffect(() => {
    let active = true;
    const restoreDraft = async () => {
      if (!tecnico?.id || !asig?.id_asignacion) return;
      try {
        const raw = await AsyncStorage.getItem(getBitacoraDraftKey(tecnico.id, String(asig.id_asignacion)));
        if (!raw || !active) return;
        const parsed = JSON.parse(raw) as {
          datos?: DatosExtendidos;
          fotosCampo?: string[];
          fotoRostro?: string | null;
          firmaStrokes?: Trazo[];
          gps?: { lat: number; lon: number } | null;
          startedAt?: string;
        };
        if (parsed.datos) setDatos((prev) => ({ ...prev, ...parsed.datos }));
        if (Array.isArray(parsed.fotosCampo)) setFotosCampo(parsed.fotosCampo);
        if (typeof parsed.fotoRostro === 'string' || parsed.fotoRostro === null) setFotoRostro(parsed.fotoRostro ?? null);
        if (Array.isArray(parsed.firmaStrokes)) {
          setFirmaStrokes(parsed.firmaStrokes);
          setFirmaOk(parsed.firmaStrokes.length > 0);
          setFirmaKey((k) => k + 1);
        }
        if (parsed.gps) setGps(parsed.gps);
        if (parsed.startedAt) setStartedAt(parsed.startedAt);
      } catch {
        // Ignore malformed drafts.
      }
    };
    restoreDraft();
    return () => {
      active = false;
    };
  }, [asig?.id_asignacion, tecnico?.id]);

  useEffect(() => {
    if (!tecnico?.id || !asig?.id_asignacion) return;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(
        getBitacoraDraftKey(tecnico.id, String(asig.id_asignacion)),
        JSON.stringify({
          startedAt,
          gps,
          datos,
          fotoRostro,
          fotosCampo,
          firmaStrokes,
          updated_at: new Date().toISOString(),
        }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [asig?.id_asignacion, tecnico?.id, startedAt, gps, datos, fotoRostro, fotosCampo, firmaStrokes]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: paso === 3 ? 0.33 : paso === 4 ? 0.66 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [paso, progress]);

  const setDato = <K extends keyof DatosExtendidos>(k: K, v: DatosExtendidos[K]) => setDatos((p: DatosExtendidos) => ({ ...p, [k]: v }));

  const tomarFotoCampo = async (fromCamera: boolean) => {
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sin permiso', 'Necesitas permiso de cámara.');
        return;
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setFotosCampo((p) => [...p, result.assets[0].uri]);
  };

  const capturarFotoRostro = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Necesitas permiso de cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
    if (!result.canceled) {
      setFotoRostro(result.assets[0].uri);
      setFirmaOk(false);
      setFirmaStrokes([]);
      setFirmaKey((k) => k + 1);
    }
  };

  const crearArchivoFirma = async () => {
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDir) throw new Error('No se pudo crear archivo temporal de firma.');
    const uri = `${baseDir}firma-${Date.now()}.svg`;
    await FileSystem.writeAsStringAsync(uri, svgFirma(firmaStrokes), { encoding: FileSystem.EncodingType.UTF8 });
    return uri;
  };

  const guardarPendienteOffline = async (payload: Omit<Bitacora, 'id_bitacora'>, firmaUri: string) => {
    if (!fotoRostro) throw new Error('Falta foto de rostro para modo offline.');

    const fotoRostroOffline = await persistForOffline(fotoRostro, 'rostro');
    const firmaOffline = await persistForOffline(firmaUri, 'firma');
    const fotosCampoOffline = await Promise.all(fotosCampo.map((u) => persistForOffline(u, 'campo')));

    await offlineQueue.pushPendingBitacora({
      local_id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      payload,
      foto_rostro_uri: fotoRostroOffline,
      firma_uri: firmaOffline,
      fotos_campo_uris: fotosCampoOffline,
    });
  };

  const finalizar = async () => {
    if (!asig || !tecnico) return;
    if (!locationPermissionGranted || !gps) {
      try {
        const freshGps = await ensureGpsFix();
        if (!freshGps) {
          Alert.alert('Ubicación requerida', 'Debes permitir la geolocalización y capturar tu ubicación para confirmar la visita con el beneficiario.');
          return;
        }
      } catch {
        Alert.alert('Ubicación requerida', 'No se pudo obtener la ubicación actual. Intenta nuevamente en el lugar de la visita.');
        return;
      }
    }
    if (!fotoRostro) {
      Alert.alert('Foto requerida', 'Antes de firmar debes tomar foto del rostro del beneficiario.');
      return;
    }
    if (!firmaOk || !firmaStrokes.length) {
      Alert.alert('Firma requerida', 'La firma del beneficiario es obligatoria.');
      return;
    }
    if (!datos.calidad_servicio || !datos.calificacion_coordinacion) {
      Alert.alert('Evaluación incompleta', 'Completa las dos calificaciones.');
      return;
    }

    setGuardando(true);
    let firmaUri: string | null = null;
    try {
      const now = new Date().toISOString();
      const currentGps = gps ?? await ensureGpsFix();
      if (!currentGps) {
        Alert.alert('Ubicación requerida', 'No se pudo validar tu ubicación para finalizar la visita.');
        return;
      }
      const tipoAsignacion = (asig?.tipo_asignacion ?? 'actividad') as 'beneficiario' | 'actividad';
      const cadenaProductivaId = asig?.beneficiario?.cadenas?.[0]?.id ?? undefined;
      const {
        observacionesCoordinador,
        actividadesDesc,
        recomendaciones,
        comentariosBeneficiario,
      } = buildBitacoraTexts(datos);
      const payload: Omit<Bitacora, 'id_bitacora'> = {
        id: `movil-${Date.now()}`,
        tipo: tipoAsignacion,
        estado: 'borrador',
        tecnico_id: String(tecnico.id),
        beneficiario_id: tipoAsignacion === 'beneficiario' ? asig?.id_beneficiario ?? undefined : undefined,
        cadena_productiva_id: cadenaProductivaId,
        actividad_id: tipoAsignacion === 'actividad' ? asig?.id_asignacion ?? undefined : undefined,
        fecha_inicio: startedAt,
        coord_inicio: `${currentGps.lat},${currentGps.lon}`,
        fecha_fin: now,
        coord_fin: `${currentGps.lat},${currentGps.lon}`,
        sincronizado: false,
        created_at: startedAt,
        updated_at: now,
        datos_extendidos: datos,
        calificacion: datos.calidad_servicio,
        reporte: datos.observaciones,
        observaciones_coordinador: observacionesCoordinador,
        actividades_desc: actividadesDesc,
        recomendaciones,
        comentarios_beneficiario: comentariosBeneficiario,
      };

      firmaUri = await crearArchivoFirma();

      try {
        const creada = await bitacorasApi.crear({
          tipo: payload.tipo,
          beneficiario_id: tipoAsignacion === 'beneficiario' ? payload.beneficiario_id ?? undefined : undefined,
          cadena_productiva_id: payload.cadena_productiva_id,
          actividad_id: tipoAsignacion === 'actividad' ? payload.actividad_id ?? undefined : undefined,
          fecha_inicio: startedAt,
          coord_inicio: `${currentGps.lat},${currentGps.lon}`,
        });
        const idBitacora =
          (creada as any)?.id_bitacora ??
          (creada as any)?.id ??
          (creada as any)?.data?.id_bitacora ??
          (creada as any)?.data?.id;
        if (!idBitacora) throw new Error('La API no devolvió id de bitácora.');

        await bitacorasApi.editar(idBitacora, {
          coord_inicio: payload.coord_inicio,
          coord_fin: payload.coord_fin,
          fecha_inicio: payload.fecha_inicio,
          fecha_fin: payload.fecha_fin,
          observaciones_coordinador: payload.observaciones_coordinador,
          actividades_desc: payload.actividades_desc,
          recomendaciones: payload.recomendaciones,
          comentarios_beneficiario: payload.comentarios_beneficiario,
          updated_at: payload.updated_at,
        });
        await bitacorasApi.subirFotoRostro(idBitacora, fotoRostro);
        await bitacorasApi.subirFirma(idBitacora, firmaUri);
        if (fotosCampo.length) await bitacorasApi.subirFotosCampo(idBitacora, fotosCampo);
        await bitacorasApi.cerrar(idBitacora, { fecha_fin: now, coord_fin: `${currentGps.lat},${currentGps.lon}` });
        setOffline(false);
        await AsyncStorage.removeItem(getBitacoraDraftKey(tecnico.id, String(asig.id_asignacion ?? id)));

        Alert.alert('Visita completada', 'Se guardó bitácora, validación de rostro y firma.', [
          { text: 'Finalizar', onPress: () => router.back() },
        ]);
      } catch (e) {
        if (syncApi.isNetworkError(e)) {
          setOffline(true);
          await guardarPendienteOffline(payload as any, firmaUri);
          await AsyncStorage.removeItem(getBitacoraDraftKey(tecnico.id, String(asig.id_asignacion ?? id)));
          Alert.alert(
            'Guardado en modo offline',
            'Se perdió conexión durante el envío. La visita quedó guardada y se sincronizará automáticamente.',
            [{ text: 'Aceptar', onPress: () => router.back() }],
          );
          return;
        }
        throw e;
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la visita.');
    } finally {
      if (firmaUri) FileSystem.deleteAsync(firmaUri, { idempotent: true }).catch(() => {});
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.guinda} />
      </View>
    );
  }

  if (!asig) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.headerBack}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Detalle</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.center}>
          <Text style={s.emptyTitle}>Asignación no encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ben = asig.beneficiario ?? benFallback(asig);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => (paso === 3 ? router.back() : setPaso((paso - 1) as Paso))}>
          <Text style={s.headerBack}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Paso {paso} de 5</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={s.progressBg}>
        {/* @ts-ignore */}
        <Animated.View
          style={[
            s.progressFill,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      {paso === 3 && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.title}>Verificación de Beneficiario</Text>
            <Text style={s.value}>{ben.nombre_completo}</Text>
            <Text style={s.muted}>CURP: {ben.curp}</Text>
            <Text style={s.muted}>Municipio: {ben.municipio}</Text>
            <Text style={s.muted}>Folio SADERH: {ben.folio_saderh}</Text>
            <Text style={s.muted}>Cultivo: {ben.cadena_productiva}</Text>
            <Text style={s.muted}>
              GPS: {gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : 'Obteniendo ubicación...'}
            </Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setPaso(4)}>
            <Text style={s.primaryBtnText}>Continuar a formulario</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {paso === 4 && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <Text style={s.title}>Formulario de visita</Text>
              <Text style={s.label}>¿Hubo incidentes?</Text>
              <View style={s.row}>
                <TouchableOpacity
                  style={[s.pillBtn, datos.hay_incidentes && s.pillBtnOn]}
                  onPress={() => {
                    setDato('hay_incidentes', !datos.hay_incidentes);
                  }}
                >
                  <Text style={[s.pillText, datos.hay_incidentes && s.pillTextOn]}>
                    {datos.hay_incidentes ? 'Sí' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>

              {datos.hay_incidentes && (
                <>
                  <Text style={s.label}>Tipo de incidente</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: rh(10) }}>
                    <View style={s.row}>
                      {TIPOS_INCIDENTE.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[s.pillBtn, datos.tipo_incidente === item && s.pillBtnOn]}
                          onPress={() => setDato('tipo_incidente', item)}
                        >
                          <Text style={[s.pillText, datos.tipo_incidente === item && s.pillTextOn]}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <TextInput
                    style={s.inputArea}
                    value={datos.descripcion_incidente}
                    onChangeText={(v) => setDato('descripcion_incidente', v)}
                    placeholder="Describe el incidente..."
                    placeholderTextColor={Colors.gray400}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              <Text style={s.label}>Observaciones</Text>
              <TextInput
                style={s.inputArea}
                value={datos.observaciones}
                onChangeText={(v) => setDato('observaciones', v)}
                placeholder="Escribe observaciones..."
                placeholderTextColor={Colors.gray400}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={s.card}>
              <Text style={s.title}>Fotos de campo (opcional)</Text>
              <View style={s.row}>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => tomarFotoCampo(true)}>
                  <Text style={s.secondaryBtnText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => tomarFotoCampo(false)}>
                  <Text style={s.secondaryBtnText}>Galería</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.row}>
                  {fotosCampo.map((uri, i) => (
                    <View key={`${uri}-${i}`}>
                      <Image source={{ uri }} style={s.photoPreview} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={() => setPaso(5)}>
              <Text style={s.primaryBtnText}>Continuar a confirmación</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {paso === 5 && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.title}>Evaluación final</Text>
            <Text style={s.label}>Calidad del servicio</Text>
            <Stars val={datos.calidad_servicio ?? 0} onChange={(v) => setDato('calidad_servicio', v)} />
            <Text style={s.label}>Coordinación</Text>
            <Stars val={datos.calificacion_coordinacion ?? 0} onChange={(v) => setDato('calificacion_coordinacion', v)} />
          </View>

          <View style={s.card}>
            <Text style={s.title}>Validación de identidad</Text>
            {!fotoRostro ? (
              <>
                <Text style={s.warnCard}>Antes de firmar, captura la foto de rostro del beneficiario.</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={capturarFotoRostro}>
                  <Text style={s.primaryBtnText}>Tomar foto de rostro</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.okBadge}>
                  <Text style={s.okBadgeText}>Identidad capturada</Text>
                </View>
                <Image source={{ uri: fotoRostro }} style={s.facePhoto} />
                <TouchableOpacity style={s.secondaryBtn} onPress={capturarFotoRostro}>
                  <Text style={s.secondaryBtnText}>Repetir foto</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.title}>Firma</Text>
            {/* @ts-ignore */}
            <Firma
              enabled={!!fotoRostro}
              onChange={({ ok, strokes }) => {
                setFirmaOk(ok);
                setFirmaStrokes(strokes);
              }}
            />
            {!firmaOk && <Text style={s.warn}>La firma es obligatoria para finalizar.</Text>}
          </View>

          <TouchableOpacity style={[s.primaryBtn, guardando && s.disabled]} onPress={finalizar} disabled={guardando}>
            {guardando ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryBtnText}>Guardar y finalizar</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.guinda,
    paddingHorizontal: rw(16),
    paddingVertical: rh(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBack: { color: Colors.white, fontSize: fontSize.base, fontWeight: '600' },
  headerTitle: { color: Colors.white, fontSize: fontSize.base, fontWeight: '700' },
  progressBg: { height: 4, backgroundColor: Colors.guindaDark },
  progressFill: { height: 4, backgroundColor: Colors.dorado },
  content: { padding: rw(16), gap: rh(12) },
  card: {
    backgroundColor: Colors.white,
    borderRadius: radius.lg,
    padding: rw(14),
    gap: rh(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  value: { fontSize: fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  muted: { fontSize: fontSize.sm, color: Colors.textSecondary },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginTop: rh(4) },
  inputArea: {
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: radius.md,
    backgroundColor: Colors.gray50,
    paddingHorizontal: rw(12),
    paddingVertical: rh(10),
    minHeight: rh(90),
    textAlignVertical: 'top',
    color: Colors.textPrimary,
    width: '100%',
  },
  row: { flexDirection: 'row', gap: rw(8), flexWrap: 'wrap', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillBtn: { borderWidth: 1.2, borderColor: Colors.border, borderRadius: radius.md, paddingHorizontal: rw(12), paddingVertical: rh(8) },
  pillBtnOn: { backgroundColor: Colors.guinda, borderColor: Colors.guinda },
  pillText: { fontSize: fontSize.xs, color: Colors.textPrimary },
  pillTextOn: { color: Colors.white, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: Colors.guinda,
    borderRadius: radius.md,
    paddingVertical: rh(14),
    alignItems: 'center',
    shadowColor: Colors.guinda,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: fontSize.base },
  secondaryBtn: {
    borderWidth: 1.3,
    borderColor: Colors.guinda,
    borderRadius: radius.md,
    paddingHorizontal: rw(12),
    paddingVertical: rh(9),
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.guinda, fontWeight: '700', fontSize: fontSize.sm },
  photoPreview: { width: rw(84), height: rw(84), borderRadius: radius.md },
  facePhoto: {
    width: rw(180),
    height: rw(220),
    borderRadius: radius.md,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  stars: { flexDirection: 'row', gap: rw(6) },
  star: { fontSize: 28, color: Colors.gray300 },
  starOn: { color: '#f59e0b' },
  signatureCanvas: {
    height: rh(150),
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: radius.md,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signatureDisabled: { opacity: 0.6 },
  signatureHint: { textAlign: 'center', color: Colors.gray400, fontSize: fontSize.sm },
  clear: { color: Colors.danger, fontWeight: '700', fontSize: fontSize.sm },
  disabled: { opacity: 0.6 },
  disabledText: { color: Colors.gray400 },
  warn: { color: Colors.warning, fontSize: fontSize.xs, marginTop: rh(8), textAlign: 'center' },
  warnCard: {
    fontSize: fontSize.sm,
    color: Colors.warning,
    backgroundColor: Colors.warning + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    paddingHorizontal: rw(12),
    paddingVertical: rh(10),
  },
  okBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.success + '1A',
    borderColor: Colors.success + '44',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: rw(12),
    paddingVertical: rh(6),
    marginBottom: rh(4),
  },
  okBadgeText: { fontSize: fontSize.xs, color: Colors.success, fontWeight: '700' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
});
