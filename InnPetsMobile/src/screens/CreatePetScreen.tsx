import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  FlatList, 
  Switch,
  KeyboardAvoidingView, 
  Platform,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
// 👇 1. IMPORTAMOS IMAGE PICKER
import * as ImagePicker from 'expo-image-picker';
// Mantenemos uploadImageToCloudinary para subir la foto al final
import { uploadImageToCloudinary } from '../services/imageService';

const CreatePetScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<'CREATE' | 'LINK'>('CREATE');
  const [loading, setLoading] = useState(false);
  const [linkCode, setLinkCode] = useState('');

  // Datos de catálogos
  const [loadingData, setLoadingData] = useState(true);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [breedsList, setBreedsList] = useState<any[]>([]);
  const [filteredBreeds, setFilteredBreeds] = useState<any[]>([]);
  
  // Modales
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);

  // Estados
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObject, setDateObject] = useState(new Date()); 
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // Formulario
  const [form, setForm] = useState({
    name: '',
    selectedSpecies: null as any,
    selectedBreed: null as any,
    weight: '',
    color: '',
    medical_history: '',
    birth_date: '', 
    isFriendlyChildren: false,
    isFriendlyPets: false,
    isEnergetic: false,
    isSterilized: false,
    vaccinesUpToDate: false,
    behaviorNotes: ''
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const [speciesRes, breedsRes] = await Promise.all([
        api.get('/species/'),
        api.get('/breeds/')
      ]);
      setSpeciesList(speciesRes.data);
      setBreedsList(breedsRes.data);
    } catch (error) {
      console.log("Error catálogos:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectSpecies = (species: any) => {
    setForm({ ...form, selectedSpecies: species, selectedBreed: null });
    const filtered = breedsList.filter(b => b.species === species.id || b.species.id === species.id);
    setFilteredBreeds(filtered);
    setShowSpeciesModal(false);
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateObject;
    setShowDatePicker(false);
    setDateObject(currentDate);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    setForm({ ...form, birth_date: formattedDate });
  };

  // 👇 2. LOGICA DE CÁMARA Y GALERÍA (IGUAL QUE EN SERVICIOS)
  const handleSelectImage = () => {
    Alert.alert(
      "Foto de la Mascota",
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
      aspect: [1, 1], // Cuadrado para foto de perfil de mascota
      quality: 0.7,
    });
    if (!result.canceled) setLocalImageUri(result.assets[0].uri);
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
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setLocalImageUri(result.assets[0].uri);
  };

  // 💾 LOGICA CREAR
  const handleCreate = async () => {
    if (!form.name || !form.selectedBreed) {
      Alert.alert("Faltan datos", "El nombre y la raza son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      // 1. Subir Imagen a Cloudinary
      let uploadedUrl = "";
      if (localImageUri) {
         // Aquí podrías mostrar un loading específico si quieres
         const url = await uploadImageToCloudinary(localImageUri);
         if (url) uploadedUrl = url;
      }

      // 2. Preparar Payload
      const payload = {
        name: form.name,
        breed: form.selectedBreed.id,
        birth_date: form.birth_date || null,
        characteristics: {
            weight_kg: parseFloat(form.weight) || 0,
            color: form.color,
        },
        medical_history: form.medical_history,
        is_friendly_children: form.isFriendlyChildren,
        is_friendly_pets: form.isFriendlyPets,
        is_energetic: form.isEnergetic,
        is_sterilized: form.isSterilized,
        vaccines_up_to_date: form.vaccinesUpToDate,
        behavior_notes: form.behaviorNotes,
        
        photos_url: uploadedUrl ? [uploadedUrl] : []
      };

      // 3. Enviar al Backend
      await api.post('/pets/', payload);
      
      Alert.alert("¡Éxito! 🐾", "Mascota registrada correctamente.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo registrar la mascota.");
    } finally {
      setLoading(false);
    }
  };

  // LOGICA VINCULAR
  const handleLink = async () => {
    if (linkCode.length < 4) { Alert.alert("Error", "Código muy corto."); return; }
    setLoading(true);
    try {
        const res = await api.post('/pets/link-pet/', { code: linkCode });
        Alert.alert("¡Vinculado!", res.data.message, [{ text: "Ver mis mascotas", onPress: () => navigation.navigate('Main', {screen: 'Perfil'}) }]);
    } catch (error: any) {
        Alert.alert("Error", error.response?.data?.error || "Código no encontrado.");
    } finally {
        setLoading(false);
    }
  };

  const renderModalItem = (item: any, onPress: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onPress}>
        <Text style={styles.modalItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const SwitchRow = ({ label, value, onValueChange }: any) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        trackColor={{ false: "#767577", true: COLORS.primaryLight }}
        thumbColor={value ? COLORS.primary : "#f4f3f4"}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Gestionar Mascota</Text>
            <View style={{width: 24}} /> 
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, mode === 'CREATE' && styles.activeTab]} onPress={() => setMode('CREATE')}>
                <Text style={[styles.tabText, mode === 'CREATE' && styles.activeTabText]}>Registrar Nueva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'LINK' && styles.activeTab]} onPress={() => setMode('LINK')}>
                <Text style={[styles.tabText, mode === 'LINK' && styles.activeTabText]}>Vincular Código</Text>
            </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView 
                contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                
                {mode === 'CREATE' ? (
                     <View style={styles.form}>
                        <Text style={styles.sectionHelp}>Registra una mascota que no tiene perfil aún.</Text>

                        {/* 📸 SECCIÓN DE FOTO */}
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            {/* 👇 3. AQUI LLAMAMOS A LA NUEVA FUNCION */}
                            <TouchableOpacity onPress={handleSelectImage} style={styles.imagePickerBtn}>
                                {localImageUri ? (
                                    <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 40 }}>📸</Text>
                                        <Text style={styles.imagePickerText}>Subir Foto</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.sectionTitle}>Datos Básicos</Text>
                        
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej: Max" 
                            placeholderTextColor="#999" 
                            autoCapitalize="words"
                            value={form.name}
                            onChangeText={t=>setForm({...form, name: t})}
                        />
                        
                        <Text style={styles.label}>Especie</Text>
                        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowSpeciesModal(true)}>
                             <Text style={{color: form.selectedSpecies ? '#000' : '#999'}}>
                                {form.selectedSpecies?.name || "Seleccionar..."}
                             </Text>
                             <Text style={{ color: '#000' }}>▼</Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>Raza</Text>
                        <TouchableOpacity style={styles.selectBtn} onPress={() => form.selectedSpecies ? setShowBreedModal(true) : null}>
                             <Text style={{color: form.selectedBreed ? '#000' : '#999'}}>
                                {form.selectedBreed?.name || (form.selectedSpecies ? "Seleccionar..." : "Primero elige especie")}
                             </Text>
                             <Text style={{ color: '#000' }}>▼</Text>
                        </TouchableOpacity>

                        <View style={{flexDirection: 'row', gap: 10}}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Ej: 15.5" 
                                    placeholderTextColor="#999" 
                                    keyboardType="numeric"
                                    value={form.weight}
                                    onChangeText={t=>setForm({...form, weight: t})}
                                />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Ej: Café" 
                                    placeholderTextColor="#999" 
                                    autoCapitalize="words"
                                    value={form.color}
                                    onChangeText={t=>setForm({...form, color: t})}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Fecha Nacimiento (Opcional)</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.selectBtn}>
                             <Text style={{ color: form.birth_date ? '#000' : '#999' }}>
                                {form.birth_date ? form.birth_date : "Seleccionar fecha 📅"}
                             </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={dateObject}
                                mode="date"
                                display="default"
                                onChange={onChangeDate}
                                maximumDate={new Date()} 
                            />
                        )}

                        <View style={styles.separator} />
                        <Text style={styles.sectionTitle}>Perfil de Comportamiento 📋</Text>

                        <SwitchRow label="¿Se lleva bien con niños? 👶" value={form.isFriendlyChildren} onValueChange={(v: boolean) => setForm({...form, isFriendlyChildren: v})} />
                        <SwitchRow label="¿Se lleva bien con otras mascotas? 🐕" value={form.isFriendlyPets} onValueChange={(v: boolean) => setForm({...form, isFriendlyPets: v})} />
                        <SwitchRow label="¿Tiene mucha energía? ⚡" value={form.isEnergetic} onValueChange={(v: boolean) => setForm({...form, isEnergetic: v})} />
                        <SwitchRow label="¿Está esterilizado/castrado? 🏥" value={form.isSterilized} onValueChange={(v: boolean) => setForm({...form, isSterilized: v})} />
                        <SwitchRow label="¿Vacunas al día? 💉" value={form.vaccinesUpToDate} onValueChange={(v: boolean) => setForm({...form, vaccinesUpToDate: v})} />

                        <Text style={styles.label}>Notas adicionales / Historial Médico</Text>
                        <TextInput 
                            style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                            multiline 
                            placeholder="Alergias, miedos, cuidados..." 
                            placeholderTextColor="#999" 
                            autoCapitalize="sentences"
                            value={form.behaviorNotes}
                            onChangeText={t=>setForm({...form, medical_history: t, behaviorNotes: t})}
                        />

                        <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Guardar y Generar Código</Text>}
                        </TouchableOpacity>
                     </View>
                ) : (
                     // MODO VINCULAR
                     <View style={styles.linkContainer}>
                        <Text style={{fontSize: 50, marginBottom: 20}}>🔗</Text>
                        <Text style={styles.title}>¿Mascota compartida?</Text>
                        <Text style={styles.subtitle}>Ingresa el código único de la mascota para gestionarla.</Text>
                        <TextInput 
                            style={[styles.input, styles.codeInput]} placeholder="EJ: X9J2K" placeholderTextColor="#ccc" autoCapitalize="characters" 
                            value={linkCode} onChangeText={setLinkCode}
                        />
                        <TouchableOpacity style={styles.btnSecondary} onPress={handleLink} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Vincular Mascota</Text>}
                        </TouchableOpacity>
                     </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Modales */}
        <Modal visible={showSpeciesModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Especies</Text>
                    <FlatList data={speciesList} keyExtractor={i=>i.id.toString()} renderItem={({item})=>renderModalItem(item, ()=>handleSelectSpecies(item))}/>
                    <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowSpeciesModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
        
        <Modal visible={showBreedModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Razas</Text>
                    <FlatList data={filteredBreeds} keyExtractor={i=>i.id.toString()} renderItem={({item})=>renderModalItem(item, ()=>{setForm({...form, selectedBreed: item}); setShowBreedModal(false)})}/>
                    <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowBreedModal(false)}><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#eee' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bold, color: '#ccc' },
  activeTabText: { color: COLORS.primary },
  form: { gap: 15 },
  linkContainer: { alignItems: 'center', marginTop: 40, padding: 20, backgroundColor: COLORS.white, borderRadius: 20, ...SHADOWS.card },
  title: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  subtitle: { textAlign: 'center', color: COLORS.textLight, marginVertical: 15 },
  sectionHelp: { color: COLORS.textLight, marginBottom: 10, fontSize: 13 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, marginTop: 10, marginBottom: 5, color: COLORS.textDark },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  label: { fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 5 },
  
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee', 
    width: '100%',
    color: '#000000' 
  },
  selectBtn: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee', 
    flexDirection:'row', 
    justifyContent:'space-between' 
  },
  codeInput: { 
    textAlign: 'center', 
    fontSize: 24, 
    letterSpacing: 5, 
    fontFamily: FONTS.bold, 
    textTransform: 'uppercase', 
    borderColor: COLORS.primary, 
    borderWidth: 2,
    color: '#000000'
  },
  
  imagePickerBtn: {
    width: 140,
    height: 140,
    backgroundColor: '#f9f9f9',
    borderRadius: 70, 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    marginBottom: 5,
    borderStyle: 'dashed' 
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    marginTop: 5,
    fontSize: 12
  },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10
  },
  switchLabel: { fontSize: 16, color: COLORS.textDark, flex: 1 },

  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, width: '100%' },
  btnSecondary: { backgroundColor: COLORS.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, width: '100%' },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:10, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default CreatePetScreen;