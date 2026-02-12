import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/imageService';
// Asegúrate de tener este archivo. Si no, avísame y te paso un array dummy.
import { REGIONES_CHILE } from '../constants/chile_data'; 

// === 1. CONFIGURACIÓN DE NIVELES Y REQUISITOS ===
const SERVICE_REQUIREMENTS: Record<string, number> = {
    'WALK': 1,        // Básico (Verde)
    'GROOMING': 1,    // Básico
    'TRAINING': 1,    // Básico
    'OTHER': 1,       // Básico
    'DAYCARE': 2,     // Intermedio (Amarillo)
    'BOARDING': 3,    // Avanzado (Rojo)
    'VETERINARY': 3   // Avanzado
};

const CATEGORIES = [
  { label: "Paseo", value: "WALK" },
  { label: "Alojamiento", value: "BOARDING" },
  { label: "Guardería", value: "DAYCARE" },
  { label: "Veterinaria", value: "VETERINARY" },
  { label: "Entrenamiento", value: "TRAINING" },
  { label: "Peluquería", value: "GROOMING" },
  { label: "Otro", value: "OTHER" },
];

const CreateServiceScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Estado para saber el nivel del usuario
  const [userLevelValue, setUserLevelValue] = useState(0); 
  
  // Estado de Errores (Tu lógica original recuperada)
  const [errors, setErrors] = useState<any>({});
  
  // Modales Geográficos (NECESARIOS para el backend)
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);
  const [selectedRegionObj, setSelectedRegionObj] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'WALK', 
    is_active: true,
    region: '',       
    commune: '',      
    address_ref: ''   
  });

  // === 2. OBTENER NIVEL DE CERTIFICACIÓN AL CARGAR ===
  useEffect(() => {
      fetchUserLevel();
  }, []);

  const fetchUserLevel = async () => {
      try {
          const res = await api.get('/certifications/');
          const approvedCert = res.data.find((c: any) => c.status === 'APPROVED');
          
          if (approvedCert) {
              const levelMap: any = { 
                  'BASIC': 1, 'GREEN': 1,
                  'INTERMEDIATE': 2, 'YELLOW': 2,
                  'ADVANCED': 3, 'RED': 3 
              };
              setUserLevelValue(levelMap[approvedCert.level] || 1); 
          } else {
              setUserLevelValue(0); 
          }
      } catch (error) {
          console.log("Error verificando nivel", error);
          setUserLevelValue(0);
      }
  };

  // Helper para limpiar error
  const clearError = (field: string) => {
     if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSelectImage = () => {
    Alert.alert(
      "Subir Foto del Servicio",
      "Elige una opción",
      [
        { text: "📷 Tomar Foto", onPress: openCamera },
        { text: "🖼️ Abrir Galería", onPress: openGallery },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permiso denegado", "Necesitas dar permiso para usar la cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
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
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // === 3. LÓGICA DE SELECCIÓN DE CATEGORÍA CON BLOQUEO ===
  const handleCategorySelect = (catValue: string, catLabel: string) => {
      const requiredLevel = SERVICE_REQUIREMENTS[catValue] || 1;

      if (userLevelValue < requiredLevel) {
          let msg = "Nivel Básico (Verde)";
          if (requiredLevel === 2) msg = "Nivel Intermedio (Amarillo)";
          if (requiredLevel === 3) msg = "Nivel Avanzado (Rojo)";

          Alert.alert(
              "🔒 Categoría Bloqueada",
              `Para ofrecer servicios de "${catLabel}", necesitas tener una certificación de ${msg}.`
          );
          return;
      }
      setForm({ ...form, category: catValue });
  };

  // === VALIDACIÓN VISUAL (Tu lógica original) ===
  const validate = () => {
      let valid = true;
      let temp: any = {};

      if (!form.title) { temp.title = "El título es obligatorio"; valid = false; }
      if (!form.description) { temp.description = "La descripción es obligatoria"; valid = false; }
      
      if (!form.price) { temp.price = "Ingresa el precio"; valid = false; }
      else if (isNaN(parseFloat(form.price))) { temp.price = "Debe ser un número"; valid = false; }

      // Validamos ubicación (CRUCIAL PARA BACKEND)
      if (!form.commune) { temp.commune = "Selecciona una comuna"; valid = false; }

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
          price: parseFloat(form.price),
          service_type: form.category,
          is_active: form.is_active,
          // Datos Geográficos (Corregido para tu Backend)
          region: form.region,
          comuna: form.commune, // Tu modelo usa 'comuna' (texto)
          address_ref: form.address_ref,
          photos_url: uploadedUrl ? [uploadedUrl] : [] 
      };

      await api.post('/services/', payload);

      Alert.alert("¡Publicado! 🚀", "Tu servicio ya está visible con foto.", [
        { text: "Volver al Perfil", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error("Error creating service:", error);
      if (error.response?.data) {
        const serverErrors = error.response.data;
        if (serverErrors.detail) Alert.alert("Error", serverErrors.detail);
        // Mostrar errores específicos si el backend devuelve un objeto de errores
        else if (typeof serverErrors === 'object') {
             const firstKey = Object.keys(serverErrors)[0];
             Alert.alert("Error", `${firstKey}: ${serverErrors[firstKey]}`);
        }
        else Alert.alert("Error", "Revisa los datos ingresados.");
      } else {
        Alert.alert("Error", "No se pudo crear el servicio.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderizadores de Items para Modales Geográficos
  const renderRegionItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => { 
        setForm({...form, region: item.region, commune: ''}); 
        setSelectedRegionObj(item); 
        setShowRegionModal(false); 
    }}>
      <Text style={styles.modalItemText}>{item.region}</Text>
    </TouchableOpacity>
  );

  const renderComunaItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => { 
        setForm({...form, commune: item}); 
        setShowComunaModal(false); 
        clearError('commune');
    }}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Servicio 💼</Text>
        <Text style={styles.subtitle}>Define qué ofreces y cuánto cobras.</Text>
      </View>

      {/* AGREGADO: keyboardVerticalOffset para que el teclado no tape */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            <View style={styles.form}>
            
            {/* FOTO */}
            <View>
                <TouchableOpacity 
                    style={[styles.imagePicker, errors.image && styles.inputError]} 
                    onPress={handleSelectImage}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{fontSize: 40}}>📸</Text>
                            <Text style={styles.catText}>Toca para agregar foto</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.image && <Text style={[styles.errorText, {textAlign:'center'}]}>{errors.image}</Text>}
            </View>

            {/* TÍTULO */}
            <View>
                <Text style={styles.label}>Título del Anuncio</Text>
                <TextInput 
                    style={[styles.input, errors.title && styles.inputError]} 
                    placeholder="Ej: Paseo relajante por el parque" 
                    placeholderTextColor="#999" autoCapitalize="sentences"
                    value={form.title}
                    onChangeText={(t) => { setForm({...form, title: t}); clearError('title'); }}
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* CATEGORÍA CON VISUALIZACIÓN DE BLOQUEO */}
            <Text style={styles.label}>Tipo de Servicio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {CATEGORIES.map((cat) => {
                    const reqLevel = SERVICE_REQUIREMENTS[cat.value] || 1;
                    const isLocked = userLevelValue < reqLevel;

                    return (
                        <TouchableOpacity 
                            key={cat.value} 
                            style={[
                                styles.catBadge, 
                                form.category === cat.value && { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
                                isLocked && { backgroundColor: '#f0f0f0', borderColor: '#ddd', opacity: 0.7 }
                            ]}
                            onPress={() => handleCategorySelect(cat.value, cat.label)}
                        >
                            <Text style={[
                                styles.catText, 
                                form.category === cat.value ? { color: COLORS.white, fontWeight: 'bold' } : { color: COLORS.textDark },
                                isLocked && { color: '#999' }
                            ]}>
                                {cat.label} {isLocked && "🔒"}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* PRECIO */}
            <View>
                <Text style={styles.label}>Precio (CLP)</Text>
                <TextInput 
                    style={[styles.input, errors.price && styles.inputError]} 
                    placeholder="Ej: 5000" 
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                    value={form.price}
                    onChangeText={(t) => { setForm({...form, price: t}); clearError('price'); }}
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            {/* UBICACIÓN (NUEVO REQUERIDO) */}
            <View>
                <Text style={styles.label}>Ubicación del Servicio</Text>
                
                <TouchableOpacity style={[styles.selectBtn, {marginBottom: 10}]} onPress={() => setShowRegionModal(true)}>
                    <Text>{form.region || "Selecciona Región"}</Text>
                    <Text>▼</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.selectBtn, !form.region && {backgroundColor:'#f5f5f5'}, errors.commune && styles.inputError]} 
                    onPress={() => form.region && setShowComunaModal(true)} 
                    disabled={!form.region}
                >
                    <Text>{form.commune || "Selecciona Comuna"}</Text>
                    <Text>▼</Text>
                </TouchableOpacity>
                {errors.commune && <Text style={styles.errorText}>{errors.commune}</Text>}
            </View>

            <View>
                <Text style={styles.label}>Dirección Referencial</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ej: Cerca del metro Tobalaba" 
                    placeholderTextColor="#999"
                    value={form.address_ref} 
                    onChangeText={(t) => setForm({...form, address_ref: t})} 
                />
            </View>

            {/* DESCRIPCIÓN */}
            <View>
                <Text style={styles.label}>Descripción Detallada</Text>
                <TextInput 
                    style={[
                        styles.input, 
                        { height: 100, textAlignVertical: 'top' },
                        errors.description && styles.inputError
                    ]} 
                    multiline 
                    placeholder="Incluye recolección, paseo de 30 mins y agua..." 
                    placeholderTextColor="#999" autoCapitalize="sentences"
                    value={form.description}
                    onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            {/* SWITCH */}
            <View style={styles.switchRow}>
                <Text style={styles.label}>¿Visible inmediatamente?</Text>
                <Switch 
                    value={form.is_active} 
                    onValueChange={(v) => setForm({...form, is_active: v})} 
                    trackColor={{ false: "#ccc", true: "#a5d6a7" }}
                    thumbColor={form.is_active ? COLORS.secondary : "#f4f3f4"}
                />
            </View>

            {/* BOTÓN */}
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                {loading ? (
                <ActivityIndicator color={COLORS.white} />
                ) : (
                <Text style={styles.btnText}>✨ Publicar Servicio</Text>
                )}
            </TouchableOpacity>

            </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modales Geográficos */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><FlatList data={REGIONES_CHILE} keyExtractor={i=>i.region} renderItem={renderRegionItem}/></View></View>
      </Modal>
      <Modal visible={showComunaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><FlatList data={selectedRegionObj?.comunas || []} keyExtractor={i=>i} renderItem={renderComunaItem}/></View></View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 26, fontFamily: FONTS.bold, color: COLORS.textDark },
  subtitle: { color: COLORS.textLight, marginBottom: 10, fontSize: 14 },
  form: { gap: 15 },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 5 },
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
    color: '#000000' 
  },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  
  catBadge: { 
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#eee' 
  },
  catText: { fontFamily: FONTS.regular, fontSize: 14 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  btnPrimary: { 
    backgroundColor: COLORS.secondary, 
    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40, ...SHADOWS.card 
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  imagePicker: { 
    width: '100%', height: 180, backgroundColor: '#F8F9FA', borderRadius: 15, 
    marginBottom: 5, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', 
    borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD' 
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  // Estilos Modales
  selectBtn: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20, maxHeight: '70%' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
});

export default CreateServiceScreen;