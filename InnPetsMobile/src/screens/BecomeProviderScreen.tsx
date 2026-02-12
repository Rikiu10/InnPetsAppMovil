import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import { REGIONES_CHILE } from '../constants/chile_data'; 
import { useAuth } from '../context/AuthContext';
// 👇 IMPORTS PARA ARCHIVOS E IMÁGENES
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '../services/fileService';   // Para el PDF
import { uploadImageToCloudinary } from '../services/imageService'; // Para la FOTO (Cámara/Galería)

const BecomeProviderScreen = ({ navigation }: any) => {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Estados del Formulario
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');

  // ESTADO HÍBRIDO (Puede ser PDF o IMAGEN)
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docType, setDocType] = useState<'image' | 'pdf' | null>(null);

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/me/');
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

  // --- LÓGICA DE SELECCIÓN ---
  const handleSelectFile = () => {
      Alert.alert(
          "Subir Certificado",
          "Elige el formato de tu documento",
          [
              { text: "📷 Cámara", onPress: openCamera },
              { text: "🖼️ Galería (Fotos)", onPress: openGallery },
              { text: "📄 Documento (PDF)", onPress: pickDocument },
              { text: "Cancelar", style: "cancel" }
          ]
      );
  };

  const openCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) {
          setSelectedDoc(result.assets[0]);
          setDocType('image');
      }
  };

  const openGallery = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");

      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (!result.canceled) {
          setSelectedDoc(result.assets[0]);
          setDocType('image');
      }
  };

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });
        if (result.canceled === false) {
            const file = result.assets ? result.assets[0] : result;
            setSelectedDoc(file);
            setDocType('pdf');
        }
    } catch (err) {
        console.log("Error seleccionando archivo", err);
    }
  };

  const handleSubmit = async () => {
    if (!bio || !phone || !selectedRegion || !selectedComuna) {
      Alert.alert("Faltan datos", "Por favor completa todos los campos de perfil.");
      return;
    }
    if (!selectedDoc) {
        Alert.alert("Falta certificación", "Debes subir tu certificado.");
        return;
    }

    setLoading(true);
    try {
      let docUrl = "";

      // 1. SUBIR A CLOUDINARY (Dependiendo del tipo)
      if (docType === 'image') {
          // Usamos la función de imagen (asegúrate de tenerla importada)
          docUrl = await uploadImageToCloudinary(selectedDoc.uri);
      } else {
          // Usamos la función de PDF
          docUrl = await uploadFileToCloudinary(
              selectedDoc.uri, 
              selectedDoc.name || 'certificado.pdf', 
              selectedDoc.mimeType || 'application/pdf'
          );
      }

      if (!docUrl) throw new Error("Fallo al subir el documento");

      // 2. Actualizar Perfil
      const userUpdateRes = await api.patch('/users/me/', {
        phone_number: phone,
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: address,
        provider_profile: { professional_bio: bio }
      });

      // 3. Crear Certificación
      await api.post('/certifications/', {
          document_url: docUrl
      });

      // 4. Actualizar Estado Local
      await setUser(userUpdateRes.data);

      Alert.alert(
        "¡Solicitud Enviada! 📨", 
        "Tus documentos han sido enviados. Tu estado es 'En Revisión'.", 
        [{ text: "Entendido", onPress: () => navigation.goBack() }]
      );

    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", error.message || "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  // Renders de Modales... (Iguales al anterior)
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

  if (fetchingData) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 10}}>
              <Text style={{fontSize: 24}}>⬅️</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Certificación Profesional 🎓</Text>
          <Text style={styles.subtitle}>Completa tus datos y sube tu documentación.</Text>

          <View style={styles.form}>
            <Text style={styles.sectionHeader}>1. Datos de Contacto</Text>
            
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

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>2. Certificación</Text>
            <Text style={styles.helperText}>Sube una foto o PDF de tu título o curso.</Text>

            <TouchableOpacity style={styles.uploadBtn} onPress={handleSelectFile}>
                {selectedDoc ? (
                    docType === 'image' ? (
                        // Vista previa si es imagen
                        <Image source={{ uri: selectedDoc.uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    ) : (
                        // Icono si es PDF
                        <View style={{alignItems:'center'}}>
                            <Text style={{fontSize: 40}}>📄</Text>
                            <Text style={styles.fileName}>{selectedDoc.name}</Text>
                        </View>
                    )
                ) : (
                    <View style={{alignItems:'center'}}>
                        <Text style={{fontSize: 32}}>cloud_upload</Text> 
                        <Text style={styles.uploadText}>Subir Documento / Foto</Text>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Solicitud</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modales */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><FlatList data={REGIONES_CHILE} keyExtractor={i=>i.region} renderItem={renderRegionItem}/><TouchableOpacity style={styles.closeBtn} onPress={()=>setShowRegionModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={showComunaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><FlatList data={selectedRegion?.comunas || []} keyExtractor={i=>i} renderItem={renderComunaItem}/><TouchableOpacity style={styles.closeBtn} onPress={()=>setShowComunaModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 5 },
  subtitle: { color: COLORS.textLight, marginBottom: 20, fontSize: 13, lineHeight: 18 },
  form: { gap: 12 },
  sectionHeader: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, marginTop: 10, marginBottom: 5 },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 2 },
  helperText: { fontSize: 12, color: '#888', marginBottom: 10 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', ...SHADOWS.card },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 15 },
  uploadBtn: { 
      height: 150, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', 
      borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
      backgroundColor: '#F9F9F9', overflow: 'hidden'
  },
  uploadText: { fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 5 },
  fileName: { fontSize: 12, color: '#555', textAlign: 'center', marginTop: 2 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default BecomeProviderScreen;