import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { authService } from '../services/api';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

// 👇 IMPORTS DE ARCHIVOS EXACTAMENTE COMO EN EL REGISTER
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '../services/fileService';
import { uploadImageToCloudinary } from '../services/imageService';

type Props = NativeStackScreenProps<RootStackParamList, 'ResubmitID'>;

// Reutilizamos el formateador de RUT para mantener la consistencia
const formatRut = (rut: string) => {
  let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (value.length <= 1) return value;
  const dv = value.slice(-1);
  const cuerpo = value.slice(0, -1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
};

const ResubmitIDScreen = ({ navigation, route }: Props) => {
  const { email, motivo } = route.params;
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);

  // ESTADOS PARA EL ARCHIVO
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [customFileName, setCustomFileName] = useState('');

  // --- LÓGICA DE SELECCIÓN DE ARCHIVOS (Igual que en Register) ---
  const handleSelectFile = () => {
      Alert.alert(
          "Verificar Identidad",
          "Sube una foto de tu Carnet o un documento PDF",
          [
              { text: "📷 Cámara", onPress: openCamera },
              { text: "🖼️ Galería", onPress: openGallery },
              { text: "📄 PDF", onPress: pickDocument },
              { text: "Cancelar", style: "cancel" }
          ]
      );
  };

  const openCamera = async () => {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!result.canceled) {
          const asset = result.assets[0];
          const name = `carnet_${Date.now()}.jpg`;
          setSelectedFile(asset);
          setFileType('image');
          setCustomFileName(name);
      }
  };

  const openGallery = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled) {
          const asset = result.assets[0];
          const name = asset.fileName || `carnet_${Date.now()}.jpg`;
          setSelectedFile(asset);
          setFileType('image');
          setCustomFileName(name);
      }
  };

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (!result.canceled && result.assets) {
            const file = result.assets[0];
            setSelectedFile(file);
            setFileType('pdf');
            setCustomFileName(file.name);
        }
    } catch (err) { console.log(err); }
  };

  const handleRutChange = (text: string) => {
      const formatted = formatRut(text);
      if (formatted.length <= 12) { 
          setRut(formatted);
      }
  };

  const handleSubmit = async () => {
    if (!rut || !selectedFile) {
      Alert.alert("Campos incompletos", "Debes ingresar tu nuevo RUT y adjuntar la foto de tu carnet.");
      return;
    }

    setLoading(true);
    try {
      let identificationUrl = null;

      // 1. SUBIR ARCHIVO A CLOUDINARY
      if (fileType === 'image') {
          identificationUrl = await uploadImageToCloudinary(selectedFile.uri);
      } else {
          identificationUrl = await uploadFileToCloudinary(
              selectedFile.uri, 
              customFileName, 
              selectedFile.mimeType || 'application/pdf'
          );
      }

      if (!identificationUrl) {
          throw new Error("Error al subir el archivo de identificación a la nube.");
      }

      // 2. ENVIAR APELACIÓN AL BACKEND
      await authService.appealID(email, rut, identificationUrl);
      
      Alert.alert(
        "¡Enviado con éxito! 🚀", 
        "Tus documentos han sido enviados a revisión. Te avisaremos cuando tu cuenta sea aprobada.",
        [{ text: "Volver al Login", onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message || "Hubo un problema enviando los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.content}>
            <Text style={{ fontSize: 50, textAlign: 'center', marginBottom: 10 }}>📄</Text>
            <Text style={styles.title}>Actualizar Documentos</Text>

            {/* 🔥 CUADRO DE ADVERTENCIA CON EL MOTIVO */}
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{motivo}</Text>
            </View>

            <View style={styles.card}>
              
              {/* RUT INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>RUT Corregido</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Ej: 12.345.678-9"
                  placeholderTextColor="#999"
                  value={rut}
                  onChangeText={handleRutChange}
                  autoCapitalize="characters"
                  keyboardType="visible-password"
                  autoCorrect={false}
                />
              </View>

              {/* UPLOAD CARNET */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nueva Foto del Carnet</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={handleSelectFile}>
                    {selectedFile ? (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <Text style={{fontSize: 24, marginRight: 10}}>{fileType === 'image' ? '🖼️' : '📄'}</Text>
                              <View style={{flex: 1}}>
                                  <Text style={{fontWeight: 'bold', color: COLORS.primary}}>Archivo Listo</Text>
                                  <Text style={{fontSize: 12, color: '#555'}} numberOfLines={1}>{customFileName}</Text>
                              </View>
                              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                  <Ionicons name="close-circle" size={24} color="red" />
                              </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <Ionicons name="camera-outline" size={30} color="#999" />
                            <Text style={{color: '#666', marginTop: 5}}>Toca para subir foto de tu carnet</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.helperText}>*Asegúrate de que la foto sea clara, con buena luz y sin recortes.</Text>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar a Revisión</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 25 }} onPress={() => navigation.navigate('Login')}>
                <Text style={{ textAlign: 'center', color: COLORS.textLight, fontFamily: FONTS.semiBold }}>Cancelar y volver</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24 },
  title: { fontSize: 26, fontFamily: FONTS.bold, color: COLORS.textDark, textAlign: 'center', marginBottom: 20 },
  warningBox: { backgroundColor: '#ffebee', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1.5, borderColor: '#ffcdd2' },
  warningText: { color: COLORS.danger, fontFamily: FONTS.semiBold, fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, padding: 24, borderRadius: 24, ...SHADOWS.card },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: FONTS.regular, color: '#000000', backgroundColor: '#ffffff' },
  uploadBtn: { backgroundColor: '#F0F8FF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', ...SHADOWS.card },
  helperText: { color: COLORS.textLight, fontSize: 12, marginTop: 5, fontFamily: FONTS.regular },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
});

export default ResubmitIDScreen;