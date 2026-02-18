import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, 
  RefreshControl, Alert, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons'; 

const ReservasScreen = ({ navigation }: any) => {
  const [bookings, setBookings] = useState<any[]>([]);           
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<'PP' | 'IP' | null>(null);
  
  const [activeFilter, setActiveFilter] = useState('Todos');

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
      filterData(res.data, activeFilter);
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

  useEffect(() => {
      filterData(bookings, activeFilter);
  }, [activeFilter, bookings]);

  // Lógica de filtrado
  const filterData = (data: any[], filter: string) => {
      if (filter === 'Todos') {
          setFilteredBookings(data);
      } else {
          const map: any = {
              'Pendientes': ['PENDING'],
              'Confirmadas': ['CONFIRMED', 'ACCEPTED', 'APPROVED'], 
              'En Curso': ['IN_PROGRESS'], 
              'Completadas': ['COMPLETED'], 
              'Canceladas': ['CANCELLED', 'REJECTED']
          };
          
          const statusCodes = map[filter] || [];
          const result = data.filter(item => statusCodes.includes(item.status));
          setFilteredBookings(result);
      }
  };

  const handleDeleteBooking = (id: number) => {
    Alert.alert(
        "Eliminar del historial",
        "¿Estás seguro? Esta acción solo la ocultará de tu lista.",
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Eliminar", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await api.delete(`/bookings/${id}/`);
                        fetchBookings(); 
                    } catch (error: any) {
                        console.error(error);
                        Alert.alert("Error", "No se pudo eliminar.");
                    }
                }
            }
        ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FFF4E5', text: '#FF9800' };
      case 'CONFIRMED': 
      case 'ACCEPTED':
      case 'APPROVED': return { bg: '#E8F5E9', text: '#4CAF50' }; 
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
        'ACCEPTED': '✅ Aceptada',
        'APPROVED': '✅ Aceptada',
        'CONFIRMED': '✅ Confirmada',
        'IN_PROGRESS': '🏃 En Curso (Pagada)',
        'COMPLETED': '🏁 Completada',
        'CANCELLED': '🚫 Cancelada',
        'REJECTED': '❌ Rechazada'
    };
    return map[status] || status;
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusColor(item.status);
    const counterpartName = userRole === 'IP' ? item.owner_name : item.provider_name;
    const counterpartLabel = userRole === 'IP' ? 'Cliente' : 'Cuidador';
    
    const isDeletable = ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(item.status);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
            // 👇 CORRECCIÓN AQUÍ: Cambiamos 'BookingDetailScreen' por 'BookingDetail'
            // Esto coincide con el nombre que definiste en tu App.tsx o Navigator
            navigation.navigate('BookingDetail', { 
                booking: item,
                userRole: userRole 
            }); 
        }}
      >
        <View style={styles.cardHeader}>
            <Text style={styles.serviceTitle}>{item.service_title || 'Servicio sin nombre'}</Text>
            <Text style={styles.price}>${parseInt(item.total_price || item.price_total || 0).toLocaleString('es-CL')}</Text>
        </View>

        <Text style={styles.date}>📅 {new Date(item.start_date).toLocaleDateString()} ➔ {new Date(item.end_date).toLocaleDateString()}</Text>
        <Text style={styles.counterpart}>
            {counterpartLabel}: <Text style={{fontFamily: FONTS.bold}}>{counterpartName}</Text>
        </Text>

        <View style={styles.footerRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {getStatusLabel(item.status)}
                </Text>
            </View>

            {isDeletable && (
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteBooking(item.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
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

      {/* FILTROS (CHIPS) */}
      <View style={{ paddingVertical: 15, paddingLeft: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
                'Todos', 
                'Pendientes', 
                'Confirmadas', 
                'En Curso', 
                'Completadas', 
                'Canceladas'
            ].map((cat, index) => (
                <TouchableOpacity 
                    key={index} 
                    style={[
                        styles.filterChip, 
                        activeFilter === cat && styles.filterChipActive
                    ]}
                    onPress={() => setActiveFilter(cat)}
                >
                    <Text style={[
                        styles.filterText, 
                        activeFilter === cat && styles.filterTextActive
                    ]}>
                        {cat}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredBookings} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={{fontSize: 50}}>📅</Text>
                <Text style={styles.emptyText}>
                    {activeFilter === 'Todos' 
                        ? 'No tienes reservas aún.' 
                        : `No hay reservas en "${activeFilter}".`}
                </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 5, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, marginRight: 10, borderWidth: 1, borderColor: '#DDD'
  },
  filterChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary
  },
  filterText: { fontFamily: FONTS.bold, color: COLORS.textLight, fontSize: 13 },
  filterTextActive: { color: 'white' },

  card: { backgroundColor: COLORS.white, borderRadius: 15, padding: 15, marginBottom: 15, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  serviceTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary, flex: 1 },
  price: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark },
  date: { color: COLORS.textLight, marginBottom: 5 },
  counterpart: { color: COLORS.textDark, marginBottom: 10 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontFamily: FONTS.bold, fontSize: 12 },
  deleteBtn: { padding: 5 },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textLight, marginTop: 10, fontFamily: FONTS.regular }
});

export default ReservasScreen;