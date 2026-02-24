import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api, { servicesService } from '../services/api'; 
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/imageService';
import { ServiceCategory } from '../types';

const USER_LEVELS: Record<string, number> = { 'NONE': 0, 'GREEN': 1, 'YELLOW': 2, 'RED': 3 };
const CAT_LEVELS: Record<string, number> = { 'NONE': 0, 'VERDE': 1, 'AMARILLO': 2, 'ROJO': 3 };

const EditServiceScreen = ({ route, navigation }: any) => {
  const { service } = route.params;

  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Estados Dinámicos
  const [dynamicCategories, setDynamicCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [userLevelValue, setUserLevelValue] = useState(0); 
  
  const [errors, setErrors] = useState<any>({});
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '', 
    charging_unit: 'PER_SERVICE',
    is_active: true
  });

  useEffect(() => {
      // 1. Extraer ID de la categoría (puede venir el objeto anidado o un string/number)
      let initialCategory = '';
      if (typeof service.category === 'object' && service.category !== null) {
          initialCategory = service.category.id.toString();
      } else if (service.category) {
          initialCategory = service.category.toString();
      } else if (service.service_type) {
          initialCategory = service.service_type.toString();
      }

      setForm({
          title: service.title || '',
          description: service.description || '',
          price: service.price ? service.price.toString() : '',
          category: initialCategory,
          charging_unit: service.charging_unit || 'PER_SERVICE',
          is_active: service.is_active !== undefined ? service.is_active : true
      });

      if (service.photos_url && service.photos_url.length > 0) {
          setImageUri(service.photos_url[0]);
      } else if (service.image) {
          setImageUri(service.image);
      }

      // Cargar Catálogos
      fetchUserLevel();
      fetchCategories();
  }, []);

  const fetchUserLevel = async () => {
    try {
        const res = await api.get('/certifications/');
        const approvedCert = res.data.find((c: any) => c.status === 'APPROVED');
        const level = approvedCert ? approvedCert.level : 'NONE';
        setUserLevelValue(USER_LEVELS[level] || 0);
    } catch (error) {
        setUserLevelValue(0);
    }
  };

  const fetchCategories = async () => {
    try {
        const res = await api.get('/service-categories/');
        setDynamicCategories(res.data);
    } catch (error) {
        console.log("Error cargando categorías", error);
    } finally {
        setLoadingCategories(false);
    }
  };

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSelectImage = () => {
    Alert.alert("Foto del Servicio", "Elige una opción", [
        { text: "📷 Tomar Foto", onPress: openCamera },
        { text: "🖼️ Abrir Galería", onPress: openGallery },
        { text: "Cancelar", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Error", "Permisos requeridos");
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Error", "Permisos requeridos");
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleCategorySelect = (cat: ServiceCategory) => {
    const requiredLevel = CAT_LEVELS[cat.minimum_level] || 0;
    if (userLevelValue < requiredLevel) {
        let msg = cat.minimum_level === 'ROJO' ? "Avanzado" : cat.minimum_level === 'AMARILLO' ? "Intermedio" : "Básico";
        Alert.alert("🔒 Bloqueado", `Para cambiar a "${cat.name}" necesitas nivel ${msg}.`);
        return;
    }
    setForm({ ...form, category: cat.id.toString() });
    clearError('category');
  };

  const validate = () => {
      let valid = true;
      let temp: any = {};
      if (!form.title) { temp.title = "Obligatorio"; valid = false; }
      if (!form.description) { temp.description = "Obligatoria"; valid = false; }
      if (!form.price) { temp.price = "Requerido"; valid = false; }
      else if (isNaN(parseFloat(form.price))) { temp.price = "Número inválido"; valid = false; }
      setErrors(temp);
      return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      let uploadedUrl = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
         const url = await uploadImageToCloudinary(imageUri);
         if (url) uploadedUrl = url;
      }

      const payload = {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          category: form.category, // 🔥 Dinámico
          charging_unit: form.charging_unit, // 🔥 Modalidad
          is_active: form.is_active,
          photos_url: uploadedUrl ? [uploadedUrl] : [] 
      };

      await servicesService.updateService(service.id, payload);

      Alert.alert("¡Actualizado! ✨", "Tu servicio ha sido modificado.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error("Error updating service:", error);
      Alert.alert("Error", "No se pudo actualizar el servicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Servicio ✏️</Text>
        <View style={{width: 24}}/> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.form}>
            
            {/* FOTO */}
            <View>
                <TouchableOpacity style={[styles.imagePicker, errors.image && styles.inputError]} onPress={handleSelectImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{fontSize: 40}}>📸</Text>
                            <Text style={styles.catText}>Toca para agregar foto</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* TÍTULO */}
            <View>
                <Text style={styles.label}>Título del Anuncio</Text>
                <TextInput 
                    style={[styles.input, errors.title && styles.inputError]} 
                    placeholder="Ej: Paseo relajante..." 
                    placeholderTextColor="#999" autoCapitalize="sentences"
                    value={form.title}
                    onChangeText={(t) => { setForm({...form, title: t}); clearError('title'); }}
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* CATEGORÍA DINÁMICA */}
            <View>
                <Text style={styles.label}>Tipo de Servicio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 5 }}>
                    {loadingCategories ? (
                        <ActivityIndicator color={COLORS.primary} style={{ margin: 10 }} />
                    ) : (
                        dynamicCategories.map((cat) => {
                            const reqLevel = CAT_LEVELS[cat.minimum_level] || 0;
                            const isLocked = userLevelValue < reqLevel;

                            return (
                                <TouchableOpacity 
                                    key={cat.id} 
                                    style={[
                                        styles.catBadge, 
                                        form.category === cat.id.toString() && { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
                                        isLocked && { backgroundColor: '#f0f0f0', borderColor: '#ddd', opacity: 0.7 }
                                    ]}
                                    onPress={() => handleCategorySelect(cat)}
                                >
                                    <Text style={[
                                        styles.catText, 
                                        form.category === cat.id.toString() ? { color: COLORS.white, fontWeight: 'bold' } : { color: COLORS.textDark },
                                        isLocked && { color: '#999' }
                                    ]}>
                                        {cat.name} {isLocked && "🔒"}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>

            {/* UNIDAD DE COBRO */}
            <Text style={styles.label}>Modalidad de Cobro</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {[
                  { id: 'PER_HOUR', label: '⏱️ Por Hora' },
                  { id: 'PER_SERVICE', label: '🏷️ Por Servicio' },
                  { id: 'PER_NIGHT', label: '🌙 Por Noche' },
                  { id: 'PER_VISIT', label: '🚶 Por Visita' }
                ].map(unit => (
                   <TouchableOpacity 
                       key={unit.id}
                       style={[styles.catBadge, form.charging_unit === unit.id && {backgroundColor: COLORS.secondary}]}
                       onPress={() => setForm({...form, charging_unit: unit.id})}
                   >
                       <Text style={[styles.catText, form.charging_unit === unit.id && {color:'white', fontWeight:'bold'}]}>
                           {unit.label}
                       </Text>
                   </TouchableOpacity>
                ))}
            </ScrollView>

            {/* PRECIO */}
            <View>
                <Text style={styles.label}>Precio (CLP)</Text>
                <TextInput 
                    style={[styles.input, errors.price && styles.inputError]} 
                    keyboardType="numeric" placeholderTextColor="#999"
                    value={form.price}
                    onChangeText={(t) => { setForm({...form, price: t}); clearError('price'); }}
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            {/* DESCRIPCIÓN */}
            <View>
                <Text style={styles.label}>Descripción Detallada</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.description && styles.inputError]} 
                    multiline placeholderTextColor="#999" autoCapitalize="sentences"
                    value={form.description}
                    onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            {/* SWITCH */}
            <View style={styles.switchRow}>
                <Text style={styles.label}>¿Visible al público?</Text>
                <Switch 
                    value={form.is_active} 
                    onValueChange={(v) => setForm({...form, is_active: v})} 
                    trackColor={{ false: "#ccc", true: "#a5d6a7" }}
                    thumbColor={form.is_active ? COLORS.secondary : "#f4f3f4"}
                />
            </View>

            {/* BOTÓN */}
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
                {saving ? (
                <ActivityIndicator color={COLORS.white} />
                ) : (
                <Text style={styles.btnText}>Guardar Cambios</Text>
                )}
            </TouchableOpacity>

            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
  form: { gap: 15 },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 5 },
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', color: '#000000' },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  catBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 5 },
  catText: { fontFamily: FONTS.regular, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  btnPrimary: { backgroundColor: COLORS.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  imagePicker: { width: '100%', height: 180, backgroundColor: '#F8F9FA', borderRadius: 15, marginBottom: 5, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
});

export default EditServiceScreen;