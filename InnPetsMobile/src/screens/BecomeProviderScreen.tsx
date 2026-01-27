import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native'; 
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { authService } from '../services/api'; 
import { REGIONES_CHILE } from '../constants/chile_data'; 
import { useAuth } from '../context/AuthContext'; // 👈 1. IMPORTAR ESTO

const BecomeProviderScreen = ({ navigation }: any) => {
  const { setUser } = useAuth(); // 👈 2. OBTENER LA FUNCIÓN SETUSER
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Estados del Formulario
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/me/'); // Ahora esto funciona gracias al backend
      const user = response.data;

      if (user.phone_number) setPhone(user.phone_number);
      if (user.address) setAddress(user.address);

      if (user.region) {
        const regionObj = REGIONES_CHILE.find(r => r.region === user.region);
        setSelectedRegion(regionObj || null);
      }
      if (user.comuna) setSelectedComuna(user.comuna);
      
    } catch (error) {
      console.log("Error cargando datos:", error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async () => {
    if (!bio || !phone || !selectedRegion || !selectedComuna) {
      Alert.alert("Faltan datos", "Por favor completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar datos (PATCH)
      await api.patch('/users/me/', {
        phone_number: phone,
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: address,
        provider_profile: { professional_bio: bio }
      });

      // 2. Cambiar rol (POST)
      const res = await authService.switchRole();
      
      // 👇 3. CLAVE: Actualizar el estado global de la App
      // Así la app sabe INMEDIATAMENTE que ya eres proveedor
      if (res.user) {
          await setUser(res.user);
      }

      Alert.alert(
        "¡Felicidades! 🎉", 
        "Tu cuenta de proveedor ha sido activada.", 
        [
          { 
            text: "Ir a mi panel", 
            onPress: () => {
                // 4. Navegación segura
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'DrawerNavigator' }], // Asegúrate que este nombre coincida con tu navegación
                  })
                );
            }
          }
        ]
      );

    } catch (error) {
      console.error("Error activando proveedor:", error);
      Alert.alert("Error", "No pudimos activar tu cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Renderizadores (Igual que antes)
  const renderRegionItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedRegion(item); setSelectedComuna(''); setShowRegionModal(false); }}>
      <Text style={styles.modalItemText}>{item.region}</Text>
    </TouchableOpacity>
  );

  const renderComunaItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedComuna(item); setShowComunaModal(false); }}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  if (fetchingData) {
    return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 10}}>
             <Text style={{fontSize: 24}}>⬅️</Text>
          </TouchableOpacity>

          <Text style={styles.title}>¡Gana dinero cuidando mascotas! 🐾</Text>
          <Text style={styles.subtitle}>Completa tu perfil profesional. Verifica tu zona de trabajo.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Región *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRegionModal(true)}>
                <Text style={{color: selectedRegion ? '#000' : '#999'}}>{selectedRegion ? selectedRegion.region : "Selecciona Región"}</Text>
                <Text>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Comuna *</Text>
            <TouchableOpacity style={[styles.selectBtn, !selectedRegion && {backgroundColor: '#f5f5f5'}]} onPress={() => selectedRegion && setShowComunaModal(true)} disabled={!selectedRegion}>
                <Text style={{color: selectedComuna ? '#000' : '#999'}}>{selectedComuna || "Selecciona Comuna"}</Text>
                <Text>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Dirección Base (Opcional)</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Calle Principal 123" />

            <Text style={styles.label}>Teléfono de Contacto *</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+56 9 1234 5678" />

            <Text style={styles.label}>Tu Presentación (Bio) *</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={bio} onChangeText={setBio} placeholder="Hola, tengo experiencia..." />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Activar cuenta de Proveedor</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <FlatList data={REGIONES_CHILE} keyExtractor={i=>i.region} renderItem={renderRegionItem}/>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowRegionModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={showComunaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <FlatList data={selectedRegion?.comunas || []} keyExtractor={i=>i} renderItem={renderComunaItem}/>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowComunaModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 10 },
  subtitle: { color: COLORS.textLight, marginBottom: 20, fontSize: 14 },
  form: { gap: 15 },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 5 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card },
  textArea: { height: 100, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', ...SHADOWS.card },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default BecomeProviderScreen;