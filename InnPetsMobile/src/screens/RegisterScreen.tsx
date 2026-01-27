import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  FlatList,
  KeyboardAvoidingView, // 👈 1. Importado
  Platform             // 👈 2. Importado
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { authService } from '../services/api'; 
import { RootStackParamList } from '../types';
import { REGIONES_CHILE } from '../constants/chile_data'; 

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const [role, setRole] = useState<'PP' | 'IP'>('PP');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirmPassword: '', address: ''
  });
  
  // --- ESTADOS DE UBICACIÓN ---
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');
  
  // --- MODALES ---
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  const [loading, setLoading] = useState(false);

  // Lógica: Al cambiar región, reseteamos la comuna
  const handleSelectRegion = (regionObj: any) => {
    setSelectedRegion(regionObj);
    setSelectedComuna(''); 
    setShowRegionModal(false);
  };

  const handleRegister = async () => {
    // 1. Validaciones básicas + Ubicación
    if (!form.first_name || !form.last_name || !form.email || !form.password || !selectedRegion || !selectedComuna) {
      Alert.alert('Faltan datos', 'Por favor completa todos los campos, incluyendo tu ubicación.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // 2. Enviamos los datos completitos
      await authService.register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        user_type: role,
        // 👇 Datos de ubicación para el Backend
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: form.address 
      });
      
      Alert.alert(
        '¡Bienvenido! 🎉', 
        role === 'IP' 
          ? 'Cuenta de Proveedor creada. Inicia sesión para completar tu perfil profesional.' 
          : 'Cuenta creada correctamente. Por favor inicia sesión.', 
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.email ? 'El correo ya está registrado.' : 'Hubo un error al registrarse.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Renderizadores de items para los Modales
  const renderRegionItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectRegion(item)}>
      <Text style={styles.modalItemText}>{item.region}</Text>
    </TouchableOpacity>
  );

  const renderComunaItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedComuna(item); setShowComunaModal(false); }}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 3. KEYBOARD AVOIDING VIEW: Lo más importante para el formulario largo */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" // Permite tocar el botón de registrar aunque el teclado esté abierto
        >
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Elige cómo quieres usar InnPets</Text>

          {/* SELECTOR DE ROL */}
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'PP' && { borderColor: COLORS.primary, borderWidth: 2 }]} 
              onPress={() => setRole('PP')}
            >
              <Text style={{fontSize: 24}}>🐶</Text>
              <Text style={[styles.roleText, role === 'PP' && { color: COLORS.textDark }]}>Soy Dueño</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleBtn, role === 'IP' && { borderColor: COLORS.secondary, borderWidth: 2 }]} 
              onPress={() => setRole('IP')}
            >
               <Text style={{fontSize: 24}}>🛠️</Text>
              <Text style={[styles.roleText, role === 'IP' && { color: COLORS.textDark }]}>Soy Proveedor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {role === 'PP' 
                ? "Busca servicios, agenda paseos y cuida a tu mascota." 
                : "Ofrece tus servicios, gestiona reservas y gana dinero."}
            </Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.form}>
            
            <TextInput placeholder="Nombre" placeholderTextColor="#999" style={styles.input} autoCapitalize="words"
              onChangeText={(t) => setForm({...form, first_name: t})}
            />
            <TextInput placeholder="Apellido" placeholderTextColor="#999" style={styles.input} autoCapitalize="words"
              onChangeText={(t) => setForm({...form, last_name: t})}
            />

            {/* --- SECCIÓN UBICACIÓN 📍 --- */}
            <Text style={styles.sectionLabel}>Ubicación</Text>

            {/* Selector Región */}
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRegionModal(true)}>
               <Text style={{color: selectedRegion ? '#000' : '#999'}}>
                  {selectedRegion ? selectedRegion.region : "Selecciona tu Región"}
               </Text>
               <Text style={{ color: '#000' }}>▼</Text>
            </TouchableOpacity>

            {/* Selector Comuna */}
            <TouchableOpacity 
               style={[styles.selectBtn, !selectedRegion && {backgroundColor: '#f5f5f5'}]} 
               onPress={() => selectedRegion && setShowComunaModal(true)}
               disabled={!selectedRegion}
            >
               <Text style={{color: selectedComuna ? '#000' : '#999'}}>
                  {selectedComuna || (selectedRegion ? "Selecciona tu Comuna" : "Primero elige Región")}
               </Text>
               <Text style={{ color: '#000' }}>▼</Text>
            </TouchableOpacity>

            <TextInput 
               placeholder="Dirección (Calle y Número)" 
               placeholderTextColor="#999" style={styles.input} autoCapitalize="words"
               onChangeText={(t) => setForm({...form, address: t})}
            />
            {/* --------------------------- */}
            
            <TextInput 
              placeholder="Correo electrónico" placeholderTextColor="#999" style={styles.input} 
              keyboardType="email-address" autoCapitalize="none"
              onChangeText={(t) => setForm({...form, email: t})}
            />
            <TextInput 
              placeholder="Contraseña" placeholderTextColor="#999" secureTextEntry style={styles.input}
              onChangeText={(t) => setForm({...form, password: t})}
            />
            <TextInput 
              placeholder="Confirmar Contraseña" placeholderTextColor="#999" secureTextEntry style={styles.input}
              onChangeText={(t) => setForm({...form, confirmPassword: t})}
            />

            <TouchableOpacity 
              style={[styles.btnPrimary, { backgroundColor: role === 'IP' ? COLORS.secondary : COLORS.primary }]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                  <Text style={styles.btnText}>
                  {role === 'IP' ? 'Registrar como Proveedor' : 'Registrar como Dueño'}
                  </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, marginBottom: 40 }}>
              <Text style={{ textAlign: 'center', color: COLORS.textLight }}>
                ¿Ya tienes cuenta? <Text style={{ color: role === 'IP' ? COLORS.secondary : COLORS.primary, fontFamily: FONTS.bold }}>Inicia Sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODALES DE SELECCIÓN --- */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Regiones de Chile 🇨🇱</Text>
                <FlatList data={REGIONES_CHILE} keyExtractor={(item) => item.region} renderItem={renderRegionItem} />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowRegionModal(false)}>
                    <Text style={styles.closeText}>Cerrar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={showComunaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Comunas de {selectedRegion?.region}</Text>
                <FlatList data={selectedRegion?.comunas || []} keyExtractor={(item) => item} renderItem={renderComunaItem} />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowComunaModal(false)}>
                    <Text style={styles.closeText}>Cerrar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.textDark, textAlign: 'center', marginTop: 10 },
  subtitle: { textAlign: 'center', color: COLORS.textLight, marginBottom: 20 },
  roleContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  roleBtn: { 
    flex: 1, backgroundColor: COLORS.white, padding: 15, borderRadius: 12, 
    alignItems: 'center', borderWidth: 1, borderColor: 'transparent', ...SHADOWS.card 
  },
  roleText: { marginTop: 5, fontFamily: FONTS.bold, color: COLORS.textLight },
  infoBox: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 8, marginBottom: 20 },
  infoText: { textAlign: 'center', color: COLORS.textDark, fontSize: 12 },
  
  form: { gap: 15 },

  // 4. CORRECCIÓN ESTILOS INPUTS (Texto negro para modo oscuro)
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    ...SHADOWS.card,
    color: '#000000' // IMPORTANTE: Texto negro
  },
  
  // Estilos nuevos para Selectores
  sectionLabel: { fontFamily: FONTS.bold, color: COLORS.textDark, marginLeft: 5 },
  selectBtn: { 
    backgroundColor: COLORS.white, padding: 15, borderRadius: 12, ...SHADOWS.card,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },

  btnPrimary: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  // Estilos Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:15, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' }, // También agregué color negro aquí
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default RegisterScreen;