import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
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
  
  // 🐶 ESTADO PARA MASCOTAS (Array de IDs)
  const [myPets, setMyPets] = useState<any[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);

  // Fechas
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const isNightlyService = service.service_type === 'BOARDING' || service.service_type === 'DAYCARE';

  // 1. CARGAR MASCOTAS AL INICIAR
  useEffect(() => {
      fetchMyPets();
  }, []);

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

  const calculateTotal = () => {
    if (!isNightlyService) return service.price;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 0) diffDays = 1; 
    return service.price * diffDays;
  };

  const total = calculateTotal();

  // 🚀 LÓGICA DE RESERVA CON DEBUGGING
  const handleBooking = async () => {
    if (selectedPets.length === 0) {
        Alert.alert("Falta información", "Selecciona al menos una mascota.");
        return;
    }
    if (isNightlyService && endDate <= startDate) {
        Alert.alert("Fecha incorrecta", "La fecha de salida debe ser posterior a la de entrada.");
        return;
    }

    setLoading(true);
    try {
        // CORRECCIÓN PARA BACKEND: Agregar hora a la fecha (ISO Completo)
        // Esto ayuda a que Django DateTimeField no rechace el formato
        const startISO = startDate.toISOString().split('T')[0] + "T09:00:00"; 
        const endISO = (isNightlyService ? endDate : startDate).toISOString().split('T')[0] + "T18:00:00";

        const payload = {
            service: service.id,
            pets: selectedPets, 
            start_date: startISO,
            end_date: endISO,
            total_price: total,
            notes: note
        };

        console.log("📤 Enviando Reserva:", JSON.stringify(payload, null, 2));

        await api.post('/bookings/', payload);

        Alert.alert("¡Reserva Solicitada! 🎉", "El cuidador ha sido notificado.", [
            { text: "Ver Reservas", onPress: () => navigation.navigate('MainDrawer', { screen: 'Reservas' }) }
        ]);

    } catch (error: any) {
        console.error("❌ Error al reservar:", error);
        
        // --- DEBUGGING MEJORADO ---
        // Intentamos extraer el mensaje exacto del backend para mostrarlo en la Alerta
        let errorMsg = "No se pudo procesar la reserva.";
        
        if (error.response?.data) {
            console.log("Data del error:", error.response.data);
            const data = error.response.data;
            
            // Si el backend devuelve { "detail": "..." }
            if (data.detail) errorMsg = data.detail;
            // Si devuelve { "non_field_errors": ["..."] }
            else if (data.non_field_errors) errorMsg = data.non_field_errors[0];
            // Si devuelve errores por campo { "pets": ["..."] }
            else {
                // Tomamos el primer error que encontremos
                const firstKey = Object.keys(data)[0];
                const firstError = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                errorMsg = `${firstKey}: ${firstError}`;
            }
        }
        
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
      {/* Teclado Offset Ajustado */}
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

        {/* FOOTER */}
        <View style={styles.footer}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 15}}>
                <Text style={styles.totalLabel}>Total a Pagar:</Text>
                <Text style={styles.totalValue}>
                    {Number(total).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={loading}>
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
  
  // Estilos de Mascotas
  petCard: { padding: 10, backgroundColor: 'white', borderRadius: 12, marginRight: 10, alignItems: 'center', width: 85, borderWidth:1, borderColor:'#eee', position:'relative' },
  petCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  petName: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  avatar: { width: 40, height: 40, backgroundColor: '#f0f0f0', borderRadius: 20, justifyContent:'center', alignItems:'center' },
  checkBadge: { position:'absolute', top:-5, right:-5, backgroundColor:'green', width:18, height:18, borderRadius:9, justifyContent:'center', alignItems:'center' },

  dateBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dateText: { fontSize: 16 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', height: 80, textAlignVertical: 'top' },
  footer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  totalLabel: { fontSize: 18, fontFamily: FONTS.bold },
  totalValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 18 },
});

export default CreateBookingScreen;