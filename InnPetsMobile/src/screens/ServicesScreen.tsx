import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ListRenderItem, Image, Modal, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { servicesService } from '../services/api';
import { Service, ServiceCategory, RootStackParamList, MainTabParamList } from '../types';
import { REGIONES_CHILE } from '../constants/chile_data'; // 🔥 IMPORT NUEVO

import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ServicesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Servicios'>,
  NativeStackScreenProps<RootStackParamList>
>;

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
  
  // ESTADOS DE FILTROS
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // 🔥 ESTADOS PARA FILTRO DE UBICACIÓN (Usando archivo local)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterRegion, setFilterRegion] = useState<any>(null);
  const [filterCommune, setFilterCommune] = useState<string | null>(null);

  const [tempRegion, setTempRegion] = useState<any>(null);
  const [tempCommune, setTempCommune] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesData, categoriesData] = await Promise.all([
          servicesService.getAllServices(),
          servicesService.getCategories()
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron cargar los servicios.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTempRegion = (region: any) => {
      setTempRegion(region);
      setTempCommune(null); 
  };

  const applyFilters = () => {
      setFilterRegion(tempRegion);
      setFilterCommune(tempCommune);
      setShowFilterModal(false);
  };

  const clearFilters = () => {
      setTempRegion(null);
      setTempCommune(null);
      setFilterRegion(null);
      setFilterCommune(null);
      setShowFilterModal(false);
  };

  // 🔥 LÓGICA DE FILTRADO DINÁMICO TRIPLE
  const filteredServices = services.filter(item => {
        let matchCategory = true;
        if (selectedCategory !== 'Todos') {
            const catId = typeof item.category === 'object' && item.category !== null ? item.category.id : item.category;
            matchCategory = catId?.toString() === selectedCategory;
        }

        // Filtro Región
        let matchRegion = true;
        if (filterRegion) {
            matchRegion = item.region === filterRegion.region; 
        }

        // Filtro Comuna
        let matchCommune = true;
        if (filterCommune) {
            matchCommune = item.comuna === filterCommune; 
        }

        return matchCategory && matchRegion && matchCommune;
  });

  const filterTabs = [{ id: 'Todos', name: 'Todos' }, ...categories];

  const renderServiceItem: ListRenderItem<Service> = ({ item }) => {
    const imageSource = (item.photos_url && item.photos_url.length > 0) 
      ? { uri: item.photos_url[0] } 
      : { uri: 'https://cdn-icons-png.flaticon.com/512/620/620851.png' }; 

    let categoryName = 'Servicio';
    if (typeof item.category === 'object' && item.category?.name) {
        categoryName = item.category.name;
    } else {
        const found = categories.find(c => c.id.toString() === item.category?.toString());
        if (found) categoryName = found.name;
    }

    const unitSuffix = item.charging_unit ? (UNIT_LABELS[item.charging_unit] || '') : '';

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
      >
        <View style={styles.cardImageContainer}>
             <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
             <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.certification_level || 'Estándar'}
                </Text>
             </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.categoryText}>{categoryName}</Text>
          
          <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
              <Text style={styles.locationText} numberOfLines={1}>{item.comuna || 'Sin ubicación'}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.footerRow}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text style={styles.stars}>{item.average_rating ? item.average_rating.toFixed(1) : 'Nuevo'}</Text> 
              </View>
              <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}<Text style={styles.priceUnit}>{unitSuffix}</Text></Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Servicios Disponibles</Text>
            <Text style={styles.headerSubtitle}>Reserva paseos, veterinarios y más</Text>
        </View>
        <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={fetchData}>
                <Ionicons name="refresh" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilterModal(true)}>
                <Ionicons name="options-outline" size={22} color={COLORS.primary} />
                {(filterRegion || filterCommune) && <View style={styles.activeFilterDot} />}
            </TouchableOpacity>
        </View>
      </View>

      {/* TABS DE CATEGORÍAS */}
      <View style={styles.tabsWrapper}>
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

      {/* LISTA DE SERVICIOS */}
      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando servicios...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderServiceItem}
          contentContainerStyle={styles.listContainer}
          numColumns={2} 
          columnWrapperStyle={{ gap: 15 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No hay resultados</Text>
                <Text style={styles.emptyText}>Intenta cambiar los filtros de categoría o ubicación.</Text>
            </View>
          }
        />
      )}

      {/* 🔥 MODAL DE FILTROS AVANZADOS (Ajustado) */}
      <Modal visible={showFilterModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Filtrar Ubicación</Text>
                      <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                          <Ionicons name="close" size={24} color={COLORS.textDark} />
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Región</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                      {REGIONES_CHILE.map((reg) => (
                          <TouchableOpacity 
                              key={reg.region} 
                              style={[styles.filterChip, tempRegion?.region === reg.region && styles.filterChipActive]}
                              onPress={() => handleSelectTempRegion(reg)}
                          >
                              <Text style={[styles.filterChipText, tempRegion?.region === reg.region && styles.filterChipTextActive]}>
                                  {reg.region}
                              </Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <Text style={[styles.modalLabel, { marginTop: 20 }]}>Comuna</Text>
                  {tempRegion ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                          {tempRegion.comunas.map((com: string) => (
                              <TouchableOpacity 
                                  key={com} 
                                  style={[styles.filterChip, tempCommune === com && styles.filterChipActive]}
                                  onPress={() => setTempCommune(com)}
                              >
                                  <Text style={[styles.filterChipText, tempCommune === com && styles.filterChipTextActive]}>
                                      {com}
                                  </Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  ) : (
                      <Text style={styles.helperText}>Selecciona primero una región.</Text>
                  )}

                  <View style={styles.modalFooter}>
                      <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                          <Text style={styles.clearBtnText}>Limpiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                          <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                      </TouchableOpacity>
                  </View>

              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, backgroundColor: COLORS.white },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.textDark },
  headerSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  activeFilterDot: { position: 'absolute', top: 5, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger, borderWidth: 2, borderColor: '#F0F0F0' },
  tabsWrapper: { backgroundColor: COLORS.white, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabsContainer: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: COLORS.white, marginRight: 8 },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontFamily: FONTS.semiBold, color: COLORS.textLight, fontSize: 14 },
  activeTabText: { color: COLORS.white, fontFamily: FONTS.bold },
  listContainer: { padding: 15, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontFamily: FONTS.semiBold },
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 15, ...SHADOWS.card, overflow: 'hidden', maxWidth: '48%' },
  cardImageContainer: { height: 120, width: '100%', backgroundColor: '#EAEAEA' },
  cardImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary },
  cardContent: { padding: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, marginBottom: 2, color: COLORS.textDark },
  categoryText: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.primary, marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  locationText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textLight, marginLeft: 4, flex: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  stars: { color: COLORS.textDark, fontSize: 12, fontFamily: FONTS.bold, marginLeft: 4 },
  price: { fontFamily: FONTS.bold, color: COLORS.textDark, fontSize: 15 },
  priceUnit: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textLight },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, marginTop: 15 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, marginTop: 5, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  modalLabel: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', marginBottom: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 10 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.semiBold, color: COLORS.textDark, fontSize: 14 },
  filterChipTextActive: { color: COLORS.white },
  helperText: { color: COLORS.textLight, fontStyle: 'italic', fontSize: 13, marginBottom: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 15 },
  clearBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  clearBtnText: { color: COLORS.textDark, fontFamily: FONTS.bold, fontSize: 16 },
  applyBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  applyBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 }
});

export default ServicesScreen;