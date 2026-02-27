import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { marketplaceService } from '../services/api';
import { MarketplaceItem } from '../types';
import { Ionicons } from '@expo/vector-icons'; // 🔥 Agregamos íconos para darle vida

const MarketplaceScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await marketplaceService.getAll();
      setItems(data);
    } catch (error) {
      console.log("Error cargando marketplace:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // Solo mostramos los productos APROBADOS ('AP')
  const displayedItems = items.filter(item => item.status === 'AP');

  const renderItem = ({ item }: { item: MarketplaceItem }) => {
    const imageSource = item.photos_url && item.photos_url.length > 0 
      ? { uri: item.photos_url[0] } 
      : { uri: 'https://via.placeholder.com/300?text=Sin+Foto' };

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        // 🔥 MEJORA UX: En vez de crear chat directo, lo mandamos al detalle del producto
        onPress={() => navigation.navigate('MarketplaceItemDetail', { item })} 
      >
        <Image source={imageSource} style={styles.cardImage} />
        
        {/* Etiqueta de Condición Flotante */}
        <View style={[styles.badge, item.condition === 'NEW' ? styles.badgeNew : styles.badgeUsed]}>
          <Text style={styles.badgeText}>{item.condition === 'NEW' ? 'NUEVO' : 'USADO'}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Precio destacado */}
          <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}</Text>
          
          {/* Título del producto */}
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          
          {/* Footer de la tarjeta con el vendedor */}
          <View style={styles.sellerContainer}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.sellerName} numberOfLines={1}>{item.seller_name}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER ELEGANTE */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>InnPets Store</Text>
          <Text style={styles.headerSubtitle}>Encuentra lo mejor para tu mascota</Text>
        </View>
        <View style={styles.headerIconContainer}>
          <Ionicons name="bag-handle" size={26} color={COLORS.primary} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando vitrina...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ gap: 15 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={80} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Vitrina Vacía</Text>
              <Text style={styles.emptyText}>Sé el primero en publicar un producto y llega a cientos de dueños de mascotas.</Text>
            </View>
          }
        />
      )}

      {/* BOTÓN FLOTANTE EXTENDIDO (TIPO MERCADOLIBRE) */}
      <TouchableOpacity 
        style={styles.fabExtended} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreateMarketplaceItem')}
      >
        <Ionicons name="pricetag" size={20} color={COLORS.white} />
        <Text style={styles.fabText}>Vender</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' }, // Fondo un poco más gris para resaltar tarjetas blancas
  
  // Header
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.white, 
      borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
  headerSubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 2 },
  headerIconContainer: { backgroundColor: '#FFF0ED', padding: 10, borderRadius: 12 },

  // Listado
  listContainer: { padding: 15, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textLight, fontFamily: FONTS.semiBold },
  
  // Tarjetas
  card: { 
    flex: 1, backgroundColor: COLORS.white, borderRadius: 16, 
    marginBottom: 15, maxWidth: '48%', ...SHADOWS.card 
  },
  cardImage: { width: '100%', height: 150, borderTopLeftRadius: 16, borderTopRightRadius: 16, resizeMode: 'cover' },
  cardContent: { padding: 12 },
  price: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 4 },
  title: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.textLight, marginBottom: 10, height: 36, lineHeight: 18 },
  
  sellerContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 },
  sellerName: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textLight, marginLeft: 4, flex: 1 },
  
  // Etiquetas
  badge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeNew: { backgroundColor: COLORS.primary },
  badgeUsed: { backgroundColor: COLORS.textDark },
  badgeText: { color: COLORS.white, fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  
  // Empty State
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark, marginTop: 15, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, fontFamily: FONTS.regular, lineHeight: 22 },

  // Botón Flotante Extendido
  fabExtended: { 
    position: 'absolute', bottom: 25, right: 20, 
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.secondary, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 30, ...SHADOWS.card 
  },
  fabText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold }
});

export default MarketplaceScreen;