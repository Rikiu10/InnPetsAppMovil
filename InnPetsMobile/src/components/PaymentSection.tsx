import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SHADOWS } from '../constants/theme';

// Definimos qué datos espera recibir este componente
interface Props {
  booking: any;
  onPayPress: () => void; // Función que viene del padre (BookingDetailScreen)
  loading: boolean;       // Estado de carga que viene del padre
}

const PaymentSection = ({ booking, onPayPress, loading }: Props) => {
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Detalle del Pago
      </Text>
      
      {/* ⚠️ AJUSTE IMPORTANTE: 
          Quitamos el "10%" fijo porque ahora tus tasas son dinámicas 
          (pueden ser 15%, 20%, etc). Es mejor ser genérico.
      */}
      <Text style={styles.disclaimer}>
        * El total incluye la tarifa de servicio y seguridad de InnPets para proteger tu reserva.
      </Text>

      <View style={styles.priceRow}>
         <Text style={styles.label}>Total a Pagar:</Text>
         <Text style={styles.price}>${booking.price_total || booking.total_price}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.payButton, loading && styles.disabledBtn]}
        onPress={onPayPress}
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
        marginBottom: 20, // Un poco de aire abajo
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
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        alignItems: 'center'
    },
    label: {
        fontSize: 16,
        color: '#333'
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0277BD'
    },
    payButton: {
        backgroundColor: '#009EE3', // Azul Mercado Pago
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2
    },
    disabledBtn: {
        opacity: 0.7
    },
    payText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default PaymentSection;