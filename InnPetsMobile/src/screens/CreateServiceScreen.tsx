import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import * as ImagePicker from 'expo-image-picker';
// 👇 1. IMPORTANTE: TRAEMOS LA FUNCIÓN DE SUBIDA (Igual que en Mascotas)
import { uploadImageToCloudinary } from '../services/imageService';

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
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'WALK', 
    is_active: true
  });

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

  // 👇 2. LOGICA CORREGIDA (Igual que Mascotas)
  const handleCreate = async () => {
    if (!form.title || !form.description || !form.price) {
      Alert.alert("Faltan datos", "Por favor completa título, descripción y precio.");
      return;
    }

    setLoading(true);
    try {
      // A) PRIMERO SUBIMOS LA IMAGEN A CLOUDINARY (Si existe)
      let uploadedUrl = "";
      if (imageUri) {
         const url = await uploadImageToCloudinary(imageUri);
         if (url) uploadedUrl = url;
      }

      // B) PREPARAMOS EL JSON (Ya no FormData)
      // Esto coincide con lo que tu base de datos espera: un array de strings en photos_url
      const payload = {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price), // Aseguramos que sea número
          service_type: form.category,
          is_active: form.is_active,
          // 👇 Aquí mandamos la URL como lista, igual que en Pets
          photos_url: uploadedUrl ? [uploadedUrl] : [] 
      };

      // C) ENVIAMOS JSON LIMPIO
      await api.post('/services/', payload);

      Alert.alert("¡Publicado! 🚀", "Tu servicio ya está visible con foto.", [
        { text: "Volver al Perfil", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error("Error creating service:", error);
      if (error.response?.data) {
        Alert.alert("Error", JSON.stringify(error.response.data));
      } else {
        Alert.alert("Error", "No se pudo crear el servicio.");
      }
    } finally {
      setLoading(false);
    }
  };

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
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            <View style={styles.form}>
            
            {/* FOTO */}
            <TouchableOpacity style={styles.imagePicker} onPress={handleSelectImage}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{fontSize: 40}}>📸</Text>
                        <Text style={styles.catText}>Toca para agregar foto</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* TÍTULO */}
            <Text style={styles.label}>Título del Anuncio</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ej: Paseo relajante por el parque" 
                placeholderTextColor="#999" autoCapitalize="sentences"
                onChangeText={(t) => setForm({...form, title: t})}
            />

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
            <Text style={styles.label}>Precio (CLP)</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ej: 5000" 
                keyboardType="numeric"
                placeholderTextColor="#999"
                onChangeText={(t) => setForm({...form, price: t})}
            />

            {/* DESCRIPCIÓN */}
            <Text style={styles.label}>Descripción Detallada</Text>
            <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                multiline 
                placeholder="Incluye recolección, paseo de 30 mins y agua..." 
                placeholderTextColor="#999" autoCapitalize="sentences"
                onChangeText={(t) => setForm({...form, description: t})}
            />

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
    marginBottom: 10, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#DDD' 
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
});

export default CreateServiceScreen;