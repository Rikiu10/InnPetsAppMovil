import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import { REGIONES_CHILE } from '../constants/chile_data'; 
import { useAuth } from '../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '../services/fileService';   
import { uploadImageToCloudinary } from '../services/imageService'; 

const BecomeProviderScreen = ({ navigation }: any) => {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');

  // ARCHIVOS
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docType, setDocType] = useState<'image' | 'pdf' | null>(null);
  
  // 👇 NUEVO: Estado para que el usuario edite el nombre
  const [customFileName, setCustomFileName] = useState('');

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

  const handleSelectFile = () => {
      Alert.alert(
          "Subir Certificado",
          "Elige el formato",
          [
              { text: "📷 Cámara", onPress: openCamera },
              { text: "🖼️ Galería", onPress: openGallery },
              { text: "📄 PDF", onPress: pickDocument },
              { text: "Cancelar", style: "cancel" }
          ]
      );
  };

  const openCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) {
          const asset = result.assets[0];
          const name = `foto_cert_${Date.now()}.jpg`;
          setSelectedDoc(asset);
          setDocType('image');
          setCustomFileName(name); // Ponemos nombre por defecto
      }
  };

  const openGallery = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (!result.canceled) {
          const asset = result.assets[0];
          const name = asset.fileName || `imagen_cert_${Date.now()}.jpg`;
          setSelectedDoc(asset);
          setDocType('image');
          setCustomFileName(name); // Ponemos nombre original
      }
  };

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!result.canceled && result.assets) {
            const file = result.assets[0];
            setSelectedDoc(file);
            setDocType('pdf');
            setCustomFileName(file.name); // Ponemos nombre original del PDF
        }
    } catch (err) { console.log(err); }
  };

  const handleSubmit = async () => {
    if (!bio || !phone || !selectedRegion || !selectedComuna) {
      Alert.alert("Faltan datos", "Completa el perfil.");
      return;
    }
    if (!selectedDoc) {
        Alert.alert("Falta certificación", "Sube tu certificado.");
        return;
    }
    // Validamos que el usuario haya puesto un nombre
    if (!customFileName.trim()) {
        Alert.alert("Nombre de archivo", "Por favor asigna un nombre al archivo.");
        return;
    }

    setLoading(true);
    try {
      let docUrl = "";
      
      // Enviamos el nombre personalizado (customFileName)
      if (docType === 'image') {
          // Nota: Para imágenes, Cloudinary suele usar su propio ID, pero podemos intentar enviar el public_id o metadata
          // Si tu función uploadImageToCloudinary soporta nombre, úsalo. Si no, subirá con nombre aleatorio pero no afecta.
          docUrl = await uploadImageToCloudinary(selectedDoc.uri);
      } else {
          docUrl = await uploadFileToCloudinary(
              selectedDoc.uri, 
              customFileName, // 👈 AQUÍ USAMOS EL NOMBRE DEL INPUT
              selectedDoc.mimeType || 'application/pdf'
          );
      }

      if (!docUrl) throw new Error("Fallo al subir");

      const userUpdateRes = await api.patch('/users/me/', {
        phone_number: phone,
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: address,
        provider_profile: { professional_bio: bio }
      });

      // Guardamos la certificación (aquí podrías mandar el nombre al backend si tienes un campo 'title' en el modelo Certification)
      await api.post('/certifications/', {
          document_url: docUrl,
          // title: customFileName  <-- Si tu backend soporta título, descomenta esto
      });

      await setUser(userUpdateRes.data);

      Alert.alert("¡Enviado! 📨", "Solicitud en revisión.", [{ text: "OK", onPress: () => navigation.goBack() }]);

    } catch (error: any) {
      Alert.alert("Error", "No se pudo enviar.");
    } finally {
      setLoading(false);
    }
  };

  // Renders... (igual que antes)
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
          <Text style={styles.subtitle}>Completa tus datos.</Text>

          <View style={styles.form}>
            <Text style={styles.sectionHeader}>1. Datos de Contacto</Text>
            
            {/* ... INPUTS DE REGIÓN, COMUNA, ETC (IGUAL QUE ANTES) ... */}
            <Text style={styles.label}>Región *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRegionModal(true)}>
                <Text style={{color: selectedRegion ? '#000' : '#999'}}>{selectedRegion ? selectedRegion.region : "Selecciona Región"}</Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Comuna *</Text>
            <TouchableOpacity style={[styles.selectBtn, !selectedRegion && {backgroundColor: '#f5f5f5'}]} onPress={() => selectedRegion && setShowComunaModal(true)}>
                <Text style={{color: selectedComuna ? '#000' : '#999'}}>{selectedComuna || "Selecciona Comuna"}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Dirección</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Calle 123" />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={bio} onChangeText={setBio} />

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>2. Certificación</Text>
            
            <TouchableOpacity style={styles.uploadBtn} onPress={handleSelectFile}>
                {selectedDoc ? (
                    docType === 'image' ? (
                        <Image source={{ uri: selectedDoc.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <View style={{alignItems:'center'}}>
                            <Text style={{fontSize: 40}}>📄</Text>
                            <Text style={styles.fileName}>Documento PDF Seleccionado</Text>
                        </View>
                    )
                ) : (
                    <View style={{alignItems:'center'}}>
                        <Text style={{fontSize: 32}}>☁️</Text> 
                        <Text style={styles.uploadText}>Toca para subir</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* 👇 NUEVO: CAMPO PARA RENOMBRAR EL ARCHIVO */}
            {selectedDoc && (
                <View style={{marginBottom: 20}}>
                    <Text style={styles.label}>Nombre del Archivo (Editable):</Text>
                    <TextInput 
                        style={styles.input} 
                        value={customFileName} 
                        onChangeText={setCustomFileName}
                        placeholder="Ej: Titulo_Veterinario.pdf"
                    />
                </View>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Solicitud</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modales... */}
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
  subtitle: { color: COLORS.textLight, marginBottom: 20, fontSize: 13 },
  form: { gap: 12 },
  sectionHeader: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, marginTop: 10, marginBottom: 5 },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 2 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 15 },
  uploadBtn: { height: 150, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10, backgroundColor: '#F9F9F9', overflow: 'hidden' },
  uploadText: { fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 5 },
  fileName: { fontSize: 12, color: '#333', marginTop: 5, fontWeight: 'bold' },
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