import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { SafeAreaView } from 'react-native-safe-area-context'; // Importante para el botón
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

type ServiceDetailRouteProp = RouteProp<RootStackParamList, 'ServiceDetail'>;
type ServiceDetailNavProp = NativeStackNavigationProp<RootStackParamList, 'ServiceDetail'>;

interface Props {
  route: ServiceDetailRouteProp;
  navigation: ServiceDetailNavProp;
}

const ServiceDetailScreen = ({ route, navigation }: Props) => {
  const { service } = route.params;
  const [loading, setLoading] = useState(false);
  
  // 1. Validación de Usuario (Tu lógica original intacta)
  const [checkingUser, setCheckingUser] = useState(true); 
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Valores visuales
  const bgColor = service.levelColor || COLORS.primary;
  const textColor = service.levelText || COLORS.white;
  const levelName = service.certification_level || 'Básica';

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.log("Error leyendo usuario", error);
    } finally {
      setCheckingUser(false);
    }
  };

  const getProviderUserId = (provider: any) => {
    if (!provider) return null;
    if (typeof provider === 'number') return provider;
    if (provider.user) {
        return typeof provider.user === 'object' ? provider.user.id : provider.user;
    }
    if (provider.id) return provider.id;
    return null;
  };

  const providerUserId = getProviderUserId(service.provider);
  const isMyService = currentUserId !== null && providerUserId !== null && currentUserId === providerUserId;

  // 2. Navegación Directa (Sin validación de mascota aquí)
  const handleBooking = () => {
    // @ts-ignore
    navigation.navigate('CreateBookingScreen', { service: service });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER VISUAL (Intacto) */}
      <View style={[styles.heroContainer, { backgroundColor: bgColor }]}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={{ fontSize: 20 }}>❤️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroContent}>
          <Text style={{ fontSize: 80 }}>{service.icon || '🐾'}</Text>
        </View>
      </View>

      {/* CONTENIDO */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{service.title}</Text>
          
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: bgColor }]}>
              <Text style={[styles.badgeText, { color: textColor }]}>Nivel {levelName}</Text>
            </View>
            <Text style={styles.rating}>★★★★★ {service.average_rating ? Number(service.average_rating).toFixed(1) : '5.0'}</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {Number(service.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
            </Text>
            <Text style={styles.priceLabel}> / servicio</Text>
          </View>

          {/* 3. SECCIÓN MASCOTA ELIMINADA: Ya no se pide aquí, se pide en el siguiente paso para evitar redundancia */}

          <Text style={styles.sectionTitle}>Sobre este servicio</Text>
          <Text style={styles.description}>
            {service.description || "Servicio profesional garantizado con los estándares de calidad InnPets."}
          </Text>
          
          <View style={styles.divider}/>
          
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <Text style={styles.description}>📍 {service.comuna || 'Santiago'}, {service.region || 'Región Metropolitana'}</Text>

          {/* AVISO DE PROPIEDAD */}
          {!checkingUser && isMyService && (
            <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ Este es tu propio servicio.</Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* 4. FOOTER FLOTANTE SEGURO */}
      {/* Usamos un View absoluto pero con paddingBottom seguro para Android/iOS */}
      <View style={styles.footerContainer}>
        {checkingUser ? (
            <ActivityIndicator color={COLORS.primary} />
        ) : isMyService ? (
            <View style={styles.btnDisabled}>
                 <Text style={styles.btnTextDisabled}>🚫 Es tu servicio</Text>
            </View>
        ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading}>
              <Text style={styles.btnText}>Reservar Ahora</Text>
            </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroContainer: { height: 250, paddingTop: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  heroContent: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, marginTop: -30 }, // PaddingBottom grande para el footer
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, ...SHADOWS.card },
  title: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.textDark, marginBottom: 10 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 12 },
  rating: { color: '#ffc107', fontFamily: FONTS.bold },
  priceContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  price: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary },
  priceLabel: { color: COLORS.textLight, marginBottom: 5 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 10, marginTop: 10 },
  description: { color: COLORS.textDark, lineHeight: 22, marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  
  // Footer Flotante
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 20,
    paddingBottom: 30, // Extra padding para gestos de Android/iOS
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10
  },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  
  // Estilos de Validación
  warningBox: { backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginTop: 10, marginBottom: 10, alignItems: 'center'},
  warningText: { color: '#856404', fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#e2e6ea', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnTextDisabled: { color: '#6c757d', fontFamily: FONTS.bold, fontSize: 16 }
});

export default ServiceDetailScreen;