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
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/imageService';

const CreatePetScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<'CREATE' | 'LINK'>('CREATE');
  const [loading, setLoading] = useState(false);
  const [linkCode, setLinkCode] = useState('');

  const [errors, setErrors] = useState<any>({});

  // Datos de catálogos
  const [loadingData, setLoadingData] = useState(true);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [breedsList, setBreedsList] = useState<any[]>([]);
  const [filteredBreeds, setFilteredBreeds] = useState<any[]>([]);
  
  // 🔥 NUEVO: Preguntas dinámicas del backend
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  
  // Modales
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);

  // Estados
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObject, setDateObject] = useState(new Date()); 
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // Formulario (Sin los booleanos viejos)
  const [form, setForm] = useState({
    name: '',
    selectedSpecies: null as any,
    selectedBreed: null as any,
    weight: '',
    color: '',
    medical_history: '',
    birth_date: '', 
    behaviorNotes: '',
    // 🔥 Aquí guardaremos las respuestas dinámicas
    behaviorAnswers: {} as Record<string, boolean>
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      // 🔥 Agregamos la llamada a behavior-questions
      const [speciesRes, breedsRes, questionsRes] = await Promise.all([
        api.get('/species/'),
        api.get('/breeds/'),
        api.get('/behavior-questions/') 
      ]);
      setSpeciesList(speciesRes.data);
      setBreedsList(breedsRes.data);
      
      // Guardamos las preguntas y preparamos el estado inicial (todas en false)
      const questions = questionsRes.data;
      setDynamicQuestions(questions);
      
      let initialAnswers: Record<string, boolean> = {};
      questions.forEach((q: any) => {
          initialAnswers[q.question_text] = false;
      });
      setForm(prev => ({ ...prev, behaviorAnswers: initialAnswers }));

    } catch (error) {
      console.log("Error catálogos:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSelectSpecies = (species: any) => {
    setForm({ ...form, selectedSpecies: species, selectedBreed: null });
    const filtered = breedsList.filter(b => b.species === species.id || b.species.id === species.id);
    setFilteredBreeds(filtered);
    setShowSpeciesModal(false);
    clearError('species');
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

  const handleSelectImage = () => {
    Alert.alert("Foto de la Mascota", "Elige una opción", [
        { text: "📷 Tomar Foto", onPress: openCamera },
        { text: "🖼️ Abrir Galería", onPress: openGallery },
        { text: "Cancelar", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Permiso denegado", "Necesitas dar permiso para usar la cámara.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) { setLocalImageUri(result.assets[0].uri); clearError('image'); }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) { setLocalImageUri(result.assets[0].uri); clearError('image'); }
  };

  const validate = () => {
    let valid = true;
    let temp: any = {};
    if (!localImageUri) { temp.image = "Sube una foto de tu mascota"; valid = false; }
    if (!form.name) { temp.name = "El nombre es obligatorio"; valid = false; }
    if (!form.selectedSpecies) { temp.species = "Selecciona especie"; valid = false; }
    if (!form.selectedBreed) { temp.breed = "Selecciona raza"; valid = false; }
    if (!form.weight) { temp.weight = "Ingresa el peso"; valid = false; }
    else if (isNaN(parseFloat(form.weight))) { temp.weight = "Debe ser número"; valid = false; }
    if (!form.color) { temp.color = "Indica el color"; valid = false; }
    setErrors(temp);
    return valid;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let uploadedUrl = "";
      if (localImageUri) {
         const url = await uploadImageToCloudinary(localImageUri);
         if (url) uploadedUrl = url;
      }

      // 🔥 AQUÍ ENVIAMOS EL JSON DINÁMICO
      const payload = {
        name: form.name,
        breed: form.selectedBreed.id,
        birth_date: form.birth_date || null,
        characteristics: {
            weight_kg: parseFloat(form.weight) || 0,
            color: form.color,
        },
        medical_history: form.medical_history,
        behavior_notes: form.behaviorNotes,
        behavior_answers: form.behaviorAnswers, // Enviamos las respuestas dinámicas
        photos_url: uploadedUrl ? [uploadedUrl] : []
      };

      await api.post('/pets/', payload);
      Alert.alert("¡Éxito! 🐾", "Mascota registrada correctamente.", [{ text: "OK", onPress: () => navigation.goBack() }]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo registrar la mascota.");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!linkCode || linkCode.length < 4) { setErrors({ code: "El código debe tener al menos 4 caracteres" }); return; }
    setLoading(true);
    try {
        const res = await api.post('/pets/link-pet/', { code: linkCode });
        Alert.alert("¡Vinculado!", res.data.message, [{ text: "Ver mis mascotas", onPress: () => navigation.navigate('Main', {screen: 'Perfil'}) }]);
    } catch (error: any) {
        const msg = error.response?.data?.error || "Código no encontrado.";
        setErrors({ code: msg });
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
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Gestionar Mascota</Text>
            <View style={{width: 24}} /> 
        </View>

        <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, mode === 'CREATE' && styles.activeTab]} onPress={() => {setMode('CREATE'); setErrors({});}}>
                <Text style={[styles.tabText, mode === 'CREATE' && styles.activeTabText]}>Registrar Nueva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'LINK' && styles.activeTab]} onPress={() => {setMode('LINK'); setErrors({});}}>
                <Text style={[styles.tabText, mode === 'LINK' && styles.activeTabText]}>Vincular Código</Text>
            </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {mode === 'CREATE' ? (
                      <View style={styles.form}>
                        <Text style={styles.sectionHelp}>Registra una mascota que no tiene perfil aún.</Text>

                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            <TouchableOpacity onPress={handleSelectImage} style={[styles.imagePickerBtn, errors.image && styles.imagePickerError]}>
                                {localImageUri ? <Image source={{ uri: localImageUri }} style={styles.imagePreview} /> : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 40 }}>📸</Text>
                                        <Text style={styles.imagePickerText}>Subir Foto</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
                        </View>
                        
                        <Text style={styles.sectionTitle}>Datos Básicos</Text>
                        
                        <View>
                            <Text style={styles.label}>Nombre</Text>
                            <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Ej: Max" placeholderTextColor="#999" autoCapitalize="words" value={form.name} onChangeText={t=>{ setForm({...form, name: t}); clearError('name'); }}/>
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>
                        
                        <View>
                            <Text style={styles.label}>Especie</Text>
                            <TouchableOpacity style={[styles.selectBtn, errors.species && styles.inputError]} onPress={() => setShowSpeciesModal(true)}>
                                <Text style={{color: form.selectedSpecies ? '#000' : '#999'}}>{form.selectedSpecies?.name || "Seleccionar..."}</Text>
                                <Text style={{ color: '#000' }}>▼</Text>
                            </TouchableOpacity>
                            {errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
                        </View>

                        <View>
                            <Text style={styles.label}>Raza</Text>
                            <TouchableOpacity style={[styles.selectBtn, errors.breed && styles.inputError]} onPress={() => form.selectedSpecies ? setShowBreedModal(true) : null}>
                                <Text style={{color: form.selectedBreed ? '#000' : '#999'}}>{form.selectedBreed?.name || (form.selectedSpecies ? "Seleccionar..." : "Primero elige especie")}</Text>
                                <Text style={{ color: '#000' }}>▼</Text>
                            </TouchableOpacity>
                            {errors.breed && <Text style={styles.errorText}>{errors.breed}</Text>}
                        </View>

                        <View style={{flexDirection: 'row', gap: 10}}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                <TextInput style={[styles.input, errors.weight && styles.inputError]} placeholder="Ej: 15.5" placeholderTextColor="#999" keyboardType="numeric" value={form.weight} onChangeText={t=>{ setForm({...form, weight: t}); clearError('weight'); }}/>
                                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput style={[styles.input, errors.color && styles.inputError]} placeholder="Ej: Café" placeholderTextColor="#999" autoCapitalize="words" value={form.color} onChangeText={t=>{ setForm({...form, color: t}); clearError('color'); }}/>
                                {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
                            </View>
                        </View>

                        <Text style={styles.label}>Fecha Nacimiento (Opcional)</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.selectBtn}>
                             <Text style={{ color: form.birth_date ? '#000' : '#999' }}>{form.birth_date ? form.birth_date : "Seleccionar fecha 📅"}</Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker testID="dateTimePicker" value={dateObject} mode="date" display="default" onChange={onChangeDate} maximumDate={new Date()} />
                        )}

                        {/* 🔥 PREGUNTAS DINÁMICAS */}
                        <View style={styles.separator} />
                        <Text style={styles.sectionTitle}>Perfil de Comportamiento 📋</Text>

                        {loadingData ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{marginVertical: 20}} />
                        ) : dynamicQuestions.length > 0 ? (
                            dynamicQuestions.map((q: any) => (
                                <SwitchRow 
                                    key={q.id}
                                    label={q.question_text} 
                                    value={form.behaviorAnswers[q.question_text] || false} 
                                    onValueChange={(v: boolean) => {
                                        setForm({
                                            ...form, 
                                            behaviorAnswers: { ...form.behaviorAnswers, [q.question_text]: v }
                                        })
                                    }} 
                                />
                            ))
                        ) : (
                            <Text style={{fontStyle:'italic', color:'#999', marginBottom:15}}>No hay preguntas de comportamiento configuradas.</Text>
                        )}

                        <Text style={[styles.label, { marginTop: 10 }]}>Historial Médico 🏥</Text>
                        <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top', marginBottom: 15}]} multiline placeholder="Alergias, cirugías previas, enfermedades..." placeholderTextColor="#999" autoCapitalize="sentences" value={form.medical_history} onChangeText={t=>setForm({...form, medical_history: t})}/>

                        <Text style={styles.label}>Notas de Conducta 🧠</Text>
                        <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline placeholder="Miedos, mañas, cómo se comporta al pasear..." placeholderTextColor="#999" autoCapitalize="sentences" value={form.behaviorNotes} onChangeText={t=>setForm({...form, behaviorNotes: t})}/>

                        <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Guardar y Generar Código</Text>}
                        </TouchableOpacity>
                      </View>
                ) : (
                      <View style={styles.linkContainer}>
                        <Text style={{fontSize: 50, marginBottom: 20}}>🔗</Text>
                        <Text style={styles.title}>¿Mascota compartida?</Text>
                        <Text style={styles.subtitle}>Ingresa el código único de la mascota para gestionarla.</Text>
                        
                        <View style={{width: '100%'}}>
                            <TextInput style={[styles.input, styles.codeInput, errors.code && styles.inputError]} placeholder="EJ: X9J2K" placeholderTextColor="#ccc" autoCapitalize="characters" value={linkCode} onChangeText={(t) => { setLinkCode(t); clearError('code'); }}/>
                            {errors.code && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors.code}</Text>}
                        </View>

                        <TouchableOpacity style={styles.btnSecondary} onPress={handleLink} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Vincular Mascota</Text>}
                        </TouchableOpacity>
                      </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
        
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
                    <FlatList data={filteredBreeds} keyExtractor={i=>i.id.toString()} renderItem={({item})=>renderModalItem(item, ()=>{setForm({...form, selectedBreed: item}); setShowBreedModal(false); clearError('breed');})}/>
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
  input: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', width: '100%', color: '#000000' },
  inputError: { borderColor: COLORS.danger, borderWidth: 1 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontFamily: FONTS.regular },
  imagePickerError: { borderColor: COLORS.danger, borderWidth: 2, borderStyle: 'dashed' },
  selectBtn: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', flexDirection:'row', justifyContent:'space-between' },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 5, fontFamily: FONTS.bold, textTransform: 'uppercase', borderColor: COLORS.primary, borderWidth: 2, color: '#000000' },
  imagePickerBtn: { width: 140, height: 140, backgroundColor: '#f9f9f9', borderRadius: 70, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, overflow: 'hidden', marginBottom: 5, borderStyle: 'dashed' },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { color: COLORS.primary, fontFamily: FONTS.bold, marginTop: 5, fontSize: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
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