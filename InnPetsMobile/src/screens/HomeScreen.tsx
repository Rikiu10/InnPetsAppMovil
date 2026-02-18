import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, FlatList, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { notificationService } from '../services/api'; // Importamos el servicio

import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Explorar'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [services, setServices] = useState<any[]>([]); 
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  // 👇 ESTADO PARA EL PUNTITO ROJO
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services/');
      setServices(response.data);
      setFilteredServices(response.data); 
    } catch (error) {
      console.log("Error cargando servicios:", error);
    } finally {
      setLoading(false);
    }
  };

  // 👇 LÓGICA DEL PUNTITO ROJO
  const checkNotifications = async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
  };

  useFocusEffect(
    useCallback(() => {
      fetchServices();
      checkNotifications(); // Revisar al entrar

      // Revisar cada 15 segundos (Polling)
      const interval = setInterval(checkNotifications, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    let result = services;
    if (activeCategory !== 'Todos') {
        const catMap: Record<string, string> = {
            'Paseos': 'WALKING',
            'Veterinaria': 'VETERINARY',
            'Grooming': 'GROOMING',
            'Cuidado': 'BOARDING' 
        };
        const backendCode = catMap[activeCategory];
        if (backendCode) {
            result = result.filter(item => item.service_type === backendCode);
        }
    }
    if (searchText) {
        const lowerText = searchText.toLowerCase();
        result = result.filter(item => 
            item.title.toLowerCase().includes(lowerText) ||
            item.provider_name?.toLowerCase().includes(lowerText)
        );
    }
    setFilteredServices(result);
  }, [searchText, activeCategory, services]);

  const getImage = (item: any) => {
    if (item.photos_url) {
        if (Array.isArray(item.photos_url)) {
            return item.photos_url.length > 0 ? item.photos_url[0] : getDefaultImage(item.service_type);
        }
        return item.photos_url;
    }
    return getDefaultImage(item.service_type);
  };

  const getDefaultImage = (type: string) => {
    if (type === 'WALKING') return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80';
    if (type === 'GROOMING') return 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80';
    if (type === 'VETERINARY') return 'https://images.unsplash.com/photo-1628009368231-760335298025?auto=format&fit=crop&w=800&q=80';
    return 'https://img.freepik.com/free-vector/cute-dog-sticking-tongue-out-cartoon-illustration_138676-2709.jpg';
  }

  const getCategoryLabel = (type: string) => {
      const map: Record<string, string> = {
          'WALKING': 'Paseo',
          'VETERINARY': 'Veterinaria',
          'GROOMING': 'Peluquería',
          'BOARDING': 'Alojamiento',
          'TRAINING': 'Entrenamiento'
      };
      return map[type] || 'Servicio';
  };

  const renderServiceCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
        style={styles.serviceCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
    >
        <Image source={{ uri: getImage(item) }} style={styles.cardImage} resizeMode="cover"/>
        <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{getCategoryLabel(item.service_type)}</Text>
        </View>
        <View style={styles.cardContent}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.providerName}>👤 {item.provider_name || 'Proveedor'}</Text>
                    {item.commune && <Text style={styles.locationText}>📍 {item.commune}</Text>}
                </View>
                <View style={styles.ratingBadge}>
                    <Text style={{fontSize: 10}}>⭐</Text>
                    <Text style={styles.ratingText}>{item.average_rating ? Number(item.average_rating).toFixed(1) : 'Nuevo'}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}</Text>
                <Text style={{color: COLORS.textLight, fontSize: 12}}>/hora</Text>
            </View>
        </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' }} style={{ width: 30, height: 30, tintColor: COLORS.primary }} />
                <Text style={styles.logoText}>InnPets</Text>
            </View>
            <View style={styles.actions}>
                
                {/* 🔔 BOTÓN CON PUNTITO ROJO */}
                <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => navigation.navigate('NotificationsScreen')}
                >
                    <Text style={{fontSize: 20}}>🔔</Text>
                    {unreadCount > 0 && (
                        <View style={styles.notificationDot}>
                            <Text style={styles.notificationText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.iconBtn, { backgroundColor: COLORS.primaryLight }]}
                    onPress={() => navigation.navigate('Perfil')}
                >
                    <Text style={{fontSize: 20}}>👤</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.padding}>
            <View style={styles.searchBar}>
                <Text style={{ marginRight: 10, fontSize: 18 }}>🔍</Text>
                <TextInput 
                    placeholder="¿Qué necesita tu mascota hoy?" 
                    placeholderTextColor="#999"
                    style={{ flex: 1, fontFamily: FONTS.regular, fontSize: 16 }}
                    value={searchText} onChangeText={setSearchText}
                />
            </View>
        </View>

        <View style={{ paddingLeft: 20, marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['Todos', 'Paseos', 'Veterinaria', 'Grooming', 'Cuidado'].map((cat, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
                        onPress={() => setActiveCategory(cat)}
                    >
                        <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <View style={styles.padding}>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Proveedores</Text>
                    <Text style={styles.statValue}>500+</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Certificados</Text>
                    <Text style={styles.statValue}>100%</Text>
                </View>
            </View>
        </View>

        <View style={[styles.padding, styles.sectionHeader]}>
            <Text style={styles.sectionTitle}>Servicios Disponibles 🔥</Text>
            <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{marginTop:10, color: COLORS.textLight}}>Buscando servicios...</Text>
        </View>
      ) : (
        <FlatList
            data={filteredServices}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderServiceCard}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 30}}>
                    <Text style={{fontSize: 40}}>🐶</Text>
                    <Text style={{color: '#999', marginTop: 10}}>No se encontraron servicios.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  padding: { paddingHorizontal: 20, marginBottom: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.white, 
    marginBottom: 20
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 12 },
  iconBtn: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', 
    alignItems: 'center', justifyContent: 'center' 
  },
  
  // ESTILOS NUEVOS PARA EL DOT
  notificationDot: {
      position: 'absolute', top: -2, right: -2,
      backgroundColor: 'red', borderRadius: 10,
      width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: 'white'
  },
  notificationText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 15, borderRadius: 15, ...SHADOWS.card, borderWidth: 1, borderColor: '#F0F0F0'
  },
  categoryChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25,
    backgroundColor: COLORS.white, marginRight: 10, borderWidth: 1, borderColor: '#EEE'
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontFamily: FONTS.bold, color: COLORS.textLight },
  categoryTextActive: { color: 'white' },
  statsGrid: { flexDirection: 'row', gap: 15 },
  statCard: { 
    flex: 1, backgroundColor: COLORS.white, padding: 15, borderRadius: 15, 
    ...SHADOWS.card, alignItems: 'center', justifyContent: 'center'
  },
  statValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 5 },
  statLabel: { color: COLORS.textLight, fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#333' },
  sectionLink: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  serviceCard: { 
    backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 20, marginHorizontal: 20,
    ...SHADOWS.card, overflow: 'hidden'
  },
  cardImage: { width: '100%', height: 160, backgroundColor: '#EEE' },
  cardBadge: {
    position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10
  },
  cardBadgeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  cardContent: { padding: 15 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#333', marginBottom: 4 },
  providerName: { fontSize: 13, color: '#666', marginBottom: 2 },
  locationText: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  ratingBadge: { 
    flexDirection:'row', alignItems:'center', backgroundColor:'#FFF8E1', 
    paddingHorizontal:8, paddingVertical:4, borderRadius:8 
  },
  ratingText: { fontSize: 12, fontWeight:'bold', color:'#FFB300', marginLeft:4 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 10 },
  price: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary }
});

export default HomeScreen;