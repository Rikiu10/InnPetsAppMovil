import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Image, Dimensions, Platform 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

type ServiceDetailRouteProp = RouteProp<RootStackParamList, 'ServiceDetail'>;
type ServiceDetailNavProp = NativeStackNavigationProp<RootStackParamList, 'ServiceDetail'>;

interface Props {
  route: ServiceDetailRouteProp;
  navigation: ServiceDetailNavProp;
}

const { height } = Dimensions.get('window');

const ServiceDetailScreen = ({ route, navigation }: Props) => {
  const { service } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true); 
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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

  const handleBooking = () => {
    navigation.navigate('CreateBookingScreen', { service: service } as any);
  };

  const getImage = (item: any) => {
    if (item.photos_url && item.photos_url.length > 0) return { uri: item.photos_url[0] };
    if (item.service_type === 'WALKING') return { uri: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80' };
    if (item.service_type === 'GROOMING') return { uri: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80' };
    if (item.service_type === 'VETERINARY') return { uri: 'https://images.unsplash.com/photo-1628009368231-760335298025?auto=format&fit=crop&w=800&q=80' };
    return { uri: 'https://img.freepik.com/free-vector/cute-dog-sticking-tongue-out-cartoon-illustration_138676-2709.jpg' };
  };

  const unitSuffix = service.charging_unit === 'PER_HOUR' ? '/ hr' : 
                     service.charging_unit === 'PER_SERVICE' ? '/ serv' : '';

  return (
    // 🔥 ENVOLVEMOS EN UN SAFEAREAVIEW PARA LOS BORDES INFERIORES
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        
        <View style={styles.imageContainer}>
          <Image source={getImage(service)} style={styles.image} />
          <View style={styles.imageOverlay} />
          
          <SafeAreaView style={styles.headerNav} edges={['top']}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton}>
              <Ionicons name="heart-outline" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.contentContainer}>
          
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: service.levelColor || COLORS.primary }]}>
              <Text style={styles.badgeText}>Nivel {service.certification_level || 'Básica'}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FFB300" />
              <Text style={styles.ratingText}>{service.average_rating ? Number(service.average_rating).toFixed(1) : 'Nuevo'}</Text>
            </View>
          </View>

          <Text style={styles.title}>{service.title}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${Number(service.price).toLocaleString('es-CL')}</Text>
            <Text style={styles.priceLabel}> {unitSuffix}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.providerCard}>
             <View style={styles.providerAvatar}>
                <Text style={{fontSize: 24}}>👤</Text>
             </View>
             <View style={{flex: 1}}>
                <Text style={styles.providerLabel}>Ofrecido por</Text>
                <Text style={styles.providerName}>{service.provider_name || 'InnPets Provider'}</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Sobre este servicio</Text>
          <Text style={styles.description}>
            {service.description || "Servicio profesional garantizado con los estándares de calidad InnPets."}
          </Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.locationContainer}>
             <Ionicons name="location" size={20} color={COLORS.primary} style={{marginRight: 10}} />
             <Text style={styles.locationText}>{service.comuna || 'Santiago'}, {service.region || 'RM'}</Text>
          </View>

          {!checkingUser && isMyService && (
            <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={20} color="#856404" style={{marginRight: 8}}/>
                <Text style={styles.warningText}>Este es tu propio servicio.</Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* FOOTER FLOTANTE SEGURO */}
      <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {checkingUser ? (
            <ActivityIndicator color={COLORS.primary} />
        ) : isMyService ? (
            <View style={styles.btnDisabled}>
                 <Ionicons name="lock-closed" size={18} color="#6c757d" style={{marginRight: 8}} />
                 <Text style={styles.btnTextDisabled}>No puedes reservarte a ti mismo</Text>
            </View>
        ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading}>
              <Text style={styles.btnText}>Reservar Ahora</Text>
            </TouchableOpacity>
        )}
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  imageContainer: { width: '100%', height: height * 0.4 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  headerNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.9)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10, ...SHADOWS.card },
  contentContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 25 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  ratingText: { color: '#FFB300', fontFamily: FONTS.bold, marginLeft: 5, fontSize: 14 },
  title: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.textDark, marginBottom: 8, lineHeight: 30 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary },
  priceLabel: { color: COLORS.textLight, fontSize: 16, fontFamily: FONTS.regular, marginLeft: 2, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  providerCard: { flexDirection: 'row', alignItems: 'center' },
  providerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  providerLabel: { fontSize: 12, color: COLORS.textLight, fontFamily: FONTS.regular },
  providerName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark, marginTop: 2 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textDark, marginBottom: 12 },
  description: { color: COLORS.textLight, lineHeight: 24, fontSize: 15, fontFamily: FONTS.regular },
  locationContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12 },
  locationText: { fontSize: 15, color: COLORS.textDark, fontFamily: FONTS.semiBold },
  warningBox: { flexDirection: 'row', backgroundColor: '#fff3cd', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ffeeba' },
  warningText: { color: '#856404', fontFamily: FONTS.bold, flex: 1 },
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 10 },
  btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  btnDisabled: { flexDirection: 'row', backgroundColor: '#E9ECEF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnTextDisabled: { color: '#6C757D', fontFamily: FONTS.bold, fontSize: 15 }
});

export default ServiceDetailScreen;