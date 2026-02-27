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
import { Ionicons } from '@expo/vector-icons';

const BecomeProviderScreen = ({ navigation }: any) => {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');

  // 🔥 NUEVA LÓGICA: Lista de documentos
  const [documentsList, setDocumentsList] = useState<any[]>([]);
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
          "Añadir Certificado",
          "Elige el formato del documento",
          [
              { text: "📷 Cámara", onPress: openCamera },
              { text: "🖼️ Galería", onPress: openGallery },
              { text: "📄 PDF", onPress: pickDocument },
              { text: "Cancelar", style: "cancel" }
          ]
      );
  };

  const addFileToList = (asset: any, type: 'image' | 'pdf', defaultName: string) => {
    const newDoc = {
        id: Date.now().toString(),
        asset: asset,
        type: type,
        customName: defaultName
    };
    setDocumentsList([...documentsList, newDoc]);
  };

  const openCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) {
          addFileToList(result.assets[0], 'image', `Certificado_${Date.now()}.jpg`);
      }
  };

  const openGallery = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (!result.canceled) {
          addFileToList(result.assets[0], 'image', result.assets[0].fileName || `Certificado_${Date.now()}.jpg`);
      }
  };

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!result.canceled && result.assets) {
            addFileToList(result.assets[0], 'pdf', result.assets[0].name);
        }
    } catch (err) { console.log(err); }
  };

  const removeDocument = (id: string) => {
    setDocumentsList(documentsList.filter(doc => doc.id !== id));
  };

  const updateDocName = (id: string, newName: string) => {
    setDocumentsList(documentsList.map(doc => 
        doc.id === id ? { ...doc, customName: newName } : doc
    ));
  };

  const handleSubmit = async () => {
    if (!bio || !phone || !selectedRegion || !selectedComuna) {
      Alert.alert("Faltan datos", "Por favor completa tu perfil de contacto.");
      return;
    }
    if (documentsList.length === 0) {
        Alert.alert("Faltan documentos", "Debes subir al menos un certificado para postular.");
        return;
    }

    setLoading(true);
    try {
      // 1. Actualizar perfil básico
      const userUpdateRes = await api.patch('/users/me/', {
        phone_number: phone,
        region: selectedRegion.region,
        comuna: selectedComuna,
        address: address,
        provider_profile: { professional_bio: bio }
      });

      // 2. Subir todos los archivos
      for (const doc of documentsList) {
        let docUrl = "";
        if (doc.type === 'image') {
            docUrl = await uploadImageToCloudinary(doc.asset.uri);
        } else {
            docUrl = await uploadFileToCloudinary(
                doc.asset.uri, 
                doc.customName, 
                doc.asset.mimeType || 'application/pdf'
            );
        }

        if (docUrl) {
            await api.post('/certifications/', {
                document_url: docUrl,
                title: doc.customName // Asegúrate que el backend acepte 'title'
            });
        }
      }

      await setUser(userUpdateRes.data);
      Alert.alert("¡Solicitud Enviada! 📨", "Tus datos y certificados están siendo revisados por el equipo de InnPets.", [{ text: "Entendido", onPress: () => navigation.goBack() }]);

    } catch (error: any) {
      Alert.alert("Error", "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

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
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 10}}>
              <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Postulación a Proveedor 🎓</Text>
          <Text style={styles.subtitle}>Para ofrecer servicios, necesitamos validar tus conocimientos y antecedentes.</Text>

          {/* 🔥 BANNER DE ADVERTENCIA */}
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={24} color="#856404" />
            <Text style={styles.warningText}>
                <Text style={{fontWeight: 'bold'}}>IMPORTANTE:</Text> Es obligatorio subir tu <Text style={{fontWeight: 'bold'}}>Certificado de Antecedentes Penales</Text> para ser aprobado. Sin este documento, tu solicitud será rechazada.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionHeader}>1. Datos de Contacto</Text>
            
            <Text style={styles.label}>Región *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRegionModal(true)}>
                <Text style={{color: selectedRegion ? '#000' : '#999'}}>{selectedRegion ? selectedRegion.region : "Selecciona Región"}</Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            
            <Text style={styles.label}>Comuna *</Text>
            <TouchableOpacity style={[styles.selectBtn, !selectedRegion && {backgroundColor: '#f5f5f5'}]} onPress={() => selectedRegion && setShowComunaModal(true)}>
                <Text style={{color: selectedComuna ? '#000' : '#999'}}>{selectedComuna || "Selecciona Comuna"}</Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>

            <Text style={styles.label}>Dirección</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Ej: Av. Las Condes 1234" placeholderTextColor="#999" />
            
            <Text style={styles.label}>Teléfono de Contacto *</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+569..." placeholderTextColor="#999" />
            
            <Text style={styles.label}>Resumen Profesional (Bio) *</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                multiline 
                numberOfLines={4} 
                value={bio} 
                onChangeText={setBio} 
                placeholder="Cuéntanos sobre tu experiencia cuidando mascotas..."
                placeholderTextColor="#999"
            />

            <View style={styles.divider} />
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text style={styles.sectionHeader}>2. Certificaciones</Text>
                <TouchableOpacity style={styles.addSmallBtn} onPress={handleSelectFile}>
                    <Ionicons name="add-circle" size={20} color={COLORS.white} />
                    <Text style={{color: COLORS.white, fontWeight: 'bold', marginLeft: 5}}>Añadir</Text>
                </TouchableOpacity>
            </View>

            {/* LISTA DE DOCUMENTOS AÑADIDOS */}
            {documentsList.length > 0 ? (
                <View style={{gap: 10, marginBottom: 10}}>
                    {documentsList.map((doc) => (
                        <View key={doc.id} style={styles.docCard}>
                            <View style={styles.docInfo}>
                                <Text style={{fontSize: 20}}>{doc.type === 'image' ? '🖼️' : '📄'}</Text>
                                <View style={{flex: 1, marginLeft: 10}}>
                                    <TextInput 
                                        style={styles.docInputName}
                                        value={doc.customName}
                                        onChangeText={(val) => updateDocName(doc.id, val)}
                                        placeholder="Nombre del certificado"
                                    />
                                    <Text style={{fontSize: 10, color: '#999'}}>Toca el nombre para editarlo</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeDocument(doc.id)}>
                                    <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <TouchableOpacity style={styles.uploadBtnPlaceholder} onPress={handleSelectFile}>
                    <Ionicons name="cloud-upload-outline" size={40} color={COLORS.primary} />
                    <Text style={styles.uploadText}>Sube certificados o antecedentes</Text>
                    <Text style={{fontSize: 11, color: '#999'}}>Formatos: JPG, PNG, PDF</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Postulación</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Selecciona Región</Text><FlatList data={REGIONES_CHILE} keyExtractor={i=>i.region} renderItem={renderRegionItem}/><TouchableOpacity style={styles.closeBtn} onPress={()=>setShowRegionModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={showComunaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Selecciona Comuna</Text><FlatList data={selectedRegion?.comunas || []} keyExtractor={i=>i} renderItem={renderComunaItem}/><TouchableOpacity style={styles.closeBtn} onPress={()=>setShowComunaModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 5 },
  subtitle: { color: COLORS.textLight, marginBottom: 15, fontSize: 13 },
  
  // Estilo Banner Advertencia
  warningBanner: { backgroundColor: '#fff3cd', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ffeeba' },
  warningText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#856404', lineHeight: 18 },

  form: { gap: 12 },
  sectionHeader: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 2, fontSize: 14 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card, color: '#000' },
  textArea: { height: 100, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  
  // Botón añadir pequeño
  addSmallBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  
  // Placeholder subida
  uploadBtnPlaceholder: { height: 140, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F8FF' },
  uploadText: { fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 5 },
  
  // Cartas de documentos
  docCard: { backgroundColor: COLORS.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.card },
  docInfo: { flexDirection: 'row', alignItems: 'center' },
  docInputName: { fontWeight: 'bold', color: COLORS.primary, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 2, fontSize: 14 },

  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15, marginBottom: 40, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, fontSize: 18, marginBottom: 15 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default BecomeProviderScreen;