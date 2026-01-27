import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';

type ServiceDetailRouteProp = RouteProp<RootStackParamList, 'ServiceDetail'>;
type ServiceDetailNavProp = NativeStackNavigationProp<RootStackParamList, 'ServiceDetail'>;

interface Props {
  route: ServiceDetailRouteProp;
  navigation: ServiceDetailNavProp;
}

const ServiceDetailScreen = ({ route, navigation }: Props) => {
  const { service } = route.params;
  const [loading, setLoading] = useState(false);
  
  // 1. NUEVO ESTADO: Para esperar a saber quién es el usuario
  const [checkingUser, setCheckingUser] = useState(true); 
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // ESTADO PARA MASCOTAS
  const [myPets, setMyPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Valores por defecto
  const bgColor = service.levelColor || COLORS.primary;
  const textColor = service.levelText || COLORS.white;
  const levelName = service.certification_level || 'Básica';

  // Fechas
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
  const startDateStr = tomorrow.toISOString().split('T')[0];
  const endDateStr = dayAfter.toISOString().split('T')[0];

  // CARGAR DATOS INICIALES
  useEffect(() => {
    checkCurrentUser();
    fetchMyPets();
  }, []);

  // 2. FUNCIÓN MEJORADA: Espera a leer el storage antes de soltar la pantalla
  const checkCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      console.log("🔍 Usuario en Storage:", userData); // Debug

      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.log("Error leyendo usuario", error);
    } finally {
      // 👇 IMPORTANTE: Avisamos que ya terminamos de revisar
      setCheckingUser(false);
    }
  };

  const fetchMyPets = async () => {
    try {
        const res = await api.get('/pets/');
        setMyPets(res.data);
    } catch (error) {
        console.log("Error cargando mascotas", error);
    }
  };

  // 3. LÓGICA DE VALIDACIÓN (La que ya funciona bien)
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
  
  // Solo validamos si ya tenemos el ID del usuario cargado
  const isMyService = currentUserId !== null && providerUserId !== null && currentUserId === providerUserId;

  // 4. FUNCIÓN DE RESERVA (Solo navegación)
  const handleBooking = () => {
    // 1. Validamos que haya elegido mascota
    if (!selectedPetId) {
        Alert.alert("Selecciona una mascota", "Por favor indica qué mascota recibirá el servicio.");
        return;
    }

    // 2. Navegamos a la pantalla de fechas
    // Le pasamos el servicio Y la mascota seleccionada
    // @ts-ignore
    navigation.navigate('CreateBookingScreen', { 
        service: service,
        petId: selectedPetId 
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
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
            <Text style={styles.price}>${service.price}</Text>
            <Text style={styles.priceLabel}> / servicio</Text>
          </View>


          {/* SELECCIÓN DE MASCOTA */}
          <Text style={styles.sectionTitle}>¿Para quién es el servicio?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
            {myPets.length > 0 ? (
                myPets.map((pet) => (
                    <TouchableOpacity 
                        key={pet.id} 
                        style={[
                            styles.petOption, 
                            selectedPetId === pet.id && styles.petOptionSelected
                        ]}
                        onPress={() => setSelectedPetId(pet.id)}
                    >
                        <Text style={{fontSize: 24}}>🐶</Text>
                        <Text style={[
                            styles.petName, 
                            selectedPetId === pet.id && styles.petNameSelected
                        ]}>{pet.name}</Text>
                    </TouchableOpacity>
                ))
            ) : (
                <Text style={{color: COLORS.textLight, fontStyle: 'italic'}}>
                    No tienes mascotas registradas.
                </Text>
            )}
          </ScrollView>

          <Text style={styles.sectionTitle}>Sobre este servicio</Text>
          <Text style={styles.description}>
            {service.description || "Servicio profesional garantizado con los estándares de calidad InnPets."}
          </Text>

          {/* AVISO VISUAL SI ES PROPIO (Solo si ya terminamos de cargar) */}
          {!checkingUser && isMyService && (
            <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ Este es tu propio servicio.</Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* 5. FOOTER PROTEGIDO */}
      <View style={styles.footer}>
        {checkingUser ? (
            // CASO A: Aún leyendo el ID... (Spinner)
            <ActivityIndicator color={COLORS.primary} />
        ) : isMyService ? (
            // CASO B: Es mi servicio (Bloqueado)
            <View style={styles.btnDisabled}>
                 <Text style={styles.btnTextDisabled}>🚫 No puedes reservar tu servicio</Text>
            </View>
        ) : (
            // CASO C: Todo OK (Botón habilitado)
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading}>
              {loading ? (
                 <ActivityIndicator color="#fff"/>
              ) : (
                 <Text style={styles.btnText}>Reservar Ahora</Text>
              )}
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, marginTop: -30 },
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
  infoSection: {backgroundColor: '#f5f5f5', padding: 10, borderRadius: 10, marginBottom: 15},
  sectionLabel: {fontFamily: FONTS.bold, color: COLORS.textDark},
  sectionValue: {color: COLORS.primary},
  infoBox: { padding: 15, borderRadius: 12, marginTop: 15 },
  infoTitle: { fontFamily: FONTS.bold, marginBottom: 5 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  // Estilos Mascota
  petOption: { 
    alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#eee', 
    marginRight: 10, width: 80, backgroundColor: '#fff' 
  },
  petOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  petName: { fontSize: 12, marginTop: 5, color: COLORS.textLight },
  petNameSelected: { color: COLORS.primary, fontFamily: FONTS.bold },

  // Estilos de Validación
  warningBox: { backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginTop: 10, marginBottom: 10, alignItems: 'center'},
  warningText: { color: '#856404', fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#e2e6ea', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnTextDisabled: { color: '#6c757d', fontFamily: FONTS.bold, fontSize: 16 }
});

export default ServiceDetailScreen;