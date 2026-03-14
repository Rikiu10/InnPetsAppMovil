import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api'; 
import { uploadImageToCloudinary } from '../services/imageService';

const ApplyFoundationScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [documentUri, setDocumentUri] = useState<string | null>(null);

  const [form, setForm] = useState({
    foundation_name: '',
    legal_rut: '',
    description: '',
    contact_email: '',
    contact_phone: '',
  });

  const [errors, setErrors] = useState<any>({});

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleDocumentAction = () => {
    Alert.alert(
        "Documento Legal",
        "Sube una foto del documento constitutivo o algo que acredite a la fundación.",
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
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
      if (!result.canceled) {
          setDocumentUri(result.assets[0].uri);
          clearError('document');
      }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Permiso necesario.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) {
        setDocumentUri(result.assets[0].uri);
        clearError('document');
    }
  };

  const validate = () => {
      let valid = true;
      let temp: any = {};
      
      if (!form.foundation_name) { temp.foundation_name = "El nombre es obligatorio"; valid = false; }
      if (!form.legal_rut) { temp.legal_rut = "El RUT es obligatorio"; valid = false; }
      if (!form.contact_email) { temp.contact_email = "El correo de contacto es obligatorio"; valid = false; }
      if (!form.description) { temp.description = "Cuéntanos sobre la misión de la fundación"; valid = false; }
      if (!documentUri) { temp.document = "Debes subir un documento o foto de respaldo"; valid = false; }

      setErrors(temp);
      return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let uploadedUrl = "";
      if (documentUri) {
         const url = await uploadImageToCloudinary(documentUri);
         if (url) uploadedUrl = url;
      }

      const payload = {
          foundation_name: form.foundation_name,
          legal_rut: form.legal_rut,
          description: form.description,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          document_url: uploadedUrl
      };

      // Llamamos al nuevo endpoint que creaste en el backend
      await api.post('/foundations/apply/', payload);

      Alert.alert(
          "¡Solicitud Enviada! 🏢", 
          "Hemos recibido los datos de tu fundación. Nuestro equipo la revisará y te notificaremos cuando sea aprobada.", 
          [{ text: "Entendido", onPress: () => navigation.navigate('Inicio') }]
      );
      
    } catch (error) {
      console.error("Error enviando solicitud:", error);
      Alert.alert("Error", "Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.");
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
        <Text style={styles.headerTitle}>Registrar Fundación</Text>
        <View style={{width: 40}}/> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            
            <View style={styles.infoAlertBox}>
                <Ionicons name="information-circle-outline" size={24} color="#1565C0" style={{marginRight: 10}} />
                <Text style={styles.infoAlertText}>
                    Toda fundación debe ser aprobada por la administración de InnPets. Tu información será verificada para garantizar la seguridad de la red de rescate.
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Nombre de la Fundación *</Text>
                <TextInput 
                    style={[styles.input, errors.foundation_name && styles.inputError]} 
                    placeholder="Ej: Rescate Animal Chile" 
                    placeholderTextColor="#999"
                    value={form.foundation_name}
                    onChangeText={(t) => { setForm({...form, foundation_name: t}); clearError('foundation_name'); }}
                />
                {errors.foundation_name && <Text style={styles.errorText}>{errors.foundation_name}</Text>}

                <Text style={[styles.label, {marginTop: 15}]}>RUT Legal de la Fundación *</Text>
                <TextInput 
                    style={[styles.input, errors.legal_rut && styles.inputError]} 
                    placeholder="Ej: 65.123.456-7" 
                    placeholderTextColor="#999"
                    value={form.legal_rut}
                    onChangeText={(t) => { setForm({...form, legal_rut: t}); clearError('legal_rut'); }}
                />
                {errors.legal_rut && <Text style={styles.errorText}>{errors.legal_rut}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Correo de Contacto *</Text>
                <TextInput 
                    style={[styles.input, errors.contact_email && styles.inputError]} 
                    placeholder="contacto@fundacion.cl" 
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.contact_email}
                    onChangeText={(t) => { setForm({...form, contact_email: t}); clearError('contact_email'); }}
                />
                {errors.contact_email && <Text style={styles.errorText}>{errors.contact_email}</Text>}

                <Text style={[styles.label, {marginTop: 15}]}>Teléfono (Opcional)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="+56 9 1234 5678" 
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={form.contact_phone}
                    onChangeText={(t) => setForm({...form, contact_phone: t})}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Misión y Descripción *</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.description && styles.inputError]} 
                    multiline 
                    placeholder="Cuéntanos a qué se dedica la fundación, qué animales rescatan, etc." 
                    placeholderTextColor="#999"
                    value={form.description}
                    onChangeText={(t) => { setForm({...form, description: t}); clearError('description'); }}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Documento de Respaldo *</Text>
                <Text style={{color: '#666', fontSize: 12, marginBottom: 10}}>Sube una imagen del certificado de constitución, personalidad jurídica o documento válido.</Text>
                <TouchableOpacity style={[styles.imagePicker, errors.document && styles.inputError]} onPress={handleDocumentAction}>
                    {documentUri ? (
                        <Image source={{ uri: documentUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="document-text-outline" size={40} color={COLORS.primary} />
                            <Text style={{color: COLORS.primary, marginTop: 8, fontFamily: FONTS.semiBold}}>Subir Documento</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.document && <Text style={styles.errorText}>{errors.document}</Text>}
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Enviar Solicitud</Text>}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.card },
  backBtn: { padding: 8, backgroundColor: '#F0F0F0', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  infoAlertBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
  infoAlertText: { flex: 1, fontSize: 13, color: '#1565C0', fontFamily: FONTS.regular, lineHeight: 18 },

  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, marginBottom: 15, ...SHADOWS.card },
  label: { fontFamily: FONTS.semiBold, color: COLORS.textDark, marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', fontFamily: FONTS.regular, color: COLORS.textDark },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  
  imagePicker: { width: '100%', height: 150, backgroundColor: '#F8F9FA', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E0E0E0', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 40, ...SHADOWS.card },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
});

export default ApplyFoundationScreen;