import { syncApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileManager } from '@/lib/file-manager';
import { startAutoExport, stopAutoExport } from '@/lib/export-service';
import { startAutoSync, stopAutoSync, syncNow } from '@/lib/sync-service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, loadAuth, isAuthenticated, setOffline } = useAuthStore();

  useEffect(() => {
    loadAuth().then(() => SplashScreen.hideAsync());
  }, []);

  // Inicializar carpetas de la app al arrancar
  useEffect(() => {
    const initFolders = async () => {
      try {
        await FileManager.initializeAppDirectories();
        console.log('[LAYOUT] Carpetas de la app inicializadas');
      } catch (e) {
        console.error('[LAYOUT] Error inicializando carpetas:', e);
      }
    };
    initFolders();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    const tick = async () => {
      try {
        const online = await syncApi.healthCheck();
        if (!active) return;
        setOffline(!online);
        
        if (online) {
          // CRÍTICO: Sincronizar bitácoras pendientes
          // Sync handled by auto-sync service
          
          // NUEVO: Obtener delta de cambios del servidor
          // para actualizar asignaciones que pueden haber cambiado
          try {
            const lastSync = await AsyncStorage.getItem('@saderh:last_sync_time');
            await syncApi.delta();
          } catch (e) {
            console.warn('Delta sync falló (no crítico):', e);
            // Delta es complementario, si falla el dashboard lo reintentará
          }
        }
      } catch (e) {
        console.warn('Failed check tick:', e);
      }
    };

    tick();
    const t = setInterval(tick, 20_000);
    
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [isAuthenticated, setOffline]);

  // Iniciar servicios automáticos cuando el usuario está autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOffline(!reachable);

      if (reachable) {
        syncNow().catch((error) => {
          console.warn('NetInfo sync falló:', error);
        });
      }
    });
    
    // Iniciar sincronización automática de bitácoras (cada 30 segundos)
    startAutoSync(30 * 1000);
    
    // Iniciar exportación automática (cada 5 minutos)
    startAutoExport(5 * 60 * 1000);
    
    console.log('[LAYOUT] Servicios automáticos iniciados');
    
    return () => {
      // Limpiar servicios al cerrar sesión
      unsubscribe();
      stopAutoSync();
      stopAutoExport();
      console.log('[LAYOUT] Servicios automáticos detenidos');
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/splash" />
        <Stack.Screen name="auth/conexion" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="stack/detalle-asignacion" />
      </Stack>
    </GestureHandlerRootView>
  );
}
