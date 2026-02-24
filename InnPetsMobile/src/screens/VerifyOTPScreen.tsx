import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { authService } from '../services/api'; 
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

const VerifyOTPScreen = ({ navigation, route }: Props) => {
  const { email } = route.params; 
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Temporizador para el botón de reenviar (60 segundos)
  const [timeLeft, setTimeLeft] = useState(60);

  // 🔥 1. AUTO-ENVIAR EL CÓDIGO AL ENTRAR A LA PANTALLA 🔥
  useEffect(() => {
    const autoSendOTP = async () => {
      try {
        console.log("Enviando código automáticamente a:", email);
        await authService.resendOTP(email);
      } catch (error: any) {
        console.log("Error en el auto-envío:", error.response?.data || error.message);
      }
    };
    
    autoSendOTP();
  }, []); // El array vacío asegura que solo se ejecute UNA vez al abrir la pantalla

  // Manejo del temporizador
  useEffect(() => {
    if (timeLeft === 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const handleVerify = async () => {
    if (otp.length !== 6) return Alert.alert("Código inválido", "El código debe tener 6 números.");
    setLoading(true);
    try {
      await authService.verifyOTP(email, otp);
      Alert.alert("¡Verificado! 🎉", "Tu cuenta ha sido activada con éxito. Ya puedes iniciar sesión.",
        [{ text: "Ir al Login", onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Código incorrecto o expirado.";
      Alert.alert("Error de Verificación", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await authService.resendOTP(email);
      Alert.alert("Correo Enviado ✉️", "Revisa tu bandeja de entrada o tu carpeta de Spam.");
      setTimeLeft(60); // Reiniciamos el contador
    } catch (error: any) {
      console.log("Error al reenviar:", error.response?.data || error);
      // 🔥 Ahora el error nos dirá exactamente qué pasó en el backend
      const errorDelServidor = error.response?.data?.error || error.response?.data?.message || "No pudimos conectar con el servidor.";
      Alert.alert("Error del Servidor", errorDelServidor);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.content}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>✉️</Text>
          <Text style={styles.title}>Revisa tu Correo</Text>
          <Text style={styles.subtitle}>
            Hemos enviado un código de 6 dígitos a:
            {"\n"}<Text style={{ fontFamily: FONTS.bold, color: COLORS.primary }}>{email}</Text>
          </Text>

          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />

          <TouchableOpacity style={[styles.btnPrimary, otp.length !== 6 && { opacity: 0.5 }]} onPress={handleVerify} disabled={loading || otp.length !== 6}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Verificar Cuenta</Text>}
          </TouchableOpacity>

          {/* SECCIÓN DE REENVIAR CÓDIGO */}
          <View style={styles.resendContainer}>
            <Text style={{ color: COLORS.textLight, fontFamily: FONTS.regular }}>¿No recibiste el código? </Text>
            {timeLeft > 0 ? (
                <Text style={{ color: '#999', fontFamily: FONTS.bold }}>Reenviar en {timeLeft}s</Text>
            ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={resending}>
                  {resending ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.resendText}>Reenviar Código</Text>}
                </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={{ marginTop: 30 }} onPress={() => navigation.navigate('Login')}>
            <Text style={{ textAlign: 'center', color: COLORS.textLight }}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: FONTS.bold, color: COLORS.textDark, textAlign: 'center', marginBottom: 10 },
  subtitle: { textAlign: 'center', color: COLORS.textLight, fontSize: 16, marginBottom: 30, lineHeight: 22 },
  otpInput: { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, fontSize: 32, letterSpacing: 15, textAlign: 'center', fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 30, ...SHADOWS.card },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  resendText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 15 }
});

export default VerifyOTPScreen;