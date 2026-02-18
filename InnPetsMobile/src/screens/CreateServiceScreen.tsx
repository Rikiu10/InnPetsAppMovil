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
import { REGIONES_CHILE } from '../constants/chile_data'; 

// === 1. CONFIGURACIÓN DE NIVELES Y REQUISITOS ===
const SERVICE_REQUIREMENTS: Record<string, number> = {
    'WALK': 1,        // Básico
    'GROOMING': 1,    // Básico
    'TRAINING': 1,    // Básico
    'OTHER': 1,       // Básico
    'DAYCARE': 2,     // Intermedio
    'BOARDING': 3,    // Avanzado
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
  
  // Estado de Errores
  const [errors, setErrors] = useState<any>({});
  
  // ✅ NUEVO: Estado para ganancia estimada (Transparencia)
  const [estimatedEarnings, setEstimatedEarnings] = useState<string | null>(null);

  // Modales Geográficos
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showComunaModal, setShowComunaModal] = useState(false);
  const [selectedRegionObj, setSelectedRegionObj] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'WALK', 
    charging_unit: 'PER_HOUR', // ✅ Default: Por Hora
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

  const clearError = (field: string) => {
     if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  // === 3. LÓGICA DE PRECIOS Y GANANCIA (NUEVO) ===
  const calculateEarnings = async (priceVal: string, currentCategory?: string) => {
      if (!priceVal || isNaN(parseFloat(priceVal))) {
          setEstimatedEarnings(null);
          return;
      }
      
      // Usamos la categoría actual o la del estado
      const catToSend = currentCategory || form.category;

      try {
          // Llamamos al nuevo endpoint del backend
          const res = await api.post('/payments/calculate/', { 
              price: parseFloat(priceVal), 
              quantity: 1,
              category: catToSend // Enviamos categoría para aplicar tasas específicas si existen
          });
          
          // El backend devuelve "provider_payout" (monto neto para el proveedor)
          const payout = res.data.provider_payout;
          
          // Formateamos a Peso Chileno
          setEstimatedEarnings(payout.toLocaleString('es-CL'));
      } catch (error) {
          console.log("Error calculando ganancia:", error);
      }
  };

  const handlePriceChange = (text: string) => {
      setForm({...form, price: text});
      clearError('price');
      
      // Calculamos solo si hay algo escrito (mayor a 2 dígitos para evitar spam)
      if (text.length > 2) {
          calculateEarnings(text);
      } else {
          setEstimatedEarnings(null);
      }
  };

  // === IMAGEN ===
  const handleSelectImage = () => {
    Alert.alert("Subir Foto", "Elige una opción", [
        { text: "📷 Tomar Foto", onPress: openCamera },
        { text: "🖼️ Abrir Galería", onPress: openGallery },
        { text: "Cancelar", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Error", "Sin permisos de cámara");
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Error", "Sin permisos de galería");
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // === SELECCIÓN DE CATEGORÍA ===
  const handleCategorySelect = (catValue: string, catLabel: string) => {
      const requiredLevel = SERVICE_REQUIREMENTS[catValue] || 1;

      if (userLevelValue < requiredLevel) {
          let msg = requiredLevel === 2 ? "Nivel Intermedio" : requiredLevel === 3 ? "Nivel Avanzado" : "Nivel Básico";
          Alert.alert("🔒 Categoría Bloqueada", `Para "${catLabel}" necesitas certificación de ${msg}.`);
          return;
      }
      setForm({ ...form, category: catValue });
      
      // Si ya hay precio, recalculamos porque la tasa pudo cambiar según categoría
      if (form.price.length > 2) {
          calculateEarnings(form.price, catValue);
      }
  };

  // === VALIDACIÓN Y CREACIÓN ===
  const validate = () => {
      let valid = true;
      let temp: any = {};
      if (!form.title) { temp.title = "El título es obligatorio"; valid = false; }
      if (!form.description) { temp.description = "La descripción es obligatoria"; valid = false; }
      if (!form.price) { temp.price = "Ingresa el precio"; valid = false; }
      else if (isNaN(parseFloat(form.price))) { temp.price = "Debe ser un número"; valid = false; }
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
          region: form.region,
          comuna: form.commune,
          address_ref: form.address_ref,
          photos_url: uploadedUrl ? [uploadedUrl] : [],
          
          // ✅ ENVIAMOS LA UNIDAD DE COBRO AL BACKEND
          charging_unit: form.charging_unit 
      };

      await api.post('/services/', payload);

      Alert.alert("¡Publicado! 🚀", "Tu servicio ya está visible.", [
        { text: "Volver al Perfil", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error("Error creating service:", error);
      if (error.response?.data?.detail) Alert.alert("Error", error.response.data.detail);
      else Alert.alert("Error", "No se pudo crear el servicio.");
    } finally {
      setLoading(false);
    }
  };

  // Renders de Modales
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

            {/* CATEGORÍA */}
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

            {/* ✅ SELECTOR DE MODALIDAD DE COBRO (NUEVO) */}
            <Text style={styles.label}>Modalidad de Cobro</Text>
            <View style={{flexDirection:'row', gap: 10, marginBottom: 15}}>
               <TouchableOpacity 
                   style={[styles.catBadge, form.charging_unit === 'PER_HOUR' && {backgroundColor: COLORS.secondary}]}
                   onPress={() => setForm({...form, charging_unit: 'PER_HOUR'})}
               >
                   <Text style={[styles.catText, form.charging_unit === 'PER_HOUR' && {color:'white', fontWeight:'bold'}]}>
                       ⏱️ Por Hora
                   </Text>
               </TouchableOpacity>
               
               <TouchableOpacity 
                   style={[styles.catBadge, form.charging_unit === 'PER_SERVICE' && {backgroundColor: COLORS.secondary}]}
                   onPress={() => setForm({...form, charging_unit: 'PER_SERVICE'})}
               >
                   <Text style={[styles.catText, form.charging_unit === 'PER_SERVICE' && {color:'white', fontWeight:'bold'}]}>
                       🏷️ Precio Fijo
                   </Text>
               </TouchableOpacity>
            </View>

            {/* PRECIO */}
            <View>
                <Text style={styles.label}>
                    Precio ({form.charging_unit === 'PER_HOUR' ? '$/hora' : '$/servicio'})
                </Text>
                <TextInput 
                    style={[styles.input, errors.price && styles.inputError]} 
                    placeholder="Ej: 5000" 
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                    value={form.price}
                    onChangeText={handlePriceChange} // Usamos el nuevo handler con cálculo
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            {/* ✅ TARJETA DE TRANSPARENCIA (NUEVO) */}
            {estimatedEarnings && (
               <View style={styles.earningsCard}>
                   <Text style={styles.earningsTitle}>💰 Ganancia Estimada</Text>
                   <Text style={styles.earningsValue}>${estimatedEarnings} CLP</Text>
                   <Text style={styles.earningsNote}>
                       * El cliente cubre la mayor parte de la comisión (Modelo 1/3 - 2/3). 
                       Este es el monto neto que recibirás.
                   </Text>
               </View>
            )}

            {/* UBICACIÓN */}
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

  // ✅ ESTILOS DE TRANSPARENCIA
  earningsCard: { 
      backgroundColor: '#E8F5E9', // Verde muy claro
      padding: 15, 
      borderRadius: 12, 
      marginBottom: 15, 
      borderWidth: 1, 
      borderColor: '#C8E6C9' 
  },
  earningsTitle: { 
      color: '#2E7D32', // Verde oscuro
      fontWeight: 'bold', 
      fontSize: 14, 
      marginBottom: 5 
  },
  earningsValue: { 
      color: '#1B5E20', // Verde más oscuro
      fontWeight: 'bold', 
      fontSize: 24 
  },
  earningsNote: { 
      color: '#4caf50', 
      fontSize: 11, 
      marginTop: 5, 
      fontStyle: 'italic' 
  }
});

export default CreateServiceScreen;