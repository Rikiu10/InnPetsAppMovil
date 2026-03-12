import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { marketplaceService } from '../services/api'; 
import { uploadImageToCloudinary } from '../services/imageService';

const CreateMarketplaceItemScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // ESTADOS MEJORADOS PARA UBICACIÓN (Filtro Local)
  const [regions, setRegions] = useState<any[]>([]);
  const [allCommunes, setAllCommunes] = useState<any[]>([]); 
  const [filteredCommunes, setFilteredCommunes] = useState<any[]>([]); 
  
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showCommuneModal, setShowCommuneModal] = useState(false);

  // ESTADOS PARA TARIFAS DINÁMICAS
  const [tasaComision, setTasaComision] = useState<number>(5); 
  const [tarifaMinima, setTarifaMinima] = useState<number>(1000);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    condition: 'NEW', 
    selectedRegion: null as any,
    selectedCommune: null as any,
  });

  const [errors, setErrors] = useState<any>({});

  const priceNum = parseFloat(form.price);
  const isValidPrice = !isNaN(priceNum) && priceNum > 0;
  const comisionCalculada = isValidPrice ? Math.max(priceNum * (tasaComision / 100), tarifaMinima) : 0;

  useEffect(() => {
      // 1. Descargamos TODAS las regiones y comunas de inmediato
      api.get('/regions/').then(res => setRegions(res.data)).catch(err => console.error("Error regiones:", err));
      api.get('/communes/').then(res => setAllCommunes(res.data)).catch(err => console.error("Error comunas:", err));
      
      // 2. Cargar Tarifas
      api.get('/marketplace/settings/').then(res => {
          if (res.data) {
              setTasaComision(parseFloat(res.data.commission_percentage));
              setTarifaMinima(res.data.minimum_fee);
          }
      }).catch(err => console.log("Error tarifas:", err));
  }, []);

  const handleSelectRegion = (region: any) => {
      setForm({ ...form, selectedRegion: region, selectedCommune: null });
      setShowRegionModal(false);
      
      // FILTRO LOCAL INSTANTÁNEO 
      const filtered = allCommunes.filter(c => 
          c.region === region.id || 
          c.region_id === region.id || 
          (c.region && c.region.id === region.id)
      );
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
    if (permissionResult.granted === false) return Alert.alert("Permiso necesario.");
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
      if (!isValidPrice) { temp.price = "Ingresa un precio válido"; valid = false; }
      if (isValidPrice && priceNum <= comisionCalculada) { temp.price = "El precio debe ser mayor a la tarifa de publicación."; valid = false; }
      
      if (!form.selectedRegion) { temp.region = "Requerido"; valid = false; }
      if (!form.selectedCommune) { temp.commune = "Requerido"; valid = false; }

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

      const payload = {
          title: form.title,
          description: form.description,
          price: priceNum,
          condition: form.condition,
          photos_url: uploadedUrl ? [uploadedUrl] : [],
          region: form.selectedRegion.id, 
          commune: form.selectedCommune.id       
      };

      await marketplaceService.create(payload);

      Alert.alert(
          "¡Publicación Enviada! 🚀", 
          "Tu producto ha sido enviado a revisión. Te notificaremos cuando sea aprobado para que puedas realizar el pago de publicación.", 
          [{ text: "Entendido", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error creando producto:", error);
      Alert.alert("Error", "Hubo un problema al publicar el producto.");
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
        <Text style={styles.headerTitle}>Vender Producto</Text>
        <View style={{width: 40}}/> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            
            <View style={styles.card}>
                <Text style={styles.label}>Foto Principal</Text>
                <TouchableOpacity style={[styles.imagePicker, errors.image && styles.inputError]} onPress={handlePhotoAction}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="camera" size={40} color={COLORS.primary} />
                            <Text style={{color: COLORS.primary, marginTop: 8, fontFamily: FONTS.semiBold}}>Toca para subir foto</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>¿Qué vas a vender?</Text>
                <TextInput 
                    style={[styles.input, errors.title && styles.inputError]} 
                    placeholder="Ej: Cama para perro talla L" 
                    placeholderTextColor="#999"
                    value={form.title}
                    onChangeText={(t) => { setForm({...form, title: t}); clearError('title'); }}
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

                <Text style={[styles.label, {marginTop: 20}]}>Condición</Text>
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
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>¿Dónde se encuentra?</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={{flex: 1}}>
                        <TouchableOpacity 
                            style={[styles.selectBtn, errors.region && styles.inputError]} 
                            onPress={() => setShowRegionModal(true)}
                        >
                            <Text style={{color: form.selectedRegion ? COLORS.textDark : '#999', flex: 1}} numberOfLines={1}>
                                {form.selectedRegion?.name || "Región"}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#999" />
                        </TouchableOpacity>
                        {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                    </View>

                    <View style={{flex: 1}}>
                        <TouchableOpacity 
                            style={[styles.selectBtn, errors.commune && styles.inputError]} 
                            onPress={() => form.selectedRegion ? setShowCommuneModal(true) : Alert.alert("Primero selecciona una región")}
                            disabled={!form.selectedRegion}
                        >
                            <Text style={{color: form.selectedCommune ? COLORS.textDark : '#999', flex: 1}} numberOfLines={1}>
                                {form.selectedCommune?.name || "Comuna"}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#999" />
                        </TouchableOpacity>
                        {errors.commune && <Text style={styles.errorText}>{errors.commune}</Text>}
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.description && styles.inputError]} 
                    multiline 
                    placeholder="Detalles, medidas, marca, motivo de venta..." 
                    placeholderTextColor="#999"
                    value={form.description}
                    onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Precio de Venta (CLP)</Text>
                <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput 
                        style={[styles.inputPrice, errors.price && {color: COLORS.danger}]} 
                        placeholder="0" 
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={form.price}
                        onChangeText={(t) => { setForm({...form, price: t}); clearError('price'); }}
                    />
                </View>
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

                {/* 🔥 RESUMEN CORREGIDO SEGÚN EL PROFESOR */}
                {isValidPrice && (
                    <View style={styles.feeSummaryBox}>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Precio del producto</Text>
                            <Text style={styles.feeValue}>${priceNum.toLocaleString('es-CL')}</Text>
                        </View>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>
                                Tarifa a publicar ({comisionCalculada === tarifaMinima ? 'Mínimo' : `${tasaComision}%`})
                            </Text>
                            <Text style={styles.feeValue}>${comisionCalculada.toLocaleString('es-CL')}</Text>
                        </View>
                        
                        <View style={styles.infoAlertBox}>
                            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} style={{marginRight: 6}} />
                            <Text style={styles.infoAlertText}>
                                Este es el monto que deberás pagar para activar tu anuncio una vez sea aprobado por nuestro equipo.
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Enviar a Revisión</Text>}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALES DE UBICACIÓN... */}
      <Modal visible={showRegionModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Región</Text>
                  <FlatList 
                      data={regions} 
                      keyExtractor={i=>i.id.toString()} 
                      renderItem={({item})=> (
                          <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectRegion(item)}>
                              <Text style={styles.modalItemText}>{item.name}</Text>
                          </TouchableOpacity>
                      )}
                  />
                  <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowRegionModal(false)}>
                      <Text style={styles.closeText}>Cerrar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
      
      <Modal visible={showCommuneModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona Comuna</Text>
                  <FlatList 
                      data={filteredCommunes} 
                      keyExtractor={i=>i.id.toString()} 
                      renderItem={({item}) => (
                          <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectCommune(item)}>
                              <Text style={styles.modalItemText}>{item.name}</Text>
                          </TouchableOpacity>
                      )}
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.card },
  backBtn: { padding: 8, backgroundColor: '#F0F0F0', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, marginBottom: 15, ...SHADOWS.card },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 8, fontSize: 15 },
  input: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', fontFamily: FONTS.regular, color: COLORS.textDark },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  imagePicker: { width: '100%', height: 180, backgroundColor: '#F8F9FA', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E0E0E0', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  conditionBtn: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F8F9FA', alignItems: 'center' },
  conditionBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  conditionText: { fontFamily: FONTS.semiBold, color: COLORS.textDark },
  conditionTextActive: { color: COLORS.white },
  selectBtn: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', flexDirection:'row', justifyContent:'space-between', alignItems: 'center' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15 },
  currencySymbol: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark, marginRight: 10 },
  inputPrice: { flex: 1, paddingVertical: 15, fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  // 🔥 ESTILOS NUEVOS DE TARIFAS
  feeSummaryBox: { marginTop: 15, backgroundColor: '#F4F6F8', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  feeLabel: { fontFamily: FONTS.regular, color: COLORS.textLight, fontSize: 14 },
  feeValue: { fontFamily: FONTS.semiBold, color: COLORS.textDark, fontSize: 14 },
  infoAlertBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'flex-start' },
  infoAlertText: { flex: 1, fontSize: 12, color: '#1565C0', fontFamily: FONTS.regular, lineHeight: 18 },

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

export default CreateMarketplaceItemScreen;