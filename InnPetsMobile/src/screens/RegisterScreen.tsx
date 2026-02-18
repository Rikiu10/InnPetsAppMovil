import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  FlatList,
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { authService } from '../services/api'; 
import { RootStackParamList } from '../types';
import { REGIONES_CHILE } from '../constants/chile_data'; 

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

// 👇 FUNCIÓN AUXILIAR PARA FORMATEAR RUT (12.345.678-9)
const formatRut = (rut: string) => {
  // 1. Dejar solo números y K
  let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  // 2. Si es muy corto, devolver tal cual
  if (value.length <= 1) return value;
  
  // 3. Separar DV
  const dv = value.slice(-1);
  const cuerpo = value.slice(0, -1);
  
  // 4. Formatear cuerpo con puntos
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${cuerpoFormateado}-${dv}`;
};

const RegisterScreen = ({ navigation }: Props) => {
  const [role, setRole] = useState<'PP' | 'IP'>('PP');
  const [loading, setLoading] = useState(false);

  // 1. ESTADO DEL FORMULARIO
  const [form, setForm] = useState({
    first_name: '', 
    last_name: '', 
    rut: '', // 👈 NUEVO CAMPO
    email: '', 
    password: '', 
    confirmPassword: '', 
    address: ''
  });

  // 2. ESTADO DE ERRORES
  const [errors, setErrors] = useState<any>({});
  
  // --- ESTADOS DE UBICACIÓN ---
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');
  
  // --- MODALES ---
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // 👇 HANDLER ESPECIAL PARA RUT
  const handleRutChange = (text: string) => {
      const formatted = formatRut(text);
      if (formatted.length <= 12) { // Limitar largo máximo
          setForm({ ...form, rut: formatted });
          if (errors.rut) setErrors({ ...errors, rut: null });
      }
  };

  const handleSelectRegion = (regionObj: any) => {
    setSelectedRegion(regionObj);
    setSelectedComuna(''); 
    setShowRegionModal(false);
    if (errors.region) setErrors({ ...errors, region: null });
  };

  const handleSelectComuna = (comuna: string) => {
    setSelectedComuna(comuna);
    setShowComunaModal(false);
    if (errors.comuna) setErrors({ ...errors, comuna: null });
  };

  // 3. FUNCIÓN DE VALIDACIÓN LOCAL
  const validate = () => {
    let valid = true;
    let tempErrors: any = {};

    if (!form.first_name) { tempErrors.first_name = 'El nombre es obligatorio'; valid = false; }
    if (!form.last_name) { tempErrors.last_name = 'El apellido es obligatorio'; valid = false; }
    
    // 👇 VALIDACIÓN RUT
    if (!form.rut) { tempErrors.rut = 'El RUT es obligatorio'; valid = false; }
    else if (form.rut.length < 8) { tempErrors.rut = 'RUT incompleto'; valid = false; }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!form.email) { tempErrors.email = 'El correo es obligatorio'; valid = false; }
    else if (!emailRegex.test(form.email)) { tempErrors.email = 'Ingresa un correo válido'; valid = false; }

    if (!form.password) { tempErrors.password = 'La contraseña es obligatoria'; valid = false; }
    else if (form.password.length < 6) { tempErrors.password = 'Mínimo 6 caracteres'; valid = false; }

    if (form.password !== form.confirmPassword) { 
        tempErrors.confirmPassword = 'Las contraseñas no coinciden'; 
        valid = false; 
    }

    if (!selectedRegion) { tempErrors.region = 'Selecciona una región'; valid = false; }
    if (!selectedComuna) { tempErrors.comuna = 'Selecciona una comuna'; valid = false; }

    setErrors(tempErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        identification_number: form.rut, // 👈 ENVIAMOS EL RUT AL BACKEND
        user_type: role,
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: form.address 
      });
      
      Alert.alert(
        '¡Bienvenido! 🎉', 
        role === 'IP' 
          ? 'Cuenta de Proveedor creada. Inicia sesión para completar tu perfil.' 
          : 'Cuenta creada correctamente.', 
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error: any) {
      console.error(error);
      
      if (error.response?.data) {
        const serverErrors = error.response.data;
        let mappedErrors: any = {};

        if (serverErrors.email) mappedErrors.email = serverErrors.email[0];
        if (serverErrors.password) mappedErrors.password = serverErrors.password[0];
        if (serverErrors.first_name) mappedErrors.first_name = serverErrors.first_name[0];
        
        // 👇 MAPEO ERROR DE RUT DESDE BACKEND
        if (serverErrors.identification_number) mappedErrors.rut = serverErrors.identification_number[0];

        if (serverErrors.detail) {
             Alert.alert("Error", serverErrors.detail);
        }

        setErrors(mappedErrors);
      } else {
        Alert.alert('Error', 'Hubo un problema de conexión. Inténtalo de nuevo.');
      }

    } finally {
      setLoading(false);
    }
  };

  const renderRegionItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectRegion(item)}>
      <Text style={styles.modalItemText}>{item.region}</Text>
    </TouchableOpacity>
  );

  const renderComunaItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectComuna(item)}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          {/* FORMULARIO */}
          <View style={styles.form}>
            
            {/* Nombre */}
            <View>
                <TextInput 
                    placeholder="Nombre" placeholderTextColor="#999" 
                    style={[styles.input, errors.first_name && styles.inputError]} 
                    autoCapitalize="words"
                    onChangeText={(t) => handleChange('first_name', t)}
                />
                {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
            </View>

            {/* Apellido */}
            <View>
                <TextInput 
                    placeholder="Apellido" placeholderTextColor="#999" 
                    style={[styles.input, errors.last_name && styles.inputError]} 
                    autoCapitalize="words"
                    onChangeText={(t) => handleChange('last_name', t)}
                />
                {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
            </View>

            {/* 👇 INPUT DE RUT CORREGIDO */}
            <View>
                <Text style={styles.sectionLabel}>RUT</Text>
                <TextInput 
                    placeholder="Ej: 12.345.678-9" 
                    placeholderTextColor="#999" 
                    style={[styles.input, errors.rut && styles.inputError]} 
                    value={form.rut}
                    onChangeText={handleRutChange}
                    
                    // 🛑 PROPIEDADES ANTI-AUTOCOMPLETADO (Evitan el 204204)
                    autoCorrect={false}             // Sin corrección ortográfica
                    autoComplete="off"              // Sin sugerencias de Android
                    spellCheck={false}              // Sin chequeo de ortografía
                    textContentType="none"          // Sin tipo de contenido específico
                    keyboardType="visible-password" // ⚠️ TRUCO ANDROID: Esto evita predicciones agresivas
                    
                    // Nota: 'visible-password' funciona perfecto en Android para esto, 
                    // pero a veces oculta la 'K' en algunos teclados viejos. 
                    // Si te pasa eso, cámbialo a "default" y mantén las otras props.
                    
                    autoCapitalize="characters"     // Para que la K sea mayúscula
                />
                {errors.rut && <Text style={styles.errorText}>{errors.rut}</Text>}
            </View>

            {/* --- SECCIÓN UBICACIÓN --- */}
            <Text style={styles.sectionLabel}>Ubicación</Text>

            <View>
                <TouchableOpacity 
                    style={[styles.selectBtn, errors.region && styles.inputError]} 
                    onPress={() => setShowRegionModal(true)}
                >
                    <Text style={{color: selectedRegion ? '#000' : '#999'}}>
                        {selectedRegion ? selectedRegion.region : "Selecciona tu Región"}
                    </Text>
                    <Text style={{ color: '#000' }}>▼</Text>
                </TouchableOpacity>
                {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
            </View>

            <View>
                <TouchableOpacity 
                    style={[
                        styles.selectBtn, 
                        !selectedRegion && {backgroundColor: '#f5f5f5'},
                        errors.comuna && styles.inputError
                    ]} 
                    onPress={() => selectedRegion && setShowComunaModal(true)}
                    disabled={!selectedRegion}
                >
                    <Text style={{color: selectedComuna ? '#000' : '#999'}}>
                        {selectedComuna || (selectedRegion ? "Selecciona tu Comuna" : "Primero elige Región")}
                    </Text>
                    <Text style={{ color: '#000' }}>▼</Text>
                </TouchableOpacity>
                {errors.comuna && <Text style={styles.errorText}>{errors.comuna}</Text>}
            </View>

            <TextInput 
               placeholder="Dirección (Calle y Número)" 
               placeholderTextColor="#999" style={styles.input} autoCapitalize="words"
               onChangeText={(t) => handleChange('address', t)}
            />

            {/* Email */}
            <View>
                <TextInput 
                    placeholder="Correo electrónico" placeholderTextColor="#999" 
                    style={[styles.input, errors.email && styles.inputError]} 
                    keyboardType="email-address" autoCapitalize="none"
                    onChangeText={(t) => handleChange('email', t)}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View>
                <TextInput 
                    placeholder="Contraseña" placeholderTextColor="#999" secureTextEntry 
                    style={[styles.input, errors.password && styles.inputError]}
                    onChangeText={(t) => handleChange('password', t)}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View>
                <TextInput 
                    placeholder="Confirmar Contraseña" placeholderTextColor="#999" secureTextEntry 
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    onChangeText={(t) => handleChange('confirmPassword', t)}
                />
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

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

      {/* --- MODALES --- */}
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
  
  form: { gap: 15 },

  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    ...SHADOWS.card,
    color: '#000000',
    borderWidth: 1, 
    borderColor: 'transparent' 
  },

  inputError: {
    borderColor: COLORS.danger, 
    borderWidth: 1
  },
  
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
    fontFamily: FONTS.regular
  },
  
  sectionLabel: { fontFamily: FONTS.bold, color: COLORS.textDark, marginLeft: 5 },
  selectBtn: { 
    backgroundColor: COLORS.white, padding: 15, borderRadius: 12, ...SHADOWS.card,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent'
  },

  btnPrimary: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:15, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default RegisterScreen;