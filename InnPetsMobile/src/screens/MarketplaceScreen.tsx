import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { marketplaceService } from '../services/api';
// 🔥 IMPORTAMOS EL SERVICIO DE CHAT
import { chatService } from '../services/chatService'; 
import { MarketplaceItem } from '../types';

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

  // 🔥 FILTRO CLAVE: Solo mostramos los productos APROBADOS ('AP') en la tienda principal
  const displayedItems = items.filter(item => item.status === 'AP');

  const renderItem = ({ item }: { item: MarketplaceItem }) => {
    const imageSource = item.photos_url && item.photos_url.length > 0 
      ? { uri: item.photos_url[0] } 
      : { uri: 'https://via.placeholder.com/150?text=Sin+Foto' };

    // 🔥 FUNCIÓN PARA IR AL CHAT
    const handleContactSeller = async () => {
        try {
            // Crea o recupera el chat con el vendedor
            const res = await chatService.createMarketplaceChat(item.id);
            // Redirige a la pantalla de chat pasando el ID y el nombre del vendedor
            navigation.navigate('ChatDetail', { 
                roomId: res.room_id, 
                partnerName: item.seller_name,
                isSupport: false 
            });
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || "No se pudo contactar al vendedor.";
            Alert.alert("Aviso", errorMsg);
        }
    };

    return (
      <TouchableOpacity 
        style={styles.card}
        // 🔥 AHORA EJECUTA NUESTRA NUEVA FUNCIÓN
        onPress={handleContactSeller} 
      >
        <Image source={imageSource} style={styles.cardImage} />
        
        {/* Etiqueta de Condición */}
        <View style={[styles.badge, item.condition === 'NEW' ? styles.badgeNew : styles.badgeUsed]}>
          <Text style={styles.badgeText}>{item.condition === 'NEW' ? 'Nuevo' : 'Usado'}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>InnPets Store 🛒</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={displayedItems} // 🔥 Usamos la lista filtrada
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ gap: 15 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 50 }}>🛍️</Text>
              <Text style={styles.emptyText}>No hay productos disponibles aún.</Text>
            </View>
          }
        />
      )}

      {/* Botón Flotante para Vender */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateMarketplaceItem')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.white, alignItems: 'center', ...SHADOWS.card },
  headerTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textDark },
  listContainer: { padding: 15, paddingBottom: 100 },
  
  card: { 
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12, 
    marginBottom: 15, maxWidth: '48%', overflow: 'hidden', ...SHADOWS.card 
  },
  cardImage: { width: '100%', height: 140, resizeMode: 'cover' },
  cardContent: { padding: 10 },
  title: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 5, height: 40 },
  price: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary },
  
  badge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeNew: { backgroundColor: '#4caf50' },
  badgeUsed: { backgroundColor: '#ff9800' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: COLORS.textLight, fontFamily: FONTS.regular },

  fab: { 
    position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, 
    borderRadius: 30, backgroundColor: COLORS.secondary, justifyContent: 'center', 
    alignItems: 'center', ...SHADOWS.card 
  },
  fabIcon: { color: 'white', fontSize: 30, fontWeight: 'bold', marginTop: -2 }
});

export default MarketplaceScreen;