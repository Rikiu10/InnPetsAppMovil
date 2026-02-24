import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ListRenderItem, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { servicesService } from '../services/api';
import { Service, ServiceCategory, RootStackParamList, MainTabParamList } from '../types';

// IMPORTS DE NAVEGACIÓN
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ServicesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Servicios'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Diccionario para traducir las unidades de cobro en la tarjeta
const UNIT_LABELS: Record<string, string> = {
    'PER_HOUR': '/hr',
    'PER_SERVICE': '/serv',
    'PER_NIGHT': '/noche',
    'PER_VISIT': '/visita'
};

const ServicesScreen = ({ navigation }: ServicesScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]); 
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  
  // El filtro ahora guarda el 'id' de la categoría (o 'Todos')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Traemos servicios y categorías al mismo tiempo
      const [servicesData, categoriesData] = await Promise.all([
          servicesService.getAllServices(),
          servicesService.getCategories()
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtrado Dinámico
  const filteredServices = selectedCategory === 'Todos' 
    ? services 
    : services.filter(item => {
        // Soporte por si el backend devuelve la categoría como objeto o como ID numérico
        const catId = typeof item.category === 'object' && item.category !== null 
            ? item.category.id 
            : item.category;
            
        return catId?.toString() === selectedCategory;
    });

  // Construimos las pestañas (Tabs) uniendo "Todos" con las categorías de la BD
  const filterTabs = [{ id: 'Todos', name: 'Todos' }, ...categories];

  const renderServiceItem: ListRenderItem<Service> = ({ item }) => {
    
    // 1. Obtener imagen
    const imageSource = (item.photos_url && item.photos_url.length > 0) 
      ? { uri: item.photos_url[0] } 
      : { uri: 'https://cdn-icons-png.flaticon.com/512/620/620851.png' }; 

    // 2. Obtener Nombre de la Categoría
    let categoryName = 'Servicio';
    if (typeof item.category === 'object' && item.category?.name) {
        categoryName = item.category.name;
    } else {
        const found = categories.find(c => c.id.toString() === item.category?.toString());
        if (found) categoryName = found.name;
    }

    // 3. Unidad de Cobro
    const unitSuffix = item.charging_unit ? (UNIT_LABELS[item.charging_unit] || '') : '';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
      >
        {/* IMAGEN DEL SERVICIO */}
        <View style={styles.cardImageContainer}>
             <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
             {/* Badge de Nivel */}
             <View style={[styles.badge, { backgroundColor: '#fff', position: 'absolute', top: 10, left: 10 }]}>
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                  {item.certification_level || 'Estándar'}
                </Text>
             </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          
          {/* Categoría Dinámica */}
          <Text style={styles.categoryText}>{categoryName}</Text>
          
          <View style={styles.footerRow}>
              <View style={styles.ratingContainer}>
                <Text style={styles.stars}>★ {item.average_rating ? item.average_rating.toFixed(1) : 'Nuevo'}</Text> 
              </View>
              {/* Precio + Unidad */}
              <Text style={styles.price}>${item.price}{unitSuffix}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Servicios Disponibles</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={fetchData}>
          <Text>🔄</Text> 
        </TouchableOpacity>
      </View>

      {/* TABS DE FILTRADO DINÁMICOS */}
      <View>
        <FlatList
          data={filterTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tab, selectedCategory === item.id.toString() && styles.activeTab]}
              onPress={() => setSelectedCategory(item.id.toString())}
            >
              <Text style={[styles.tabText, selectedCategory === item.id.toString() && styles.activeTabText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderServiceItem}
          contentContainerStyle={styles.listContainer}
          numColumns={2} 
          columnWrapperStyle={{ gap: 15 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 50, color: '#777' }}>
              No hay servicios disponibles en esta categoría.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FONTS.bold, fontSize: 20, color: COLORS.textDark },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { paddingHorizontal: 20, paddingBottom: 15, gap: 10 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginRight: 8 },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontFamily: FONTS.semiBold, color: COLORS.textDark },
  activeTabText: { color: COLORS.white },
  listContainer: { padding: 20, paddingBottom: 100 },
  
  // CARD ESTILOS
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 15, ...SHADOWS.card, overflow: 'hidden', maxWidth: '48%' },
  cardImageContainer: { height: 120, width: '100%', backgroundColor: '#f0f0f0' },
  cardImage: { width: '100%', height: '100%' },
  
  cardContent: { padding: 10 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, marginBottom: 2, color: COLORS.textDark },
  categoryText: { fontSize: 12, color: COLORS.textLight, marginBottom: 5 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  stars: { color: '#ffc107', fontSize: 12, fontWeight: 'bold' },
  price: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 }
});

export default ServicesScreen;