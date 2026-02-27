import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { authService } from '../services/api';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleChange = (field: string, value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (errors[field]) setErrors({ ...errors, [field]: null });
    if (errors.detail) setErrors({ ...errors, detail: null });
  };

  const validate = () => {
    let valid = true;
    let tempErrors: any = {};
    if (!email) { tempErrors.email = 'Ingresa tu correo'; valid = false; }
    if (!password) { tempErrors.password = 'Ingresa tu contraseña'; valid = false; }
    setErrors(tempErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const data = await authService.login(cleanEmail, password);
      const { access, refresh, user } = data;
      const tokenRecibido = access;

      if (tokenRecibido) {
          await AsyncStorage.setItem('access_token', tokenRecibido);
          if (refresh) await AsyncStorage.setItem('refresh_token', refresh);
          if (user) {
              await AsyncStorage.setItem('user_data', JSON.stringify(user));
          }
          await login(tokenRecibido);
          navigation.reset({ index: 0, routes: [{ name: 'MainDrawer' }] });
      } else {
          setErrors({ detail: "Error de servidor: No se recibió token." });
      }
    } catch (error: any) {
      
      const errorData = error.response?.data;
      const errorStatus = error.response?.status;

      // Detectamos los 3 tipos de errores especiales
      const isUnverified = 
        errorData?.error === 'unverified' || 
        (Array.isArray(errorData?.error) && errorData.error.includes('unverified')) ||
        (Array.isArray(errorData?.non_field_errors) && errorData.non_field_errors[0]?.includes('verificar'));

      const isIdRejected = 
        errorData?.error === 'id_rejected' || 
        (Array.isArray(errorData?.error) && errorData.error.includes('id_rejected'));

      const isSuspended = 
        errorData?.error === 'suspended' || 
        (Array.isArray(errorData?.error) && errorData.error.includes('suspended'));

      // ----------------------------------------------------
      // LÓGICA DE REDIRECCIÓN SEGÚN ERROR
      // ----------------------------------------------------
      if (isUnverified) {
        let unverifiedEmail = cleanEmail;
        if (errorData?.email) {
            unverifiedEmail = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        }
        Alert.alert(
          'Cuenta pendiente ⚠️', 
          'Tu cuenta no ha sido activada. Ingresa el código de 6 dígitos para continuar.',
          [{ text: 'Verificar ahora', onPress: () => navigation.navigate('VerifyOTP', { email: unverifiedEmail }) }]
        );
      } 
      
      // 🔥 AQUÍ ESTÁ EL ARREGLO PARA EL RECHAZO DE CARNET
      else if (isIdRejected) {
        let rejectedEmail = cleanEmail;
        if (errorData?.email) {
            rejectedEmail = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        }
        
        let motivo = errorData?.detail || "Tu documento fue rechazado. Intenta nuevamente.";
        if (Array.isArray(motivo)) motivo = motivo[0];

        // Usamos setTimeOut para evitar conflictos si la pantalla anterior no ha terminado de cerrar
        setTimeout(() => {
             navigation.navigate('ResubmitID', { email: rejectedEmail, motivo: motivo });
        }, 100);
      }
      
      // 🚨 BANEO GENERAL
      else if (isSuspended) {
        let motivo = errorData?.detail || "Tu cuenta ha sido suspendida por un administrador.";
        if (Array.isArray(motivo)) motivo = motivo[0];

        Alert.alert('Cuenta Suspendida 🚫', motivo);
      }
      
      // ERROR CLÁSICO (Clave mal)
      else if (errorStatus === 401 || errorData?.detail) {
        setErrors({ detail: 'Correo o contraseña incorrectos.' });
      } 
      else {
        Alert.alert('Error', 'Verifica tu conexión e inténtalo de nuevo.');
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.content}>
            <View style={styles.header}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 }} 
              />
              <Text style={styles.subtitle}>Tu compañero de confianza</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput 
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="tu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(t) => handleChange('email', t)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput 
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(t) => handleChange('password', t)}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {errors.detail && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>⚠️ {errors.detail}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar Sesión</Text>}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.link}>Regístrate</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontFamily: FONTS.bold, fontSize: 40, color: COLORS.primary },
  subtitle: { fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 8 },
  card: { backgroundColor: COLORS.white, padding: 24, borderRadius: 24, ...SHADOWS.card },
  inputGroup: { marginBottom: 15 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: FONTS.regular, color: '#000000', backgroundColor: '#ffffff' },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 5, fontFamily: FONTS.regular },
  errorBox: { backgroundColor: '#ffebee', padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  errorBoxText: { color: COLORS.danger, fontFamily: FONTS.bold, fontSize: 14 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  buttonText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: FONTS.regular, color: COLORS.textLight },
  link: { color: COLORS.primary, fontFamily: FONTS.bold }
});

export default LoginScreen;