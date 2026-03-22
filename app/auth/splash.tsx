import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
const W = Dimensions.get('window').width;

export default function Splash() {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lineW = useRef(new Animated.Value(0)).current;
  const footerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(lineW, { toValue: W * 0.55, duration: 450, useNativeDriver: false }),
      Animated.timing(footerOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => setTimeout(() => router.replace('/auth/conexion'), 900));
  }, []);

  return (
    <View style={s.c}>
      <Animated.View style={[s.logo, { opacity, transform: [{ scale }] }]}>
        <Text style={s.title}>SADERH</Text>
        <Animated.View style={[s.line, { width: lineW }]} />
        <Animated.Text style={[s.sub, { opacity: footerOp }]}>
          Sistema de Gestión de Campo
        </Animated.Text>
      </Animated.View>
      <Animated.View style={[s.footer, { opacity: footerOp }]}>
        <Text style={s.fTop}>Gobierno del Estado de Hidalgo</Text>
        <Text style={s.fBot}>Secretaría de Agricultura y Desarrollo Rural</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.guinda, alignItems: 'center', justifyContent: 'center' },
  logo: { alignItems: 'center', gap: 14 },
  title: { fontSize: 58, fontWeight: '900', color: Colors.white, letterSpacing: 5 },
  line: { height: 3, backgroundColor: Colors.dorado, borderRadius: 2 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  footer: { position: 'absolute', bottom: 48, alignItems: 'center', gap: 4 },
  fTop: { fontSize: 13, color: Colors.dorado, fontWeight: '600' },
  fBot: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
});
