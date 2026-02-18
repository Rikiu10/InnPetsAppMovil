import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ListRenderItem, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { servicesService } from '../services/api';
import { Service, RootStackParamList, MainTabParamList } from '../types';

// IMPORTS DE NAVEGACIÓN
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ServicesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Servicios'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Categorías para el filtro superior
const CATEGORIES_FILTER = ['Todos', 'Paseo', 'Guardería', 'Hospedaje', 'Baño', 'Veterinaria'];

// Mapa para traducir el código del backend (WALK) a español (Paseo)
const CATEGORY_LABELS: Record<string, string> = {
    'WALK': 'Paseo 🐕',
    'BOARDING': 'Hospedaje 🏨',
    'DAYCARE': 'Guardería ☀️',
    'GROOMING': 'Peluquería ✂️', // A veces "Baño" cae aquí
    'VETERINARY': 'Veterinaria 🩺',
    'TRAINING': 'Adiestramiento 🎓',
    'OTHER': 'Otro 🐾'
};

// Mapa inverso para el filtro (Español -> Código Backend)
// Esto sirve para cuando seleccionas "Paseo" en el filtro, sepamos buscar "WALK"
const FILTER_MAP: Record<string, string> = {
    'Paseo': 'WALK',
    'Guardería': 'DAYCARE',
    'Hospedaje': 'BOARDING',
    'Baño': 'GROOMING',
    'Veterinaria': 'VETERINARY'
};

const ServicesScreen = ({ navigation }: ServicesScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]); 
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await servicesService.getAllServices();
      setServices(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron cargar los servicios.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtrado
  const filteredServices = selectedCategory === 'Todos' 
    ? services 
    : services.filter(item => item.service_type === FILTER_MAP[selectedCategory]);

  const renderServiceItem: ListRenderItem<Service> = ({ item }) => {
    
    // 1. Obtener imagen: Si hay array y tiene elementos, usar la primera. Si no, placeholder.

    const imageSource = (item.photos_url && item.photos_url.length > 0) 
      ? { uri: item.photos_url[0] } 
      : { uri: 'https://cdn-icons-png.flaticon.com/512/620/620851.png' }; // URL de una patita para que no falle

    // 2. Obtener etiqueta de categoría
    const categoryLabel = CATEGORY_LABELS[item.service_type] || 'Servicio';

    // 3. Preparar objeto para navegación (si necesitas pasar props extra)
    const serviceForDetail = { ...item };

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ServiceDetail', { service: serviceForDetail })}
      >
        {/* IMAGEN DEL SERVICIO */}
        <View style={styles.cardImageContainer}>
             <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
             {/* Badge de Nivel sobre la imagen */}
             <View style={[styles.badge, { backgroundColor: '#fff', position: 'absolute', top: 10, left: 10 }]}>
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                  {item.certification_level || 'Estándar'}
                </Text>
             </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          
          {/* Categoría */}
          <Text style={styles.categoryText}>{categoryLabel}</Text>
          
          <View style={styles.footerRow}>
              <View style={styles.ratingContainer}>
                <Text style={styles.stars}>★ 5.0</Text> 
              </View>
              <Text style={styles.price}>${item.price}</Text>
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
        <TouchableOpacity style={styles.filterBtn} onPress={fetchServices}>
          <Text>🔄</Text> 
        </TouchableOpacity>
      </View>

      <View>
        <FlatList
          data={CATEGORIES_FILTER}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tab, selectedCategory === item && styles.activeTab]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.tabText, selectedCategory === item && styles.activeTabText]}>
                {item}
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