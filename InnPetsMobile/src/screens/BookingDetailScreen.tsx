import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
// 👇 IMPORTAMOS EL COMPONENTE DE PAGO
import PaymentSection from '../components/PaymentSection';

const BookingDetailScreen = ({ route, navigation }: any) => {
  const { booking: initialBooking } = route.params; 
  const { user } = useAuth();

  // Usamos el booking del estado para poder refrescarlo
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 👇 DETECCIÓN DE ROL
  const providerId = typeof booking.service?.provider === 'object' ? booking.service.provider.id : booking.service?.provider;
  
  // Verificamos si soy el proveedor comparando IDs
  const amITheProvider = user?.id === providerId; 
  const activeRole = amITheProvider ? 'IP' : 'PP';

  // Función para recargar datos (útil después de pagar)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
        const res = await api.get(`/bookings/${booking.id}/`);
        setBooking(res.data);
    } catch (error) {
        console.error("Error refrescando reserva", error);
    } finally {
        setRefreshing(false);
    }
  }, [booking.id]);

  // Función genérica para cambiar estado
  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking.id}/`, { status: newStatus });
      
      // Actualizamos localmente
      setBooking({ ...booking, status: newStatus });
      
      let mensaje = "Estado actualizado.";
      // ⚠️ CAMBIO IMPORTANTE: Ahora 'APPROVED' es el paso previo al pago
      if(newStatus === 'APPROVED') mensaje = "¡Solicitud Aprobada! El cliente ahora puede proceder al pago.";
      if(newStatus === 'CONFIRMED') mensaje = "¡Reserva Confirmada y Pagada!";
      if(newStatus === 'COMPLETED') mensaje = "¡Felicidades! Servicio marcado como completado.";
      
      Alert.alert("¡Listo!", mensaje);
    } catch (error: any) {
        console.log(error.response?.data);
        const msg = error.response?.data?.error || "No se pudo actualizar la reserva.";
        Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = () => {
    navigation.navigate('CreateReview', { 
       bookingId: booking.id,
       booking: booking,
       userRole: activeRole 
    });
  };

  const getStatusLabel = (status: string) => {
    const map: any = {
        'PENDING': '⏳ Pendiente de Aprobación',
        'APPROVED': '💳 Aprobada (Esperando Pago)', // Nuevo estado intermedio
        'CONFIRMED': '✅ Confirmada y Pagada',
        'IN_PROGRESS': '🏃 En Curso',
        'COMPLETED': '🏆 Completada',
        'CANCELLED': '🚫 Cancelada',
        'REJECTED': '❌ Rechazada'
    };
    return map[status] || status;
  };

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
        
        <View style={[styles.statusContainer, 
            booking.status === 'CONFIRMED' ? {backgroundColor: '#E8F5E9', borderColor: '#C8E6C9'} : {}
        ]}>
            <Text style={styles.statusLabel}>Estado Actual:</Text>
            <Text style={[styles.statusValue, booking.status === 'CONFIRMED' ? {color: COLORS.success} : {}]}>
                {getStatusLabel(booking.status)}
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Servicio Solicitado</Text>
            {/* Ajuste: a veces service viene populado, a veces flat, depende del serializer */}
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

        {/* --- SECCIÓN DE PAGO (SOLO PARA DUEÑOS CUANDO ESTÁ APROBADO) --- */}
        {activeRole === 'PP' && booking.status === 'APPROVED' && (
            <PaymentSection booking={booking} />
        )}

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>💰 Detalle Financiero</Text>
            
            {/* Desglose para Proveedor (IP) */}
            {activeRole === 'IP' && (
                <>
                    <View style={styles.row}><Text>Tu Ganancia (Neto):</Text><Text style={{fontWeight:'bold'}}>${booking.provider_payout}</Text></View>
                    <View style={styles.row}><Text style={{color:'#888'}}>Comisión Plataforma:</Text><Text style={{color:'#888'}}>- ${booking.commission_fee}</Text></View>
                    <View style={styles.divider} />
                </>
            )}
            
            <View style={styles.row}>
                <Text style={styles.totalText}>
                    {activeRole === 'PP' ? 'Total a Pagar:' : 'Total Cobrado al Cliente:'}
                </Text>
                <Text style={styles.totalPrice}>${booking.price_total || booking.total_price}</Text>
            </View>
        </View>

        {/* --- BOTONES DE ACCIÓN --- */}
        <View style={styles.actions}>
            
            {/* LÓGICA PARA PROVEEDOR (IP) */}
            {activeRole === 'IP' && (
                <>
                    {/* Si está PENDING, el proveedor ACEPTA (Pasa a APPROVED) */}
                    {booking.status === 'PENDING' && (
                        <>
                            <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('REJECTED')} disabled={loading}>
                                <Text style={styles.btnText}>Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnAccept} onPress={() => updateStatus('APPROVED')} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Aceptar Reserva</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Si está APPROVED, esperamos el pago */}
                    {booking.status === 'APPROVED' && (
                        <View style={styles.infoBox}>
                            <Text style={{textAlign:'center', color: '#666'}}>
                                ⏳ Esperando que el cliente realice el pago...
                            </Text>
                        </View>
                    )}

                    {/* Si está PAGADO (CONFIRMED), podemos finalizar */}
                    {booking.status === 'CONFIRMED' && (
                        <TouchableOpacity style={styles.btnComplete} onPress={() => updateStatus('COMPLETED')} disabled={loading}>
                             {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>🏁 Marcar como Completada</Text>}
                        </TouchableOpacity>
                    )}

                    {/* Calificar */}
                    {booking.status === 'COMPLETED' && (
                         <TouchableOpacity style={styles.btnReview} onPress={handleReview}>
                             <Text style={styles.btnText}>⭐ Calificar Cliente</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* LÓGICA PARA DUEÑO (PP) */}
            {activeRole === 'PP' && (
                <>
                    {/* Puede cancelar antes de que finalice */}
                    {(booking.status === 'PENDING' || booking.status === 'APPROVED' || booking.status === 'CONFIRMED') && (
                        <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('CANCELLED')} disabled={loading}>
                             {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Cancelar Reserva</Text>}
                        </TouchableOpacity>
                    )}

                    {/* Calificar */}
                    {booking.status === 'COMPLETED' && (
                         <TouchableOpacity style={styles.btnReview} onPress={handleReview}>
                             <Text style={styles.btnText}>⭐ Calificar Servicio</Text>
                        </TouchableOpacity>
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
  
  infoBox: { width: '100%', padding: 15, backgroundColor: '#f5f5f5', borderRadius: 10, marginBottom: 10 }
});

export default BookingDetailScreen;