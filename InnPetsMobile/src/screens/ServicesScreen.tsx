import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ListRenderItem 
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

const CATEGORIES = ['Todos', 'Paseo', 'Guardería', 'Hospedaje', 'Baño'];

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

  // Helper visual (si el backend no trae colores)
  const getVisuals = (category: string) => {
    switch(category) {
      case 'Paseo': return { icon: '🐕', color: '#d4edda', text: '#155724' };
      case 'Guardería': return { icon: '🏢', color: '#fff3cd', text: '#856404' };
      case 'Hospedaje': return { icon: '🏨', color: '#f8d7da', text: '#721c24' };
      case 'Veterinaria': return { icon: '🏥', color: '#cce5ff', text: '#004085' };
      default: return { icon: '🐾', color: '#e2e3e5', text: '#383d41' };
    }
  };

  const filteredServices = selectedCategory === 'Todos' 
    ? services 
    : services.filter(item => item.category === selectedCategory);

  // ✅ Tipamos explícitamente el renderItem
  const renderServiceItem: ListRenderItem<Service> = ({ item }) => {
    const visuals = getVisuals(item.category);
    
    // Preparamos el objeto completo para enviarlo al detalle
    const serviceWithVisuals: Service = { 
      ...item, 
      icon: visuals.icon,
      levelColor: visuals.color,
      levelText: visuals.text,
      // Si el backend no trae certification_level, ponemos uno por defecto
      certification_level: item.certification_level || 'Básica' 
    };

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ServiceDetail', { service: serviceWithVisuals })}
      >
        <View style={styles.cardIcon}>
          <Text style={{ fontSize: 40 }}>{visuals.icon}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: visuals.color }]}>
            <Text style={[styles.badgeText, { color: visuals.text }]}>
              {item.certification_level || 'Estándar'}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text style={styles.stars}>★★★★★</Text>
          </View>
          <Text style={styles.price}>${item.price}</Text>
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
          data={CATEGORIES}
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
              No hay servicios disponibles.
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
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 15, ...SHADOWS.card, overflow: 'hidden' },
  cardIcon: { height: 100, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 10 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, marginBottom: 5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 5 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  ratingContainer: { marginBottom: 5 },
  stars: { color: '#ffc107', fontSize: 12 },
  price: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 16 }
});

export default ServicesScreen;