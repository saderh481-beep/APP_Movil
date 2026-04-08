import { Colors } from '@/constants/Colors';
import { fontSize, radius, rh, rw, size, spacing } from '@/lib/responsive';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const W = Dimensions.get('window').width;

export default function Splash() {
  const { isAuthenticated } = useAuthStore();
  const [mostrarBtn, setMostrarBtn] = useState(false);
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lineW = useRef(new Animated.Value(0)).current;
  const footerOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(lineW, { toValue: W * 0.55, duration: 450, useNativeDriver: false }),
      Animated.timing(footerOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        setMostrarBtn(true);
        Animated.parallel([
          Animated.timing(btnOp, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        ]).start();
      }, 500);
    });
  }, []);

  const handleComenzar = () => {
    if (isAuthenticated) {
      router.replace('/tabs');
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <SafeAreaView style={s.c}>
      {/* @ts-ignore */}
      <Animated.View style={[s.logo, { opacity, transform: [{ scale }] }]}>
        {/* Icono del gobierno - escudo */}
        <View style={s.escudo}>
          <Image source={require('@/assets/images/Logo_Gobierno.svg.jpeg')} style={s.logoImg} resizeMode="contain" />
        </View>
        
        <Text style={s.title}>SADERH</Text>
        {/* @ts-ignore */}
        <Animated.View style={[s.line, { width: lineW }]} />
        {/* @ts-ignore */}
        <Animated.Text style={[s.sub, { opacity: footerOp }]}>
          Sistema de Gestión de Campo
        </Animated.Text>
      </Animated.View>

      {mostrarBtn && (
        // @ts-ignore
        <Animated.View style={[s.btnCont, { opacity: btnOp, transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity style={s.btn} onPress={handleComenzar} activeOpacity={0.8}>
            <Text style={s.btnT}>Comenzar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Footer con logos institucionales */}
      {/* @ts-ignore */}
      <Animated.View style={[s.footer, { opacity: footerOp }]}>
        <Text style={s.fTop}>Gobierno del Estado de Hidalgo</Text>
        <Text style={s.fBot}>Secretaría de Agricultura y Desarrollo Rural</Text>
        
        {/* Sección Crédito Universidad */}
        <View style={s.universidadSection}>
          <Text style={s.creditoUni}>Desarrollado en colaboración con Universidad</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.guinda, alignItems: 'center', justifyContent: 'center', paddingHorizontal: rw(20) },
  logo: { alignItems: 'center', gap: 14 },
  escudo: { width: 120, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoImg: { width: 120, height: 80 },
  escudoT: { fontSize: 60 },
  title: { fontSize: 58, fontWeight: '900', color: Colors.white, letterSpacing: 5 },
  line: { height: 3, backgroundColor: Colors.dorado, borderRadius: 2 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  btnCont: { position: 'absolute', bottom: 180, left: 20, right: 20 },
  btn: { backgroundColor: Colors.dorado, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnT: { fontSize: 18, fontWeight: '800', color: Colors.guinda, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 30, alignItems: 'center', gap: 4, paddingHorizontal: 20 },
  fTop: { fontSize: 13, color: Colors.dorado, fontWeight: '600' },
  fBot: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  // Universidad
  universidadSection: { marginTop: 20, alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  creditoUni: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});
