import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

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
          Alert.alert("Error", "La respuesta del servidor no tiene token.");
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Credenciales incorrectas o fallo de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. KEYBOARD AVOIDING VIEW: Evita que el teclado tape todo */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* 2. SCROLLVIEW: Permite bajar si la pantalla es chica */}
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor="#999" // Para que se vea el placeholder
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#999" // Para que se vea el placeholder
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

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
  
  // Nuevo estilo para centrar el ScrollView
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  
  content: { padding: 24 }, // Quitamos flex: 1 de aquí porque ahora lo maneja el ScrollView
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontFamily: FONTS.bold, fontSize: 40, color: COLORS.primary },
  subtitle: { fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 8 },
  card: { backgroundColor: COLORS.white, padding: 24, borderRadius: 24, ...SHADOWS.card },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  
  // 👇 MODIFICADO: Agregamos color explícito negro y fondo blanco
  input: { 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    fontFamily: FONTS.regular,
    color: '#000000',      // IMPORTANTE: Texto negro
    backgroundColor: '#ffffff' // IMPORTANTE: Fondo blanco
  },
  
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: FONTS.regular, color: COLORS.textLight },
  link: { color: COLORS.primary, fontFamily: FONTS.bold }
});

export default LoginScreen;