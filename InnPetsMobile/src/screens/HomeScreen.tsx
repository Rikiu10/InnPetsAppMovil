import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, FlatList, ActivityIndicator, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // 🔥 Agregamos Ionicons para los íconos
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { notificationService } from '../services/api';

import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types';
import { useAuth } from '../context/AuthContext'; // 🔥 Para sacar el nombre del usuario

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Explorar'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { user } = useAuth(); // Sacamos el usuario logueado
  const [services, setServices] = useState<any[]>([]); 
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchServices = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        api.get('/services/'),
        api.get('/service-categories/') 
      ]);
      
      setServices(servicesRes.data);
      setFilteredServices(servicesRes.data); 
      setCategories([{ id: 'todos', name: 'Todos' }, ...categoriesRes.data]);

    } catch (error) {
      console.log("Error cargando datos:", error);
      if (categories.length === 0) {
        setCategories([
          { id: 'todos', name: 'Todos' },
          { id: '1', name: 'Paseos' },
          { id: '2', name: 'Veterinaria' }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkNotifications = async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
  };

  useFocusEffect(
    useCallback(() => {
      fetchServices();
      checkNotifications(); 
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
        
        result = result.filter(item => {
            if (backendCode && item.service_type === backendCode) return true;
            if (item.category?.name === activeCategory) return true;
            if (item.category_name === activeCategory) return true;
            return false;
        });
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

  const getCategoryLabel = (item: any) => {
      if (item.category?.name) return item.category.name;
      if (item.category_name) return item.category_name;

      const map: Record<string, string> = {
          'WALKING': 'Paseos',
          'VETERINARY': 'Veterinaria',
          'GROOMING': 'Grooming',
          'BOARDING': 'Cuidado',
          'TRAINING': 'Entrenamiento'
      };
      return map[item.service_type] || 'Servicio';
  };

  const renderServiceCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
        style={styles.serviceCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
    >
        <Image source={{ uri: getImage(item) }} style={styles.cardImage} resizeMode="cover"/>
        
        {/* Etiqueta de Categoría Flotante */}
        <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{getCategoryLabel(item)}</Text>
        </View>

        <View style={styles.cardContent}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    
                    {/* Información del Proveedor y Ubicación */}
                    <View style={styles.providerRow}>
                        <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
                        <Text style={styles.providerName} numberOfLines={1}>{item.provider_name || 'Proveedor'}</Text>
                    </View>
                    
                    {item.commune && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
                            <Text style={styles.locationText}>{item.commune}</Text>
                        </View>
                    )}
                </View>
                
                {/* Rating */}
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFB300" />
                    <Text style={styles.ratingText}>{item.average_rating ? Number(item.average_rating).toFixed(1) : 'Nuevo'}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}</Text>
                <Text style={styles.priceUnit}>/ hora</Text>
            </View>
        </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
        {/* HEADER PRINCIPAL */}
        <View style={styles.header}>
            <View style={styles.userInfo}>
                <Text style={styles.greetingText}>¡Hola{user?.first_name ? `, ${user.first_name}` : ''}! 👋</Text>
                <Text style={styles.subGreetingText}>¿Qué necesita tu mascota hoy?</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => navigation.navigate('NotificationsScreen')}
                >
                    <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
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
                    <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </View>

        {/* BUSCADOR */}
        <View style={styles.padding}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
                <TextInput 
                    placeholder="Buscar paseos, veterinarias..." 
                    placeholderTextColor="#999"
                    style={styles.searchInput}
                    value={searchText} 
                    onChangeText={setSearchText}
                />
            </View>
        </View>

        {/* CATEGORÍAS */}
        <View style={{ paddingLeft: 20, marginBottom: 25 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat, index) => {
                    const isActive = activeCategory === cat.name;
                    return (
                        <TouchableOpacity 
                            key={cat.id || index} 
                            style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                            onPress={() => setActiveCategory(cat.name)}
                        >
                            <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>

        {/* TÍTULO DE SECCIÓN */}
        <View style={[styles.padding, styles.sectionHeader]}>
            <Text style={styles.sectionTitle}>Servicios Destacados 🔥</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Servicios')}>
                <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Buscando los mejores servicios...</Text>
        </View>
      ) : (
        <FlatList
            data={filteredServices}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderServiceCard}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Ionicons name="paw-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No se encontraron servicios en esta categoría.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  padding: { paddingHorizontal: 20, marginBottom: 20 },
  
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 20, 
    backgroundColor: '#F8F9FA'
  },
  userInfo: { flex: 1 },
  greetingText: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.textDark, marginBottom: 4 },
  subGreetingText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textLight },
  
  // Acciones (Iconos)
  actions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 45, height: 45, borderRadius: 25, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  notificationDot: { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white', paddingHorizontal: 4 },
  notificationText: { color: 'white', fontSize: 10, fontFamily: FONTS.bold },
  
  // Buscador
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 10, borderRadius: 16, ...SHADOWS.card },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textDark },
  
  // Categorías
  categoryChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: COLORS.white, marginRight: 12, ...SHADOWS.card, borderWidth: 1, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontFamily: FONTS.semiBold, color: COLORS.textLight, fontSize: 14 },
  categoryTextActive: { color: COLORS.white, fontFamily: FONTS.bold },
  
  // Secciones
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.textDark },
  sectionLink: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 },
  
  // Tarjetas de Servicio
  serviceCard: { backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 20, marginHorizontal: 20, ...SHADOWS.card, overflow: 'hidden' },
  cardImage: { width: '100%', height: 180, backgroundColor: '#EAEAEA' },
  cardBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  cardBadgeText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 12 },
  
  cardContent: { padding: 18 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textDark, marginBottom: 8 },
  
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  providerName: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textLight, marginLeft: 6 },
  
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textLight, marginLeft: 6 },
  
  ratingBadge: { flexDirection:'row', alignItems:'center', backgroundColor:'#FFF8E1', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  ratingText: { fontSize: 12, fontFamily: FONTS.bold, color:'#FFB300', marginLeft:4 },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  
  price: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  priceUnit: { fontFamily: FONTS.regular, color: COLORS.textLight, fontSize: 14 },

  // Estados de Carga / Vacío
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontFamily: FONTS.semiBold },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 15, fontFamily: FONTS.regular, fontSize: 16 }
});

export default HomeScreen;