import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import { uploadImageToCloudinary } from '../services/imageService';
import { useAuth } from '../context/AuthContext';

const CreateAdoptionPostScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Ubicación
  const [regions, setRegions] = useState<any[]>([]);
  const [allCommunes, setAllCommunes] = useState<any[]>([]); 
  const [filteredCommunes, setFilteredCommunes] = useState<any[]>([]); 
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showCommuneModal, setShowCommuneModal] = useState(false);

  const [form, setForm] = useState({
    temp_name: '',
    description: '',
    requirements: '',
    selectedRegion: null as any,
    selectedCommune: null as any,
    publishAsFoundation: false, // Checkbox si el usuario tiene fundación
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
      api.get('/regions/').then(res => setRegions(res.data)).catch(err => console.error(err));
      api.get('/communes/').then(res => setAllCommunes(res.data)).catch(err => console.error(err));
  }, []);

  const handleSelectRegion = (region: any) => {
      setForm({ ...form, selectedRegion: region, selectedCommune: null });
      setShowRegionModal(false);
      const filtered = allCommunes.filter(c => c.region === region.id || c.region_id === region.id || (c.region && c.region.id === region.id));
      setFilteredCommunes(filtered);
      clearError('region');
  };

  const handleSelectCommune = (commune: any) => {
      setForm({ ...form, selectedCommune: commune });
      setShowCommuneModal(false);
      clearError('commune');
  };

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handlePhotoAction = () => {
    Alert.alert("Foto del Rescatado", "Elige una opción", [
        { text: "📷 Tomar Foto", onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) return Alert.alert("Permiso denegado");
            const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [4, 3] });
            if (!res.canceled) { setImageUri(res.assets[0].uri); clearError('image'); }
        }},
        { text: "🖼️ Abrir Galería", onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) return Alert.alert("Permiso denegado");
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.6 });
            if (!res.canceled) { setImageUri(res.assets[0].uri); clearError('image'); }
        }},
        { text: "Cancelar", style: "cancel" },
    ]);
  };

  const validate = () => {
      let valid = true;
      let temp: any = {};
      if (!imageUri) { temp.image = "Sube al menos una foto del animalito"; valid = false; }
      if (!form.temp_name) { temp.temp_name = "Dale un nombre para identificarlo"; valid = false; }
      if (!form.description) { temp.description = "Cuéntanos su historia y personalidad"; valid = false; }
      if (!form.selectedRegion) { temp.region = "Requerido"; valid = false; }
      if (!form.selectedCommune) { temp.commune = "Requerido"; valid = false; }
      setErrors(temp);
      return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let uploadedUrl = "";
      if (imageUri) {
         const url = await uploadImageToCloudinary(imageUri);
         if (url) uploadedUrl = url;
      }

      const payload: any = {
          post_type: 'FOUND', // Por defecto usamos la lógica de rescate
          temp_name: form.temp_name,
          description: form.description,
          requirements: form.requirements,
          photos_url: uploadedUrl ? [uploadedUrl] : [],
          region: form.selectedRegion.id, 
          commune: form.selectedCommune.id       
      };

      // Si el usuario marcó que publica a nombre de su fundación
      if (form.publishAsFoundation && user?.foundation) {
          payload.foundation_linked = user.foundation.id || user.foundation;
      }

      await api.post('/adoptions/', payload);

      Alert.alert(
          "¡Publicación Creada! 🐾", 
          "El caso ha sido enviado a revisión. Una vez aprobado por el administrador, aparecerá en la red de rescate.", 
          [{ text: "Entendido", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error publicando:", error);
      Alert.alert("Error", "No se pudo crear la publicación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar Rescate</Text>
        <View style={{width: 40}}/> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            
            {user?.foundation && (
                <TouchableOpacity 
                    style={styles.foundationToggle} 
                    onPress={() => setForm({...form, publishAsFoundation: !form.publishAsFoundation})}
                >
                    <Ionicons name={form.publishAsFoundation ? "checkbox" : "square-outline"} size={24} color={COLORS.primary} />
                    <Text style={styles.foundationToggleText}>Publicar a nombre de mi Fundación</Text>
                </TouchableOpacity>
            )}

            <View style={styles.card}>
                <Text style={styles.label}>Foto del Rescatado *</Text>
                <TouchableOpacity style={[styles.imagePicker, errors.image && styles.inputError]} onPress={handlePhotoAction}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="camera" size={40} color={COLORS.primary} />
                            <Text style={{color: COLORS.primary, marginTop: 8, fontFamily: FONTS.semiBold}}>Subir foto</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Nombre (Temporal o Real) *</Text>
                <TextInput 
                    style={[styles.input, errors.temp_name && styles.inputError]} 
                    placeholder="Ej: Firulais / Cachorro" 
                    placeholderTextColor="#999"
                    value={form.temp_name}
                    onChangeText={(t) => { setForm({...form, temp_name: t}); clearError('temp_name'); }}
                />
                {errors.temp_name && <Text style={styles.errorText}>{errors.temp_name}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>¿Dónde se encuentra? *</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TouchableOpacity style={[styles.selectBtn, {flex: 1}, errors.region && styles.inputError]} onPress={() => setShowRegionModal(true)}>
                        <Text style={{color: form.selectedRegion ? COLORS.textDark : '#999'}} numberOfLines={1}>{form.selectedRegion?.name || "Región"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.selectBtn, {flex: 1}, errors.commune && styles.inputError]} onPress={() => form.selectedRegion ? setShowCommuneModal(true) : Alert.alert("Selecciona región")} disabled={!form.selectedRegion}>
                        <Text style={{color: form.selectedCommune ? COLORS.textDark : '#999'}} numberOfLines={1}>{form.selectedCommune?.name || "Comuna"}</Text>
                    </TouchableOpacity>
                </View>
                {(errors.region || errors.commune) && <Text style={styles.errorText}>Selecciona la ubicación completa</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Historia y Descripción *</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.description && styles.inputError]} 
                    multiline 
                    placeholder="¿Dónde lo encontraste? ¿Cómo es su personalidad? ¿Tiene vacunas?" 
                    placeholderTextColor="#999"
                    value={form.description}
                    onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

                <Text style={[styles.label, {marginTop: 15}]}>Requisitos para Adoptarlo (Opcional)</Text>
                <TextInput 
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                    multiline 
                    placeholder="Ej: Casa con patio cerrado, seguimiento de vacunas..." 
                    placeholderTextColor="#999"
                    value={form.requirements}
                    onChangeText={(t) => setForm({...form, requirements: t})}
                />
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Enviar a Revisión</Text>}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALES DE REGIÓN Y COMUNA */}
      <Modal visible={showRegionModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Región</Text>
                  <FlatList data={regions} keyExtractor={i=>i.id.toString()} renderItem={({item})=> (
                          <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectRegion(item)}><Text style={styles.modalItemText}>{item.name}</Text></TouchableOpacity>
                  )}/>
                  <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowRegionModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>
      <Modal visible={showCommuneModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Comuna</Text>
                  <FlatList data={filteredCommunes} keyExtractor={i=>i.id.toString()} renderItem={({item}) => (
                          <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectCommune(item)}><Text style={styles.modalItemText}>{item.name}</Text></TouchableOpacity>
                  )}/>
                  <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowCommuneModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.card },
  backBtn: { padding: 8, backgroundColor: '#F0F0F0', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  foundationToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 15 },
  foundationToggleText: { marginLeft: 10, fontFamily: FONTS.bold, color: '#1565C0', fontSize: 14 },

  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, marginBottom: 15, ...SHADOWS.card },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', fontFamily: FONTS.regular, color: COLORS.textDark },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  
  selectBtn: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', justifyContent: 'center' },
  
  imagePicker: { width: '100%', height: 180, backgroundColor: '#F8F9FA', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E0E0E0', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 40, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:10, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default CreateAdoptionPostScreen;