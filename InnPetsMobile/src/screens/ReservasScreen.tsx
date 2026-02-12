import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
// 1. IMPORTAMOS EL ÍCONO
import { Ionicons } from '@expo/vector-icons'; 

const ReservasScreen = ({ navigation }: any) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<'PP' | 'IP' | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    if (!refreshing) setLoading(true);

    try {
      const userRes = await api.get('/users/');
      if (userRes.data?.[0]) {
          setUserRole(userRes.data[0].user_type);
      }

      const res = await api.get('/bookings/');
      setBookings(res.data);
    } catch (error) {
      console.error("Error cargando reservas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // 2. LÓGICA PARA ELIMINAR (SOFT DELETE)
  const handleDeleteBooking = (id: number) => {
    Alert.alert(
        "Eliminar del historial",
        "¿Estás seguro? Esta reserva dejará de ser visible para ti. Esta acción no se puede deshacer.",
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Eliminar", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        // Llamamos al endpoint DELETE que configuró tu compañero en el backend
                        await api.delete(`/bookings/${id}/`);
                        // Recargamos la lista para que desaparezca
                        fetchBookings(); 
                    } catch (error: any) {
                        console.error(error);
                        Alert.alert("Error", "No se pudo eliminar la reserva.");
                    }
                }
            }
        ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FFF4E5', text: '#FF9800' };
      case 'CONFIRMED': return { bg: '#E8F5E9', text: '#4CAF50' };
      case 'IN_PROGRESS': return { bg: '#E3F2FD', text: '#2196F3' };
      case 'COMPLETED': return { bg: '#F5F5F5', text: '#9E9E9E' };
      case 'CANCELLED': 
      case 'REJECTED': return { bg: '#FFEBEE', text: '#F44336' };
      default: return { bg: '#eee', text: '#333' };
    }
  };

  const getStatusLabel = (status: string) => {
    const map: any = {
        'PENDING': '⏳ Pendiente',
        'CONFIRMED': '✅ Confirmada',
        'IN_PROGRESS': '🏃 En Curso',
        'COMPLETED': '🏁 Finalizada',
        'CANCELLED': '🚫 Cancelada',
        'REJECTED': '❌ Rechazada'
    };
    return map[status] || status;
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusColor(item.status);
    const counterpartName = userRole === 'IP' ? item.owner_name : item.provider_name;
    const counterpartLabel = userRole === 'IP' ? 'Cliente' : 'Cuidador';

    // 3. VERIFICAR SI SE PUEDE BORRAR (Según la lógica del Backend)
    const isDeletable = ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(item.status);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
            navigation.navigate('BookingDetail', { 
                booking: item,
                userRole: userRole 
            }); 
        }}
      >
        <View style={styles.cardHeader}>
            <Text style={styles.serviceTitle}>{item.service_title}</Text>
            <Text style={styles.price}>${parseInt(item.total_price).toLocaleString('es-CL')}</Text>
        </View>

        <Text style={styles.date}>📅 {new Date(item.start_date).toLocaleDateString()} ➔ {new Date(item.end_date).toLocaleDateString()}</Text>
        <Text style={styles.counterpart}>
            {counterpartLabel}: <Text style={{fontFamily: FONTS.bold}}>{counterpartName}</Text>
        </Text>

        <View style={styles.footerRow}>
            {/* Badge de Estado */}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {getStatusLabel(item.status)}
                </Text>
            </View>

            {/* Icono de Basura (Solo si es borrable) */}
            {isDeletable && (
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteBooking(item.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} // Facilita el touch
                >
                    <Ionicons name="trash-outline" size={22} color={COLORS.danger || '#F44336'} />
                </TouchableOpacity>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservas</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={{fontSize: 50}}>📅</Text>
                <Text style={styles.emptyText}>No tienes reservas aún.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.white, ...SHADOWS.card, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, borderRadius: 15, padding: 15, marginBottom: 15, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  serviceTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary, flex: 1 },
  price: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark },
  date: { color: COLORS.textLight, marginBottom: 5 },
  counterpart: { color: COLORS.textDark, marginBottom: 10 },
  
  // Estilos para la fila inferior (Badge + Basura)
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontFamily: FONTS.bold, fontSize: 12 },
  deleteBtn: { padding: 5 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.textLight, marginTop: 10, fontFamily: FONTS.regular }
});

export default ReservasScreen;