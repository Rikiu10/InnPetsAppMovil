import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { marketplaceService } from '../services/api'; // Importamos api general también
import { uploadImageToCloudinary } from '../services/imageService';

const CreateMarketplaceItemScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // 🔥 ESTADOS PARA UBICACIÓN
  const [regions, setRegions] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showCommuneModal, setShowCommuneModal] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    condition: 'NEW', // 'NEW' o 'USED'
    selectedRegion: null as any,
    selectedCommune: null as any,
  });

  const [errors, setErrors] = useState<any>({});

  // CARGAR REGIONES AL INICIO
  useEffect(() => {
      api.get('/regions/').then(res => setRegions(res.data)).catch(err => console.error("Error regiones:", err));
  }, []);

  // CARGAR COMUNAS CUANDO CAMBIA LA REGIÓN
  const handleSelectRegion = async (region: any) => {
      setForm({ ...form, selectedRegion: region, selectedCommune: null });
      setShowRegionModal(false);
      setLoadingCommunes(true);
      try {
          // Asumiendo que tu API de comunas filtra por ?region=ID
          const res = await api.get(`/communes/?region=${region.id}`);
          setCommunes(res.data);
      } catch (error) {
          console.error("Error comunas:", error);
          Alert.alert("Error", "No se pudieron cargar las comunas.");
      } finally {
          setLoadingCommunes(false);
      }
      clearError('region');
  };


  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  // 🔥 NUEVO HANDLER PARA FOTO (CÁMARA U GALERÍA)
  const handlePhotoAction = () => {
    Alert.alert(
        "Foto del Producto",
        "Elige una opción",
        [
            { text: "📷 Tomar Foto", onPress: openCamera },
            { text: "🖼️ Abrir Galería", onPress: openGallery },
            { text: "Cancelar", style: "cancel" },
        ]
    );
  };

  const openCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado para usar la cámara.");
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      if (!result.canceled) {
          setImageUri(result.assets[0].uri);
          clearError('image');
      }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
        Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
        return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        clearError('image');
    }
  };

  const validate = () => {
      let valid = true;
      let temp: any = {};
      if (!imageUri) { temp.image = "Sube al menos una foto del producto"; valid = false; }
      if (!form.title) { temp.title = "El título es obligatorio"; valid = false; }
      if (!form.description) { temp.description = "La descripción es obligatoria"; valid = false; }
      if (!form.price || isNaN(parseFloat(form.price))) { temp.price = "Ingresa un precio válido"; valid = false; }
      
      // Validar Ubicación
      if (!form.selectedRegion) { temp.region = "Selecciona una región"; valid = false; }
      if (!form.selectedCommune) { temp.commune = "Selecciona una comuna"; valid = false; }

      setErrors(temp);
      return valid;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let uploadedUrl = "";
      if (imageUri) {
         const url = await uploadImageToCloudinary(imageUri);
         if (url) uploadedUrl = url;
      }

      // 🔥 Payload actualizado con ubicación (Asegúrate que tu backend lo soporte)
      const payload = {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          condition: form.condition,
          photos_url: uploadedUrl ? [uploadedUrl] : [],
          region: form.selectedRegion.id,   // Ojo: Revisa cómo lo espera tu backend (ID o nombre)
          commune: form.selectedCommune.id // Ojo: Revisa cómo lo espera tu backend
      };

      await marketplaceService.create(payload);

      Alert.alert(
          "¡Publicación Enviada! 🚀", 
          "Tu producto pasará por una breve revisión de nuestro equipo antes de ser visible en la tienda.", 
          [{ text: "Entendido", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error creando producto:", error);
      Alert.alert("Error", "Hubo un problema al publicar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = (item: any, onPress: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onPress}>
        <Text style={styles.modalItemText}>{item.name}</Text>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vender Producto</Text>
        <View style={{width: 24}}/> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            {/* FOTO CON OPCIÓN DE CÁMARA */}
            <TouchableOpacity style={[styles.imagePicker, errors.image && styles.inputError]} onPress={handlePhotoAction}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{fontSize: 40}}>📸</Text>
                        <Text style={{color: COLORS.primary, marginTop: 5}}>Subir Foto</Text>
                    </View>
                )}
            </TouchableOpacity>
            {errors.image && <Text style={[styles.errorText, {textAlign: 'center', marginBottom: 15}]}>{errors.image}</Text>}

            {/* TÍTULO */}
            <Text style={styles.label}>¿Qué vas a vender?</Text>
            <TextInput 
                style={[styles.input, errors.title && styles.inputError]} 
                placeholder="Ej: Cama para perro talla L" 
                value={form.title}
                onChangeText={(t) => { setForm({...form, title: t}); clearError('title'); }}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

            {/* CONDICIÓN */}
            <Text style={[styles.label, {marginTop: 15}]}>Condición</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity 
                    style={[styles.conditionBtn, form.condition === 'NEW' && styles.conditionBtnActive]}
                    onPress={() => setForm({...form, condition: 'NEW'})}
                >
                    <Text style={[styles.conditionText, form.condition === 'NEW' && styles.conditionTextActive]}>✨ Nuevo</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.conditionBtn, form.condition === 'USED' && styles.conditionBtnActive]}
                    onPress={() => setForm({...form, condition: 'USED'})}
                >
                    <Text style={[styles.conditionText, form.condition === 'USED' && styles.conditionTextActive]}>♻️ Usado</Text>
                </TouchableOpacity>
            </View>

            {/* PRECIO */}
            <Text style={[styles.label, {marginTop: 15}]}>Precio (CLP)</Text>
            <TextInput 
                style={[styles.input, errors.price && styles.inputError]} 
                placeholder="Ej: 15000" 
                keyboardType="numeric"
                value={form.price}
                onChangeText={(t) => { setForm({...form, price: t}); clearError('price'); }}
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            
            {/* 🔥 SELECTORES DE UBICACIÓN */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
                {/* REGIÓN */}
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Región</Text>
                    <TouchableOpacity 
                        style={[styles.selectBtn, errors.region && styles.inputError]} 
                        onPress={() => setShowRegionModal(true)}
                    >
                        <Text style={{color: form.selectedRegion ? '#000' : '#999'}} numberOfLines={1}>
                            {form.selectedRegion?.name || "Seleccionar..."}
                        </Text>
                        <Text style={{ color: '#000' }}>▼</Text>
                    </TouchableOpacity>
                    {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                </View>

                {/* COMUNA */}
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Comuna</Text>
                    <TouchableOpacity 
                        style={[styles.selectBtn, errors.commune && styles.inputError]} 
                        onPress={() => form.selectedRegion ? setShowCommuneModal(true) : Alert.alert("Primero selecciona una región")}
                        disabled={!form.selectedRegion}
                    >
                        {loadingCommunes ? (
                             <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <>
                                <Text style={{color: form.selectedCommune ? '#000' : '#999'}} numberOfLines={1}>
                                    {form.selectedCommune?.name || "Seleccionar..."}
                                </Text>
                                <Text style={{ color: '#000' }}>▼</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {errors.commune && <Text style={styles.errorText}>{errors.commune}</Text>}
                </View>
            </View>


            {/* DESCRIPCIÓN */}
            <Text style={[styles.label, {marginTop: 15}]}>Descripción</Text>
            <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.description && styles.inputError]} 
                multiline 
                placeholder="Detalles, medidas, marca, motivo de venta..." 
                value={form.description}
                onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

            {/* BOTÓN */}
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Publicar Producto</Text>}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALES DE UBICACIÓN */}
      <Modal visible={showRegionModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Región</Text>
                  <FlatList data={regions} keyExtractor={i=>i.id.toString()} renderItem={({item})=>renderModalItem(item, ()=>handleSelectRegion(item))}/>
                  <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowRegionModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>
      
      <Modal visible={showCommuneModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Comuna</Text>
                  {/* 🔥 AQUÍ ESTÁ LA CORRECCIÓN */}
                  <FlatList 
                      data={communes} 
                      keyExtractor={i=>i.id.toString()} 
                      renderItem={({item}) => renderModalItem(item, () => {
                          setForm({...form, selectedCommune: item}); 
                          setShowCommuneModal(false); 
                          clearError('commune');
                      })}
                  />
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowCommuneModal(false)}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 5 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  
  imagePicker: { width: '100%', height: 180, backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 15, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#ccc', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  conditionBtn: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: COLORS.white, alignItems: 'center' },
  conditionBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  conditionText: { fontFamily: FONTS.semiBold, color: COLORS.textDark },
  conditionTextActive: { color: COLORS.white },

  // ESTILOS SELECTORES
  selectBtn: { 
    backgroundColor: COLORS.white, padding: 15, borderRadius: 12, 
    borderWidth: 1, borderColor: '#eee', flexDirection:'row', justifyContent:'space-between', alignItems: 'center'
  },

  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 40, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },

  // ESTILOS MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:10, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default CreateMarketplaceItemScreen;