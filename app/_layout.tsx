import { syncApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, loadAuth, isAuthenticated, isDemo, setOffline } = useAuthStore();

  useEffect(() => {
    loadAuth().then(() => SplashScreen.hideAsync());
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isDemo) return;

    let active = true;
    const tick = async () => {
      try {
        const online = await syncApi.healthCheck();
        if (!active) return;
        setOffline(!online);
        if (online) await syncApi.sincronizarPendientes();
      } catch {}
    };

    tick();
    const t = setInterval(tick, 20_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [isAuthenticated, isDemo, setOffline]);

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
