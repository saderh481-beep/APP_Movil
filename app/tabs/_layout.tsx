import { Colors } from '@/constants/Colors';
import { getConnectionInfo } from '@/lib/api';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    getConnectionInfo()
      .then((cfg) => setIsDemoMode(cfg.modoDemo))
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.guinda,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Visitas', tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="alta-beneficiario"
        options={{
          title: 'Beneficiario',
          href: isDemoMode ? '/tabs/alta-beneficiario' : null,
          tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="informacion"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <Icon emoji="⚙️" focused={focused} /> }}
      />
    </Tabs>
  );
}
