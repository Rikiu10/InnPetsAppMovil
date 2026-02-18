import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateBookingScreen = ({ navigation, route }: any) => {
  const { service } = route.params; 
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  
  // Mascotas
  const [myPets, setMyPets] = useState<any[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);

  // Fechas
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Estados para Desglose de Precio (Backend)
  const [pricingDetails, setPricingDetails] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  const isNightlyService = service.service_type === 'BOARDING' || service.service_type === 'DAYCARE';

  // 1. CARGAR MASCOTAS AL INICIAR
  useEffect(() => {
      fetchMyPets();
  }, []);

  // 2. CALCULAR PRECIO CUANDO CAMBIAN FECHAS O MASCOTAS
  useEffect(() => {
      calculateBackendPrice();
  }, [selectedPets.length, startDate, endDate]);

  const fetchMyPets = async () => {
      try {
          const res = await api.get('/pets/');
          setMyPets(res.data);
      } catch (error) {
          console.log("Error cargando mascotas", error);
      }
  };

  const handleTogglePet = (id: number) => {
      if (selectedPets.includes(id)) {
          setSelectedPets(selectedPets.filter(p => p !== id));
      } else {
          setSelectedPets([...selectedPets, id]);
      }
  };

  // Función que llama a la API de Pagos
  const calculateBackendPrice = async () => {
      // Necesitamos al menos 1 mascota (o unidad) para calcular
      // Si no hay mascotas seleccionadas, asumimos 1 para mostrar el precio base
      const quantity = Math.max(1, selectedPets.length); 
      
      // Calcular días si es servicio por noche
      let duration = 1;
      if (isNightlyService) {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          duration = diffDays === 0 ? 1 : diffDays;
      }
      
      // La "cantidad" total es (Mascotas * Días) o solo Mascotas, depende de tu regla de negocio.
      // Aquí asumiremos que el precio base se multiplica por la cantidad de "unidades de cobro"
      // Si tu backend espera "cantidad de items", enviamos eso.
      
      // NOTA: Tu backend usa "quantity". Ajusta esto según tu lógica de negocio.
      // Si cobras por mascota Y por día: quantity = mascotas * dias
      const totalUnits = quantity * duration;

      setCalculatingPrice(true);
      try {
          const res = await api.post('/payments/calculate/', {
              price: parseFloat(service.price),
              quantity: totalUnits,
              category: service.service_type
          });
          setPricingDetails(res.data);
      } catch (error) {
          console.error("Error calculando precio", error);
      } finally {
          setCalculatingPrice(false);
      }
  };

  const handleBooking = async () => {
    if (selectedPets.length === 0) {
        Alert.alert("Falta información", "Selecciona al menos una mascota.");
        return;
    }
    if (isNightlyService && endDate <= startDate) {
        Alert.alert("Fecha incorrecta", "La fecha de salida debe ser posterior a la de entrada.");
        return;
    }
    if (!pricingDetails) {
        Alert.alert("Error", "No se pudo calcular el precio. Intenta de nuevo.");
        return;
    }

    setLoading(true);
    try {
        const startISO = startDate.toISOString().split('T')[0] + "T09:00:00"; 
        const endISO = (isNightlyService ? endDate : startDate).toISOString().split('T')[0] + "T18:00:00";

        const payload = {
            service: service.id,
            pets: selectedPets, 
            start_date: startISO,
            end_date: endISO,
            total_price: pricingDetails.client_total_payment, // Enviamos el total calculado por backend
            notes: note
        };

        await api.post('/bookings/', payload);

        Alert.alert("¡Reserva Solicitada! 🎉", "El cuidador ha sido notificado. Deberás pagar cuando sea aceptada.", [
            { text: "Ver Reservas", onPress: () => navigation.navigate('MainDrawer', { screen: 'Reservas' }) }
        ]);

    } catch (error: any) {
        console.error("❌ Error al reservar:", error);
        let errorMsg = "No se pudo procesar la reserva.";
        if (error.response?.data?.detail) errorMsg = error.response.data.detail;
        Alert.alert("Error del Servidor", errorMsg);
    } finally {
        setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date, type?: 'start'|'end') => {
      if (type === 'start') setShowStartPicker(false);
      else setShowEndPicker(false);

      if (selectedDate) {
          if (type === 'start') {
              setStartDate(selectedDate);
              if (isNightlyService && selectedDate > endDate) setEndDate(selectedDate);
          } else {
              setEndDate(selectedDate);
          }
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
        style={{ flex: 1 }}
      >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* INFO SERVICIO */}
        <View style={styles.card}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.providerName}>Por: {service.provider_name || "Proveedor"}</Text>
            <Text style={styles.priceTag}>${service.price} / {isNightlyService ? 'noche' : 'evento'}</Text>
        </View>

        {/* SELECCIÓN DE MASCOTAS */}
        <Text style={styles.sectionTitle}>¿Quiénes van? 🐶</Text>
        {myPets.length === 0 ? (
            <Text style={{color:'#888', fontStyle:'italic'}}>No tienes mascotas registradas.</Text>
        ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {myPets.map(pet => {
                    const isSelected = selectedPets.includes(pet.id);
                    const petPhoto = pet.photos_url && pet.photos_url.length > 0 ? pet.photos_url[0] : null;
                    return (
                        <TouchableOpacity 
                            key={pet.id} 
                            style={[styles.petCard, isSelected && styles.petCardSelected]}
                            onPress={() => handleTogglePet(pet.id)}
                        >
                            <View style={styles.avatar}>
                                {petPhoto ? (
                                    <Image source={{ uri: petPhoto }} style={{width:40, height:40, borderRadius:20}} />
                                ) : (
                                    <Text>🐶</Text>
                                )}
                            </View>
                            <Text style={[styles.petName, isSelected && {color:'white'}]}>{pet.name}</Text>
                            {isSelected && <View style={styles.checkBadge}><Text style={{color:'white', fontSize:10}}>✓</Text></View>}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        )}

        {/* FECHAS */}
        <Text style={styles.sectionTitle}>Fechas</Text>
        <View style={{ marginBottom: 15 }}>
            <Text style={styles.label}>{isNightlyService ? "Llegada" : "Día del Servicio"}</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                <Text>📅</Text>
            </TouchableOpacity>
        </View>

        {isNightlyService && (
            <View style={{ marginBottom: 15 }}>
                <Text style={styles.label}>Salida</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                    <Text>📅</Text>
                </TouchableOpacity>
            </View>
        )}

        {showStartPicker && <DateTimePicker value={startDate} mode="date" minimumDate={new Date()} onChange={(e,d)=>onDateChange(e,d,'start')} />}
        {showEndPicker && <DateTimePicker value={endDate} mode="date" minimumDate={startDate} onChange={(e,d)=>onDateChange(e,d,'end')} />}

        <Text style={styles.label}>Notas</Text>
        <TextInput style={styles.input} placeholder="Alergias, cuidados..." multiline numberOfLines={3} value={note} onChangeText={setNote} />

        {/* ✅ TARJETA DE DESGLOSE FINANCIERO */}
        <View style={styles.pricingCard}>
            <Text style={styles.sectionTitle}>Resumen de Pago</Text>
            
            {calculatingPrice ? (
                <ActivityIndicator color={COLORS.primary} />
            ) : pricingDetails ? (
                <>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Precio Neto:</Text>
                        {/* Esto es precio base - comisión prov. No es lo que paga el cliente. */}
                        {/* Mostramos el "Subtotal" mejor */}
                        <Text style={styles.rowValue}>${pricingDetails.base_price}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Comisión y Servicio ({pricingDetails.rate_percentage}%):</Text>
                        {/* app_profit es la ganancia total (prov + user fee). Aquí mostramos el sobrecargo al cliente */}
                        {/* El cliente paga base + (comision user). */}
                        {/* Para simplificar al usuario final: Total - Base */}
                        <Text style={styles.rowValue}>+ ${(pricingDetails.client_total_payment - pricingDetails.base_price).toFixed(0)}</Text>
                    </View>

                    <View style={styles.divider} />
                    
                    <View style={styles.rowTotal}>
                        <Text style={styles.totalLabel}>Total a Pagar:</Text>
                        <Text style={styles.totalValue}>
                            ${pricingDetails.client_total_payment.toLocaleString('es-CL')}
                        </Text>
                    </View>
                    
                    <Text style={styles.disclaimer}>
                        * Incluye tarifa de servicio InnPets.
                    </Text>
                </>
            ) : (
                <Text style={{textAlign:'center', color:'#999'}}>Selecciona mascotas para calcular.</Text>
            )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading || calculatingPrice}>
                {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.btnText}>Confirmar Reserva</Text>}
            </TouchableOpacity>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
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
  
  // Mascotas
  petCard: { padding: 10, backgroundColor: 'white', borderRadius: 12, marginRight: 10, alignItems: 'center', width: 85, borderWidth:1, borderColor:'#eee', position:'relative' },
  petCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  petName: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  avatar: { width: 40, height: 40, backgroundColor: '#f0f0f0', borderRadius: 20, justifyContent:'center', alignItems:'center', overflow: 'hidden' },
  checkBadge: { position:'absolute', top:-5, right:-5, backgroundColor:'green', width:18, height:18, borderRadius:9, justifyContent:'center', alignItems:'center' },

  dateBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dateText: { fontSize: 16 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', height: 80, textAlignVertical: 'top' },
  
  // Estilos Desglose
  pricingCard: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginVertical: 20, borderWidth: 1, borderColor: '#E9ECEF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  rowLabel: { color: '#666' },
  rowValue: { fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#DDD', marginVertical: 10 },
  rowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FONTS.bold, fontSize: 18 },
  totalValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  disclaimer: { fontSize: 10, color: '#999', marginTop: 10, fontStyle: 'italic', textAlign: 'center' },

  footer: { marginTop: 10, paddingBottom: 20 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 18 },
});

export default CreateBookingScreen;