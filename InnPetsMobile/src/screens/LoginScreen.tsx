import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform 
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
  
  // 1. NUEVO: Estado para errores visuales
  const [errors, setErrors] = useState<any>({});

  // 2. NUEVO: Función para limpiar errores al escribir
  const handleChange = (field: string, value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);

    // Si había un error en este campo, lo borramos visualmente
    if (errors[field]) setErrors({ ...errors, [field]: null });
    // Si había un error general (login fallido), lo borramos al intentar corregir
    if (errors.detail) setErrors({ ...errors, detail: null });
  };

  // 3. NUEVO: Función de validación local
  const validate = () => {
    let valid = true;
    let tempErrors: any = {};

    if (!email) { tempErrors.email = 'Ingresa tu correo'; valid = false; }
    if (!password) { tempErrors.password = 'Ingresa tu contraseña'; valid = false; }

    setErrors(tempErrors);
    return valid;
  };

  const handleLogin = async () => {
    // A. Usamos la validación visual antes de llamar a la API
    if (!validate()) return;

    setLoading(true);
    try {
      console.log("Intentando login con:", email);
      const data = await authService.login(email, password);
      console.log("Respuesta API:", data); 

      const { access, refresh, user } = data;
      const tokenRecibido = access;

      if (tokenRecibido) {
          await AsyncStorage.setItem('access_token', tokenRecibido);
          if (refresh) await AsyncStorage.setItem('refresh_token', refresh);

          if (user) {
              console.log("✅ Guardando usuario en el celular:", user);
              await AsyncStorage.setItem('user_data', JSON.stringify(user));
          } else {
              console.log("⚠️ Advertencia: El backend no envió el objeto 'user'");
          }

          await login(tokenRecibido);

          navigation.reset({
            index: 0,
            routes: [{ name: 'MainDrawer' }], 
          });
      } else {
          // Este es un error raro de estructura, mantenemos alerta o error general
          setErrors({ detail: "Error de servidor: No se recibió token." });
      }

    } catch (error: any) {
      console.error(error);
      
      // B. Manejo inteligente de errores del Backend (Django)
      if (error.response?.data?.detail) {
        // Django suele mandar "No active account found..." en 'detail'
        setErrors({ detail: 'Correo o contraseña incorrectos.' });
      } else {
        Alert.alert('Error de Conexión', 'Verifica tu internet e inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.content}>
            {/* Header con Logo */}
            <View style={styles.header}>
              <Text style={{ fontSize: 60, marginBottom: 10 }}>🏠</Text>
              <Text style={styles.logoText}>InnPets</Text>
              <Text style={styles.subtitle}>Tu compañero de confianza</Text>
            </View>

            {/* Formulario Card */}
            <View style={styles.card}>
              
              {/* INPUT EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput 
                  style={[styles.input, errors.email && styles.inputError]} // Borde rojo si hay error
                  placeholder="tu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(t) => handleChange('email', t)} // Usamos handleChange
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {/* Mensaje de error debajo del input */}
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* INPUT PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput 
                  style={[styles.input, errors.password && styles.inputError]} // Borde rojo si hay error
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(t) => handleChange('password', t)} // Usamos handleChange
                  secureTextEntry
                />
                {/* Mensaje de error debajo del input */}
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* MENSAJE DE ERROR GLOBAL (Credenciales incorrectas) */}
              {errors.detail && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>⚠️ {errors.detail}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Iniciar Sesión</Text>
                )}
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
  
  inputGroup: { marginBottom: 15 }, // Reduje un poco para dar espacio a los mensajes de error
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  
  input: { 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    fontFamily: FONTS.regular,
    color: '#000000',
    backgroundColor: '#ffffff'
  },

  // ESTILOS NUEVOS DE ERROR
  inputError: {
    borderColor: COLORS.danger, // Rojo
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 5,
    fontFamily: FONTS.regular
  },
  errorBox: {
    backgroundColor: '#ffebee', // Rojo muy suave de fondo
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center'
  },
  errorBoxText: {
    color: COLORS.danger,
    fontFamily: FONTS.bold,
    fontSize: 14
  },

  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  buttonText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: FONTS.regular, color: COLORS.textLight },
  link: { color: COLORS.primary, fontFamily: FONTS.bold }
});

export default LoginScreen;