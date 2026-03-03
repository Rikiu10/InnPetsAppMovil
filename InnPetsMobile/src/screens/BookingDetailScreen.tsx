import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { paymentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import PaymentSection from '../components/PaymentSection';

const BookingDetailScreen = ({ route, navigation }: any) => {
  // 🔥 MEJORA: Atrapamos la reserva O el ID si venimos de una notificación
  const { booking: initialBooking, bookingId } = route.params || {}; 
  const { user } = useAuth();

  const [booking, setBooking] = useState(initialBooking || null);
  const [loadingInitial, setLoadingInitial] = useState(!initialBooking); // 🔥 NUEVO: Carga inicial
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false); 

  // 🔥 NUEVO: Si entramos desde notificación solo con el ID, buscamos la reserva
  useEffect(() => {
      const fetchInitialBooking = async () => {
          if (!initialBooking && bookingId) {
              try {
                  const res = await api.get(`/bookings/${bookingId}/`);
                  setBooking(res.data);
              } catch (error) {
                  Alert.alert("Error", "No se pudo cargar la reserva");
                  navigation.goBack();
              } finally {
                  setLoadingInitial(false);
              }
          } else if (!initialBooking && !bookingId) {
              // Si no hay reserva ni ID, nos salimos para que no explote
              navigation.goBack(); 
          }
      };
      fetchInitialBooking();
  }, [initialBooking, bookingId]);

  const checkIsProvider = () => {
      if (!user || !booking) return false;

      const providerEmail = booking.provider_email || booking.provider?.email;
      if (providerEmail && user.email) {
          if (providerEmail.toLowerCase() === user.email.toLowerCase()) return true;
      }

      let providerIdFromBooking = null;
      if (typeof booking.provider === 'number') providerIdFromBooking = booking.provider;
      else if (typeof booking.provider === 'object' && booking.provider?.id) providerIdFromBooking = booking.provider.id;
      else if (typeof booking.service?.provider === 'number') providerIdFromBooking = booking.service.provider;
      else if (typeof booking.service?.provider === 'object') providerIdFromBooking = booking.service.provider.id;

      if (providerIdFromBooking && Number(providerIdFromBooking) === Number(user.id)) return true;
      if (user.provider_profile_id && providerIdFromBooking && Number(user.provider_profile_id) === Number(providerIdFromBooking)) return true;
      
      return false;
  };

  const amITheProvider = checkIsProvider();
  const activeRole = amITheProvider ? 'IP' : 'PP';

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
        if (event.url.includes('payment_success') || event.url.includes('approved') || event.url.includes('collection_status=approved')) {
            Alert.alert("¡Pago Recibido! 🎉", "Tu reserva ha sido confirmada.");
            onRefresh(); 
        }
    };
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    if (!booking?.id) return;
    setRefreshing(true);
    try {
        const res = await api.get(`/bookings/${booking.id}/`);
        setBooking(res.data);
    } catch (error) {
        console.error("Error refrescando reserva", error);
    } finally {
        setRefreshing(false);
    }
  }, [booking?.id]);

  useFocusEffect(
    useCallback(() => {
      if (booking?.id) onRefresh();
    }, [onRefresh, booking?.id])
  );

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking.id}/`, { status: newStatus });
      setBooking({ ...booking, status: newStatus });
      
      let msg = "Estado actualizado.";
      if (newStatus === 'CONFIRMED') msg = "¡Reserva Aceptada! El cliente ahora podrá realizar el pago.";
      if (newStatus === 'COMPLETED') msg = "Servicio Completado. ¡Gracias!";
      if (newStatus === 'REJECTED') msg = "Reserva Rechazada.";
      
      Alert.alert("¡Listo!", msg);
    } catch (error: any) {
        console.log("Error Backend:", error.response?.data);
        const msg = error.response?.data?.error || "No se pudo actualizar.";
        Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
      setPaying(true);
      try {
          const data = await paymentService.createPreference(booking.id);
          const paymentLink = data.init_point || data.sandbox_init_point;

          if (paymentLink) {
              await WebBrowser.openBrowserAsync(paymentLink);
              setTimeout(onRefresh, 5000); 
          } else {
              Alert.alert("Error", "No se recibió enlace de pago.");
          }
      } catch (error: any) {
          Alert.alert("Error", "Fallo al iniciar el pago.");
      } finally {
          setPaying(false);
      }
  };

  const handleReview = () => {
    navigation.navigate('CreateReview', { 
       bookingId: booking.id, booking: booking, userRole: activeRole 
    });
  };

  const getStatusLabel = (status: string) => {
    const map: any = {
        'PENDING': '⏳ Pendiente de Aprobación',
        'CONFIRMED': '✅ Confirmada (Esperando Pago)', 
        'IN_PROGRESS': '🏃 En Curso',
        'COMPLETED': '🏆 Completada',
        'CANCELLED': '🚫 Cancelada',
        'REJECTED': '❌ Rechazada'
    };
    return map[status] || status;
  };

  // 🔥 NUEVO: PANTALLA DE CARGA SI ESTAMOS BUSCANDO LA RESERVA
  if (loadingInitial || !booking) {
      return (
          <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{marginTop: 10, color: '#666'}}>Cargando reserva...</Text>
          </SafeAreaView>
      );
  }

  const hasAlreadyReviewed = booking.has_review || booking.reviewed || booking.has_reviewed || false;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserva #{booking.id}</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.statusContainer, booking.status === 'CONFIRMED' ? {backgroundColor: '#E8F5E9', borderColor: '#C8E6C9'} : {}]}>
            <Text style={styles.statusLabel}>Estado Actual:</Text>
            <Text style={[styles.statusValue, booking.status === 'CONFIRMED' ? {color: COLORS.success} : {}]}>
                {getStatusLabel(booking.status)}
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Servicio Solicitado</Text>
            <Text style={styles.serviceTitle}>{booking.service_title || booking.service?.title}</Text>
            <Text style={{color: COLORS.textLight, marginBottom: 10}}>
                📅 {booking.start_date} ➔ {booking.end_date}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Involucrados</Text>
            <Text style={styles.rowText}>
                👤 Cliente: <Text style={{fontWeight:'bold'}}>{booking.owner_name} {activeRole === 'PP' ? '(Tú)' : ''}</Text>
            </Text>
            <Text style={styles.rowText}>
                🛠️ Proveedor: <Text style={{fontWeight:'bold'}}>{booking.provider_name} {activeRole === 'IP' ? '(Tú)' : ''}</Text>
            </Text>
            {booking.notes ? (
                <View style={{marginTop: 10, backgroundColor: '#fffbe6', padding: 10, borderRadius: 8}}>
                    <Text style={{fontSize: 12, color: '#856404'}}>📝 Nota: {booking.notes}</Text>
                </View>
            ) : null}
        </View>

        {activeRole === 'PP' && booking.status === 'CONFIRMED' && (
            <PaymentSection 
                booking={booking} 
                onPayPress={handlePayment} 
                loading={paying}
            />
        )}

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>💰 Detalle Financiero</Text>
            {activeRole === 'IP' && (
                <>
                    <View style={styles.row}><Text>Tu Ganancia (Neto):</Text><Text style={{fontWeight:'bold'}}>${booking.provider_payout}</Text></View>
                    <View style={styles.row}><Text style={{color:'#888'}}>Comisión Plataforma:</Text><Text style={{color:'#888'}}>- ${booking.commission_fee}</Text></View>
                    <View style={styles.divider} />
                </>
            )}
            <View style={styles.row}>
                <Text style={styles.totalText}>{activeRole === 'PP' ? 'Total a Pagar:' : 'Total Cobrado:'}</Text>
                <Text style={styles.totalPrice}>${booking.price_total || booking.total_price}</Text>
            </View>
        </View>

        <View style={styles.actions}>
            
            {/* --- MENÚ DEL PROVEEDOR --- */}
            {activeRole === 'IP' && (
                <>
                    {booking.status === 'PENDING' && (
                        <>
                            <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('REJECTED')} disabled={loading}>
                                <Text style={styles.btnText}>Rechazar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.btnAccept} onPress={() => updateStatus('CONFIRMED')} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Aceptar Reserva</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                    
                    {booking.status === 'CONFIRMED' && (
                        <View style={{width: '100%', marginBottom: 10}}>
                            <View style={styles.infoBox}>
                                <Text style={{textAlign:'center', color: '#666'}}>
                                    ✅ Reserva Aceptada. Esperando que el cliente realice el pago.
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.btnComplete} onPress={() => updateStatus('COMPLETED')} disabled={loading}>
                                 {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>🏁 Marcar Completada</Text>}
                            </TouchableOpacity>
                        </View>
                    )}

                    {booking.status === 'COMPLETED' && !hasAlreadyReviewed && (
                          <TouchableOpacity style={styles.btnReview} onPress={handleReview}>
                              <Text style={styles.btnText}>⭐ Calificar Cliente</Text>
                          </TouchableOpacity>
                    )}
                    {booking.status === 'COMPLETED' && hasAlreadyReviewed && (
                          <View style={styles.reviewedBox}>
                              <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>✅ Ya calificaste este servicio</Text>
                          </View>
                    )}
                </>
            )}

            {/* --- MENÚ DEL DUEÑO --- */}
            {activeRole === 'PP' && (
                <>
                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('CANCELLED')} disabled={loading}>
                              {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Cancelar Reserva</Text>}
                        </TouchableOpacity>
                    )}
                    
                    {booking.status === 'COMPLETED' && !hasAlreadyReviewed && (
                          <TouchableOpacity style={styles.btnReview} onPress={handleReview}>
                              <Text style={styles.btnText}>⭐ Calificar Servicio</Text>
                          </TouchableOpacity>
                    )}
                    {booking.status === 'COMPLETED' && hasAlreadyReviewed && (
                          <View style={styles.reviewedBox}>
                              <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>✅ Ya calificaste este servicio</Text>
                          </View>
                    )}
                </>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  statusContainer: { alignItems: 'center', marginBottom: 20, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  statusLabel: { color: COLORS.textLight, fontSize: 12, marginBottom: 2 },
  statusValue: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary },
  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 20, ...SHADOWS.card },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 10, color: COLORS.textDark },
  serviceTitle: { fontSize: 20, color: COLORS.primary, fontFamily: FONTS.bold, marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowText: { marginBottom: 5, fontSize: 15, color: COLORS.textDark },
  totalText: { fontFamily: FONTS.bold, fontSize: 18 },
  totalPrice: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 15, marginTop: 10, flexWrap: 'wrap' },
  btnAccept: { flex: 1, backgroundColor: COLORS.success, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnReject: { flex: 1, backgroundColor: COLORS.danger, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnComplete: { width: '100%', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnReview: { width: '100%', backgroundColor: '#FFC107', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 16 },
  infoBox: { width: '100%', padding: 15, backgroundColor: '#f5f5f5', borderRadius: 10, marginBottom: 10 },
  reviewedBox: { width: '100%', padding: 15, backgroundColor: '#E8F5E9', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9' } 
});

export default BookingDetailScreen;