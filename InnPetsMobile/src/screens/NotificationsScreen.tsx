import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 👇 1. CARGAR NOTIFICACIONES
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (error) {
      console.log("Error cargando notificaciones", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 👇 2. POLLING (Auto-actualizar cada 30 seg, igual que la web)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(); // Carga inicial al entrar
      
      const interval = setInterval(() => {
        fetchNotifications(); // Recarga silenciosa cada 30s
      }, 30000);

      return () => clearInterval(interval); // Limpiar al salir
    }, [])
  );

  // 👇 3. MARCAR COMO LEÍDA Y NAVEGAR
  const handleNotificationPress = async (item: any) => {
    // A) Marcar como leída visualmente inmediato (Optimistic Update)
    const updatedList = notifications.map(n => 
        n.id === item.id ? { ...n, is_read: true } : n
    );
    setNotifications(updatedList);

    // B) Llamar al backend
    if (!item.is_read) {
        try {
            await api.post(`/notifications/${item.id}/mark_read/`);
        } catch (error) {
            console.error("Error marcando leída", error);
        }
    }

    // C) Navegación Inteligente (Adaptado de la web)
    if (item.notification_type === 'BOOKING' && item.related_object_id) {
        // Asumiendo que tienes una pantalla BookingDetail que recibe { bookingId }
        // Si tu pantalla recibe el objeto entero, habría que hacer un fetch extra, 
        // pero lo normal es navegar por ID.
        navigation.navigate('BookingDetailScreen', { bookingId: item.related_object_id });
    } 
    // Si es Review, quizás quieras ir al perfil o al servicio
    else if (item.notification_type === 'REVIEW') {
         // Ejemplo: Ir al perfil para ver reseñas
         navigation.navigate('Main', { screen: 'Perfil' });
    }
  };

  // 👇 4. MARCAR TODAS COMO LEÍDAS
  const handleMarkAllRead = async () => {
    try {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        await api.post('/notifications/mark_all_read/');
    } catch (error) {
        Alert.alert("Error", "No se pudieron marcar todas.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // Iconos según tipo (Emojis para simplicidad en React Native)
    let icon = "🔔";
    if (item.notification_type === 'BOOKING') icon = "🐾";
    if (item.notification_type === 'PAYMENT') icon = "💰";
    if (item.notification_type === 'REVIEW') icon = "⭐";
    if (item.notification_type === 'CHAT') icon = "💬";

    return (
        <TouchableOpacity 
            style={[styles.card, !item.is_read && styles.unreadCard]} 
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.iconContainer}>
                <Text style={{fontSize: 24}}>{icon}</Text>
                {!item.is_read && <View style={styles.dot} />}
            </View>
            <View style={{flex: 1}}>
                <Text style={[styles.title, !item.is_read && styles.boldTitle]}>
                    {item.title}
                </Text>
                <Text style={styles.message} numberOfLines={3}>
                    {item.message}
                </Text>
                <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleString()}
                </Text>
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Leídas ✅</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{padding: 20}}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
            }
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={{fontSize: 50}}>🔕</Text>
                    <Text style={styles.emptyText}>No tienes notificaciones nuevas.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.card },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  markAllText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 },
  
  card: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: 'transparent', ...SHADOWS.card },
  unreadCard: { backgroundColor: '#e3f2fd', borderLeftColor: COLORS.primary }, // Azulito si no está leída
  
  iconContainer: { marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, position: 'absolute', top: 0, right: 0 },
  
  title: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textDark, marginBottom: 4 },
  boldTitle: { fontFamily: FONTS.bold },
  message: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  date: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'right' },

  emptyState: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
  emptyText: { marginTop: 10, fontFamily: FONTS.regular, color: COLORS.textLight }
});

export default NotificationsScreen;