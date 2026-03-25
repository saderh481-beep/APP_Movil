import { syncApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, loadAuth, isAuthenticated, setOffline } = useAuthStore();

  useEffect(() => {
    loadAuth().then(() => SplashScreen.hideAsync());
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
          await syncApi.sincronizarPendientes();
          
          // NUEVO: Obtener delta de cambios del servidor
          // para actualizar asignaciones que pueden haber cambiado
          try {
            const lastSync = await AsyncStorage.getItem('@saderh:last_sync_time');
            await syncApi.delta(lastSync || undefined);
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

  if (isLoading) return null;

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
