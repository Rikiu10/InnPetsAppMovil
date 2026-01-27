import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext'; // 👈 1. Importamos el cerebro

const BookingDetailScreen = ({ route, navigation }: any) => {
  const { booking } = route.params; 
  // 👇 2. Obtenemos el usuario real conectado
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(booking.status);

  // 👇 3. DETECCIÓN AUTOMÁTICA DE ROL
  // ¿Soy yo el proveedor de esta reserva?
  // Nota: Asegúrate de que tu backend mande 'provider' (ID) o 'provider_id' en el objeto booking
  // Si booking.provider es un objeto, usamos booking.provider.id
  const providerId = typeof booking.provider === 'object' ? booking.provider.id : booking.provider;
  
  // A veces el backend manda el ID del User dentro del ProviderProfile, o directo el ID del User.
  // Ajusta esto según tu serializer. Normalmente comparamos IDs de usuarios.
  const amITheProvider = user?.id === providerId || user?.email === booking.provider_email; 

  // Definimos el rol REAL para esta pantalla
  const activeRole = amITheProvider ? 'IP' : 'PP';

  console.log(`Usuario: ${user?.id}, ProveedorReserva: ${providerId} -> Rol Activo: ${activeRole}`);

  // Función genérica para cambiar estado
  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking.id}/`, { status: newStatus });
      setCurrentStatus(newStatus);
      
      let mensaje = "Estado actualizado.";
      if(newStatus === 'CONFIRMED') mensaje = "¡Reserva aceptada! Prepara todo para el servicio.";
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
       userRole: activeRole // Usamos el rol detectado
    });
  };

  const getStatusLabel = (status: string) => {
    const map: any = {
        'PENDING': '⏳ Pendiente',
        'CONFIRMED': '✅ Confirmada',
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
        <Text style={styles.headerTitle}>Detalle Reserva #{booking.id}</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Estado Actual:</Text>
            <Text style={styles.statusValue}>{getStatusLabel(currentStatus)}</Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Servicio Solicitado</Text>
            <Text style={styles.serviceTitle}>{booking.service_title}</Text>
            <Text style={{color: COLORS.textLight, marginBottom: 10}}>
                {booking.start_date} ➔ {booking.end_date}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Involucrados</Text>
            {/* Resaltamos quién eres tú */}
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

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>💰 Detalle del Pago</Text>
            
            {/* Solo el proveedor ve el desglose de comisiones */}
            {activeRole === 'IP' && (
                <>
                    <View style={styles.row}><Text>Tu Ganancia (Neto):</Text><Text>${booking.net_amount}</Text></View>
                    <View style={styles.row}><Text>Comisión App:</Text><Text>- ${booking.app_fee}</Text></View>
                    <View style={styles.row}><Text>Impuestos:</Text><Text>+ ${booking.tax_amount}</Text></View>
                    <View style={styles.divider} />
                </>
            )}
            <View style={styles.row}>
                <Text style={styles.totalText}>Total {activeRole === 'PP' ? 'a Pagar' : 'Reserva'}:</Text>
                <Text style={styles.totalPrice}>${booking.total_price}</Text>
            </View>
        </View>

        {/* --- BOTONES DE ACCIÓN (Usamos activeRole) --- */}
        <View style={styles.actions}>
            
            {/* LÓGICA PARA PROVEEDOR (IP) */}
            {activeRole === 'IP' && (
                <>
                    {/* Si está pendiente: Aceptar o Rechazar */}
                    {currentStatus === 'PENDING' && (
                        <>
                            <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('REJECTED')} disabled={loading}>
                                <Text style={styles.btnText}>Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnAccept} onPress={() => updateStatus('CONFIRMED')} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Aceptar Reserva</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Si está confirmada: Completar */}
                    {currentStatus === 'CONFIRMED' && (
                        <TouchableOpacity style={styles.btnComplete} onPress={() => updateStatus('COMPLETED')} disabled={loading}>
                             {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>🏁 Marcar como Completada</Text>}
                        </TouchableOpacity>
                    )}

                    {/* Si está completada: CALIFICAR AL DUEÑO */}
                    {currentStatus === 'COMPLETED' && (
                         <TouchableOpacity style={styles.btnReview} onPress={handleReview}>
                             <Text style={styles.btnText}>⭐ Calificar Dueño/Mascota</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* LÓGICA PARA DUEÑO (PP) */}
            {activeRole === 'PP' && (
                <>
                    {/* Puede cancelar si aún no ha finalizado */}
                    {(currentStatus === 'PENDING' || currentStatus === 'CONFIRMED') && (
                        <TouchableOpacity style={styles.btnReject} onPress={() => updateStatus('CANCELLED')} disabled={loading}>
                             {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Cancelar Reserva</Text>}
                        </TouchableOpacity>
                    )}

                    {/* Puede calificar si está completada */}
                    {currentStatus === 'COMPLETED' && (
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
  statusContainer: { alignItems: 'center', marginBottom: 20 },
  statusLabel: { color: COLORS.textLight },
  statusValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary },
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
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 16 }
});

export default BookingDetailScreen;