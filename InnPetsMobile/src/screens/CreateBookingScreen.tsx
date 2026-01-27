import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateBookingScreen = ({ navigation, route }: any) => {
  // 👇 1. AHORA RECIBIMOS TAMBIÉN EL 'petId'
  const { service, petId } = route.params; 
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  // 📅 LOGICA DE FECHAS
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Detectamos si es un servicio por "Noche" (Alojamiento/Guardería)
  const isNightlyService = service.service_type === 'BOARDING' || service.service_type === 'DAYCARE';

  // 💰 CALCULAR TOTAL
  const calculateTotal = () => {
    if (!isNightlyService) return service.price;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 0) diffDays = 1; 

    return service.price * diffDays;
  };

  const total = calculateTotal();

  // 🚀 ENVIAR RESERVA
  const handleBooking = async () => {
    // Validación lógica de fechas
    if (isNightlyService && endDate <= startDate) {
        Alert.alert("Fecha incorrecta", "La fecha de salida debe ser posterior a la de entrada.");
        return;
    }

    setLoading(true);
    try {
        await api.post('/bookings/', {
            service: service.id,
            // 👇 2. ¡AQUÍ ESTÁ LA MAGIA! ENVIAMOS LA MASCOTA
            pets: [petId], 
            start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
            end_date: isNightlyService ? endDate.toISOString().split('T')[0] : startDate.toISOString().split('T')[0],
            total_price: total,
            notes: note
        });

        Alert.alert("¡Reserva Solicitada! 🎉", "El cuidador ha sido notificado. Verás el estado en 'Mis Reservas'.", [
            { text: "Ir a Mis Reservas", onPress: () => navigation.navigate('MainDrawer', { screen: 'Reservas' }) }
        ]);

    } catch (error: any) {
        console.error(error);
        const serverMessage = error.response?.data?.error || error.response?.data?.detail;
        
        if (serverMessage) {
             Alert.alert("No se pudo reservar ⚠️", serverMessage);
        } else {
             Alert.alert("Error", "No se pudo procesar la reserva.");
        }
    } finally {
        setLoading(false);
    }
  };

  // Renderizadores de Fecha
  const renderDatePicker = (
    label: string, 
    date: Date, 
    setShow: (v: boolean) => void, 
    minDate: Date
  ) => (
    <View style={{ marginBottom: 15 }}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)}>
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            <Text>📅</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* RESUMEN DEL SERVICIO */}
        <View style={styles.card}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.providerName}>Por: {service.provider_name || "Proveedor"}</Text>
            <Text style={styles.priceTag}>${service.price} / {isNightlyService ? 'noche' : 'evento'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Fechas de la Reserva</Text>

        {/* FECHA INICIO */}
        {renderDatePicker(
            isNightlyService ? "Fecha de Llegada" : "Fecha del Servicio", 
            startDate, 
            setShowStartPicker, 
            new Date() 
        )}

        {/* FECHA FIN (Solo si es Alojamiento) */}
        {isNightlyService && renderDatePicker(
            "Fecha de Salida", 
            endDate, 
            setShowEndPicker, 
            startDate 
        )}

        {/* PICKERS */}
        {showStartPicker && (
            <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                minimumDate={new Date()} 
                onChange={(e, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) {
                        setStartDate(selectedDate);
                        if (isNightlyService && selectedDate > endDate) {
                            setEndDate(selectedDate);
                        }
                    }
                }}
            />
        )}

        {showEndPicker && (
            <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                minimumDate={startDate} 
                onChange={(e, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                }}
            />
        )}

        {/* NOTA OPCIONAL */}
        <Text style={styles.label}>Mensaje al Cuidador (Opcional)</Text>
        <TextInput 
            style={styles.input}
            placeholder="Mi perro es alérgico al pollo, por favor..."
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
        />

        {/* TOTAL Y BOTÓN */}
        <View style={styles.footer}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 15}}>
                <Text style={styles.totalLabel}>Total a Pagar:</Text>
                <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.btnText}>Confirmar Reserva</Text>}
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 20, ...SHADOWS.card },
  serviceTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  providerName: { color: COLORS.textLight, marginBottom: 10 },
  priceTag: { color: COLORS.success, fontFamily: FONTS.bold, fontSize: 18 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 15, color: COLORS.textDark },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 5 },
  dateBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dateText: { fontSize: 16 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', height: 100, textAlignVertical: 'top' },
  footer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  totalLabel: { fontSize: 18, fontFamily: FONTS.bold },
  totalValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 18 },
});

export default CreateBookingScreen;