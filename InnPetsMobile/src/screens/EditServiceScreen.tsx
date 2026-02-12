import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { servicesService } from '../services/api'; 
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/imageService';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { label: "Paseo", value: "WALK" },
  { label: "Alojamiento", value: "BOARDING" },
  { label: "Guardería", value: "DAYCARE" },
  { label: "Veterinaria", value: "VETERINARY" },
  { label: "Entrenamiento", value: "TRAINING" },
  { label: "Peluquería", value: "GROOMING" },
  { label: "Otro", value: "OTHER" },
];

const EditServiceScreen = ({ route, navigation }: any) => {
  const { service } = route.params;

  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Estado de errores
  const [errors, setErrors] = useState<any>({});
  
  // Estado del formulario
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'WALK', 
    is_active: true
  });

  // Pre-llenar datos al cargar
  useEffect(() => {
      // Configuramos el formulario con los datos recibidos
      setForm({
          title: service.title || '',
          description: service.description || '',
          price: service.price ? service.price.toString() : '',
          category: service.service_type || 'WALK',
          is_active: service.is_active !== undefined ? service.is_active : true
      });

      // Configuramos la imagen si existe
      // El backend puede enviar 'photos_url' (array) o 'image' (string directo)
      if (service.photos_url && service.photos_url.length > 0) {
          setImageUri(service.photos_url[0]);
      } else if (service.image) {
          setImageUri(service.image);
      }
  }, []);

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSelectImage = () => {
    Alert.alert(
      "Foto del Servicio",
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

  const validate = () => {
      let valid = true;
      let temp: any = {};

      if (!form.title) { temp.title = "El título es obligatorio"; valid = false; }
      if (!form.description) { temp.description = "La descripción es obligatoria"; valid = false; }
      
      if (!form.price) { temp.price = "Ingresa el precio"; valid = false; }
      else if (isNaN(parseFloat(form.price))) { temp.price = "Debe ser un número"; valid = false; }

      setErrors(temp);
      return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // A) Subir Imagen SOLO si es nueva (no http)
      let uploadedUrl = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
         const url = await uploadImageToCloudinary(imageUri);
         if (url) uploadedUrl = url;
      }

      // B) Preparar Payload
      const payload = {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          service_type: form.category,
          is_active: form.is_active,
          photos_url: uploadedUrl ? [uploadedUrl] : [] 
      };

      // C) Actualizar
      await servicesService.updateService(service.id, payload);

      Alert.alert("¡Actualizado! ✨", "Tu servicio ha sido modificado exitosamente.", [
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

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                    placeholder="Ej: Paseo relajante..." 
                    placeholderTextColor="#999" 
                    autoCapitalize="sentences"
                    value={form.title}
                    onChangeText={(t) => { setForm({...form, title: t}); clearError('title'); }}
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* CATEGORÍA */}
            <Text style={styles.label}>Tipo de Servicio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                    key={cat.value} 
                    style={[
                    styles.catBadge, 
                    form.category === cat.value && { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }
                    ]}
                    onPress={() => setForm({...form, category: cat.value})}
                >
                    <Text style={[
                    styles.catText, 
                    form.category === cat.value ? { color: COLORS.white, fontWeight: 'bold' } : { color: COLORS.textDark }
                    ]}>{cat.label}</Text>
                </TouchableOpacity>
                ))}
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
                    placeholder="Detalles del servicio..." 
                    placeholderTextColor="#999" 
                    autoCapitalize="sentences"
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
  
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
    color: '#000000' 
  },
  
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 1
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontFamily: FONTS.regular
  },
  
  catBadge: { 
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#eee' 
  },
  catText: { fontFamily: FONTS.regular, fontSize: 14 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  
  btnPrimary: { 
    backgroundColor: COLORS.secondary, 
    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, ...SHADOWS.card 
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },

  imagePicker: { 
    width: '100%', 
    height: 180, 
    backgroundColor: '#F8F9FA', 
    borderRadius: 15, 
    marginBottom: 5, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#DDD' 
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
});

export default EditServiceScreen;