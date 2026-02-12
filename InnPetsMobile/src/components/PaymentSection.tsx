import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { paymentService } from '../services/api'; // Asegúrate de tener este servicio creado

const PaymentSection = ({ booking }: { booking: any }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // 1. Pedir link al backend
      const data = await paymentService.createPreference(booking.id);
      
      // 2. Abrir Mercado Pago (Sandbox para pruebas)
      if (data.sandbox_init_point) {
          // Abrir navegador externo
          const supported = await Linking.canOpenURL(data.sandbox_init_point);
          if (supported) {
            await Linking.openURL(data.sandbox_init_point);
          } else {
            Alert.alert("Error", "No se puede abrir el navegador.");
          }
      } else {
          Alert.alert("Error", "No se recibió el link de pago.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo iniciar el pago. Revisa que la reserva esté Aprobada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Detalle del Pago
      </Text>
      
      <Text style={styles.disclaimer}>
        * El total incluye una tarifa de servicio del 10% para cubrir costos de operación y seguridad.
      </Text>

      <TouchableOpacity 
        style={styles.payButton}
        onPress={handlePay}
        disabled={loading}
      >
        {loading ? (
            <ActivityIndicator color="white" />
        ) : (
            <Text style={styles.payText}>
                Pagar con Mercado Pago 💳
            </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#E3F2FD', // Azulito claro
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        ...SHADOWS.card
    },
    title: {
        fontWeight: 'bold',
        color: '#0277BD',
        marginBottom: 5,
        fontSize: 16
    },
    disclaimer: {
        fontSize: 12,
        color: '#666',
        marginBottom: 15,
        fontStyle: 'italic'
    },
    payButton: {
        backgroundColor: '#009EE3', // Azul Mercado Pago
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2
    },
    payText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default PaymentSection;