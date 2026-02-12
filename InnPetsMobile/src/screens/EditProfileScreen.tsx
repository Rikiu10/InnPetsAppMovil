import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView, 
  Platform,
  Modal,      // 👈 Nuevo
  FlatList    // 👈 Nuevo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { authService } from '../services/api'; 
import { useAuth } from '../context/AuthContext';
import { REGIONES_CHILE } from '../constants/chile_data'; // 👈 Importamos la data

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const { user, setUser } = useAuth();
  
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: '' // 👈 Agregamos dirección
  });

  // --- ESTADOS DE UBICACIÓN ---
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');
  
  // --- MODALES ---
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  // 1. AL CARGAR: Llenamos todo
  useEffect(() => {
    if (user) {
        setForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            address: user.address || ''
        });

        // Lógica para pre-seleccionar la región y comuna guardadas
        if (user.region) {
            const regionObj = REGIONES_CHILE.find(r => r.region === user.region);
            if (regionObj) {
                setSelectedRegion(regionObj);
            }
        }
        
        if (user.comuna) {
            setSelectedComuna(user.comuna);
        }
    }
  }, [user]);

  // Handlers para los selectores
  const handleSelectRegion = (regionObj: any) => {
    setSelectedRegion(regionObj);
    setSelectedComuna(''); // Reseteamos comuna al cambiar región
    setShowRegionModal(false);
  };

  const handleSelectComuna = (comuna: string) => {
    setSelectedComuna(comuna);
    setShowComunaModal(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validación básica de ubicación
    if (!selectedRegion || !selectedComuna) {
        Alert.alert("Faltan datos", "Por favor selecciona tu región y comuna.");
        return;
    }

    setSaving(true);
    try {
        // A. Actualizamos en el Servidor
        const updatedData = await authService.updateProfile(user.id, {
            first_name: form.first_name,
            last_name: form.last_name,
            address: form.address,
            region: selectedRegion.region, // Enviamos string
            comuna: selectedComuna        // Enviamos string
        });

        // B. Actualizamos la App inmediatamente
        const newUserState = { ...user, ...updatedData };
        setUser(newUserState);

        Alert.alert("¡Éxito!", "Tu perfil ha sido actualizado.", [
            { text: "OK", onPress: () => navigation.goBack() }
        ]);

    } catch (error: any) {
        console.error("Error actualizando:", error);
        Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
        setSaving(false);
    }
  };

  // Render items para los modales (Igual que en Register)
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

  if (!user) return <View style={styles.center}><Text>Cargando...</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={{width: 24}} /> 
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.first_name} autoCapitalize="words"
                    onChangeText={(t) => setForm({...form, first_name: t})}
                    placeholder="Tu nombre" placeholderTextColor="#999"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.last_name} autoCapitalize="words"
                    onChangeText={(t) => setForm({...form, last_name: t})}
                    placeholder="Tu apellido" placeholderTextColor="#999"
                />
            </View>

            {/* --- SECCIÓN UBICACIÓN --- */}
            <Text style={[styles.label, {marginTop: 10, fontSize: 18, color: COLORS.primary}]}>Ubicación 📍</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Región</Text>
                <TouchableOpacity 
                    style={styles.selectBtn} 
                    onPress={() => setShowRegionModal(true)}
                >
                    <Text style={{color: selectedRegion ? '#000' : '#999'}}>
                        {selectedRegion ? selectedRegion.region : "Selecciona tu Región"}
                    </Text>
                    <Text style={{ color: '#000' }}>▼</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Comuna</Text>
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
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección (Calle y Número)</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.address} 
                    onChangeText={(t) => setForm({...form, address: t})}
                    placeholder="Ej: Av. Siempre Viva 123" placeholderTextColor="#999"
                />
            </View>

            {/* --- FIN SECCIÓN UBICACIÓN --- */}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo (No editable)</Text>
                <TextInput 
                    style={[styles.input, { backgroundColor: '#f0f0f0', color: '#666' }]} 
                    value={form.email}
                    editable={false} 
                />
                <Text style={{fontSize: 10, color: '#999', marginTop: 5}}>
                    El correo no se puede cambiar por seguridad.
                </Text>
            </View>

            <TouchableOpacity 
                style={styles.btnPrimary} 
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.btnText}>Guardar Cambios</Text>
                )}
            </TouchableOpacity>

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  inputGroup: { marginBottom: 15 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    fontSize: 16, color: '#000000' 
  },
  btnPrimary: { 
    backgroundColor: COLORS.primary, 
    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  // Estilos de Selector (Iguales a Register)
  selectBtn: { 
    backgroundColor: COLORS.white, padding: 15, borderRadius: 12, ...SHADOWS.card,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  
  // Estilos Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:15, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default EditProfileScreen;