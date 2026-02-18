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
  Modal,
  FlatList,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { authService } from '../services/api'; 
import { useAuth } from '../context/AuthContext';
import { REGIONES_CHILE } from '../constants/chile_data'; 
import * as ImagePicker from 'expo-image-picker'; 
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const { user, setUser } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    rut: '',
    bio: '', 
    phone: '',
    photo: '' 
  });

  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedComuna, setSelectedComuna] = useState<string>('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);

  useEffect(() => {
    if (user) {
        let currentPhoto = '';
        let currentBio = '';
        let currentPhone = '';
        let currentAddress = user.address || '';

        if (user.user_type === 'PP' && user.pet_parent_profile) {
            currentPhoto = user.pet_parent_profile.photo_identification_url || '';
            currentBio = user.pet_parent_profile.personal_bio || '';
            currentPhone = user.pet_parent_profile.phone_number || '';
            if (user.pet_parent_profile.address) currentAddress = user.pet_parent_profile.address;
        } else if (user.user_type === 'IP' && user.provider_profile) {
            const photos = user.provider_profile.photos_url;
            currentPhoto = (Array.isArray(photos) && photos.length > 0) ? photos[0] : '';
            currentBio = user.provider_profile.professional_bio || '';
            currentPhone = user.provider_profile.phone_number || '';
            if (user.provider_profile.address_line) currentAddress = user.provider_profile.address_line;
        }

        setForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            address: currentAddress,
            rut: user.identification_number || '',
            bio: currentBio,
            phone: currentPhone,
            photo: currentPhoto
        });

        if (user.region) {
            const regionObj = REGIONES_CHILE.find(r => r.region === user.region);
            if (regionObj) setSelectedRegion(regionObj);
        }
        if (user.comuna) setSelectedComuna(user.comuna);
    }
  }, [user]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, 
      base64: true, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImageToCloudinary(result.assets[0]);
    }
  };

  const uploadImageToCloudinary = async (asset: any) => {
      setUploading(true);
      try {
          // 👇 AQUÍ ESTABAN LOS DATOS INCORRECTOS, YA ACTUALIZADOS:
          const cloudName = 'dfswgujud'; 
          const uploadPreset = 'innpets_upload'; 

          let data = {
              file: `data:image/jpeg;base64,${asset.base64}`,
              upload_preset: uploadPreset,
          };

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(data),
          });

          const result = await response.json();
          
          if (result.secure_url) {
              setForm(prev => ({ ...prev, photo: result.secure_url }));
              Alert.alert("¡Foto Cargada! 📸", "Ahora dale a 'Guardar Cambios' para confirmar.");
          } else {
              console.log("Error Cloudinary:", result);
              const msg = result.error?.message || "Error desconocido al subir.";
              Alert.alert("Error Cloudinary", msg);
          }
      } catch (error) {
          console.error("Error de red/código:", error);
          Alert.alert("Error", "Fallo de conexión al subir imagen.");
      } finally {
          setUploading(false);
      }
  };

  const handleSelectRegion = (regionObj: any) => {
    setSelectedRegion(regionObj);
    setSelectedComuna('');
    setShowRegionModal(false);
  };

  const handleSelectComuna = (comuna: string) => {
    setSelectedComuna(comuna);
    setShowComunaModal(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!selectedRegion || !selectedComuna) {
        Alert.alert("Faltan datos", "Por favor selecciona tu región y comuna.");
        return;
    }

    setSaving(true);
    try {
        let updatePayload: any = {
            first_name: form.first_name,
            last_name: form.last_name,
            region: selectedRegion.region, 
            comuna: selectedComuna,
            address: form.address 
        };

        if (user.user_type === 'PP') {
            updatePayload.pet_parent_profile = {
                personal_bio: form.bio,
                phone_number: form.phone,
                address: form.address,
                photo_identification_url: form.photo,
                commune: null 
            };
        } else if (user.user_type === 'IP') {
            updatePayload.provider_profile = {
                professional_bio: form.bio,
                phone_number: form.phone,
                address_line: form.address,
                photos_url: [form.photo] 
            };
        }

        const updatedData = await authService.updateProfile(user.id, updatePayload);

        const newUserState = { ...user, ...updatedData };
        if (user.user_type === 'PP') newUserState.pet_parent_profile = { ...user.pet_parent_profile, ...updatePayload.pet_parent_profile };
        if (user.user_type === 'IP') newUserState.provider_profile = { ...user.provider_profile, ...updatePayload.provider_profile };
        
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

  const isProvider = user.user_type === 'IP';

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil ({isProvider ? 'Proveedor' : 'Dueño'})</Text>
        <View style={{width: 24}} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                    {uploading ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : form.photo ? (
                        <Image source={{ uri: form.photo }} style={styles.avatar} />
                    ) : (
                        <Text style={{fontSize: 40}}>📷</Text>
                    )}
                    <View style={styles.editBadge}>
                        <Ionicons name="camera" size={16} color="white" />
                    </View>
                </TouchableOpacity>
                <Text style={{color: COLORS.textLight, marginTop: 5}}>
                    Toca para cambiar foto de {isProvider ? 'Proveedor' : 'Dueño'}
                </Text>
            </View>

            <View style={styles.sectionTitle}><Text style={styles.sectionText}>Datos Personales</Text></View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex:1, marginRight: 5}]}>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput 
                        style={styles.input} 
                        value={form.first_name} autoCapitalize="words"
                        onChangeText={(t) => setForm({...form, first_name: t})}
                    />
                </View>
                <View style={[styles.inputGroup, {flex:1, marginLeft: 5}]}>
                    <Text style={styles.label}>Apellido</Text>
                    <TextInput 
                        style={styles.input} 
                        value={form.last_name} autoCapitalize="words"
                        onChangeText={(t) => setForm({...form, last_name: t})}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>RUT (No editable)</Text>
                <TextInput 
                    style={[styles.input, { backgroundColor: '#f0f0f0', color: '#666' }]} 
                    value={form.rut}
                    editable={false} 
                    placeholder="Sin registrar"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.phone} 
                    onChangeText={(t) => setForm({...form, phone: t})}
                    placeholder="+56 9..." 
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Biografía / Descripción</Text>
                <TextInput 
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                    value={form.bio} 
                    onChangeText={(t) => setForm({...form, bio: t})}
                    placeholder={isProvider ? "Describe tu experiencia y servicios..." : "Cuéntanos sobre ti y tus mascotas..."}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.sectionTitle}><Text style={styles.sectionText}>Ubicación 📍</Text></View>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Región</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRegionModal(true)}>
                    <Text style={{color: selectedRegion ? '#000' : '#999'}}>
                        {selectedRegion ? selectedRegion.region : "Selecciona tu Región"}
                    </Text>
                    <Text>▼</Text>
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
                    <Text>▼</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.address} 
                    onChangeText={(t) => setForm({...form, address: t})}
                    placeholder="Ej: Av. Siempre Viva 123" 
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo (No editable)</Text>
                <TextInput 
                    style={[styles.input, { backgroundColor: '#f0f0f0', color: '#666' }]} 
                    value={form.email}
                    editable={false} 
                />
            </View>

            <TouchableOpacity 
                style={styles.btnPrimary} 
                onPress={handleSave}
                disabled={saving || uploading}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.btnText}>Guardar Cambios</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

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
  title: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },

  sectionTitle: { marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5 },
  sectionText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 16 },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 15 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 5, color: COLORS.textDark, fontSize: 14 },
  input: { 
    backgroundColor: COLORS.white, 
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee',
    fontSize: 16, color: '#000000' 
  },
  btnPrimary: { 
    backgroundColor: COLORS.primary, 
    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 30
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  selectBtn: { 
    backgroundColor: COLORS.white, padding: 12, borderRadius: 10, ...SHADOWS.card,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:15, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default EditProfileScreen;