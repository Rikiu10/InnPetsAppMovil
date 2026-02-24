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

const ITEMS_PER_PAGE = 5; // 👈 Solo 5 items por vista

const ReservasScreen = ({ navigation }: any) => {
  const [bookings, setBookings] = useState<any[]>([]);           
  
  // Lista completa filtrada
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]); 
  
  // Lista recortada (Solo la página actual)
  const [visibleBookings, setVisibleBookings] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      // Aplicamos filtro inicial
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

  // Cada vez que cambiamos filtro, reseteamos a página 1
  useEffect(() => {
      filterData(bookings, activeFilter);
  }, [activeFilter, bookings]);

  // 👇 Cada vez que cambia la página o la lista filtrada, recalculamos lo visible
  useEffect(() => {
      updateVisibleItems();
  }, [currentPage, filteredBookings]);

  const filterData = (data: any[], filter: string) => {
      let result = [];
      if (filter === 'Todos') {
          result = data;
      } else {
          const map: any = {
              'Pendientes': ['PENDING'],
              'Confirmadas': ['CONFIRMED', 'ACCEPTED', 'APPROVED'], 
              'En Curso': ['IN_PROGRESS'], 
              'Completadas': ['COMPLETED'], 
              'Canceladas': ['CANCELLED', 'REJECTED']
          };
          
          const statusCodes = map[filter] || [];
          result = data.filter(item => statusCodes.includes(item.status));
      }
      
      setFilteredBookings(result);
      setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE) || 1);
      setCurrentPage(1); // Siempre volver a la 1 al filtrar
  };

  const updateVisibleItems = () => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      setVisibleBookings(filteredBookings.slice(start, end));
  };

  // --- CONTROLES DE PAGINACIÓN ---
  const goToNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
      if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleDeleteBooking = (id: number) => {
    Alert.alert(
        "Eliminar del historial",
        "¿Estás seguro?",
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

  // 👇 RENDERIZADO DE LA PAGINACIÓN
  const renderPagination = () => {
      // Si no hay datos o solo hay 1 página, no mostramos nada
      if (filteredBookings.length === 0 || totalPages <= 1) return <View style={{height: 20}} />;

      return (
          <View style={styles.paginationContainer}>
              <TouchableOpacity 
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} 
                  onPress={goToPrevPage}
                  disabled={currentPage === 1}
              >
                  <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : COLORS.primary} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && {color:'#ccc'}]}>Ant.</Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>
                      Página <Text style={{fontWeight:'bold', color: COLORS.primary}}>{currentPage}</Text> de {totalPages}
                  </Text>
              </View>

              <TouchableOpacity 
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} 
                  onPress={goToNextPage}
                  disabled={currentPage === totalPages}
              >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && {color:'#ccc'}]}>Sig.</Text>
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : COLORS.primary} />
              </TouchableOpacity>
          </View>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservas</Text>
      </View>

      <View style={{ paddingVertical: 15, paddingLeft: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
                'Todos', 'Pendientes', 'Confirmadas', 'En Curso', 'Completadas', 'Canceladas'
            ].map((cat, index) => (
                <TouchableOpacity 
                    key={index} 
                    style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
                    onPress={() => setActiveFilter(cat)}
                >
                    <Text style={[styles.filterText, activeFilter === cat && styles.filterTextActive]}>{cat}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={visibleBookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={renderPagination} // 👈 Paginación al final
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={{fontSize: 50}}>📅</Text>
                <Text style={styles.emptyText}>
                    {activeFilter === 'Todos' ? 'No tienes reservas aún.' : `No hay reservas en "${activeFilter}".`}
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
  
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
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

  // 👇 ESTILOS DE PAGINACIÓN
  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20, paddingHorizontal: 10 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: COLORS.white, borderRadius: 10, ...SHADOWS.card },
  pageBtnDisabled: { opacity: 0.5, backgroundColor: '#f0f0f0', elevation: 0 },
  pageBtnText: { fontWeight: 'bold', color: COLORS.primary, marginHorizontal: 5 },
  pageInfo: { backgroundColor: '#e0e0e0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  pageText: { fontSize: 12, color: '#555' },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textLight, marginTop: 10, fontFamily: FONTS.regular }
});

export default ReservasScreen;