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
import api, { petsService } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/imageService';
import { Ionicons } from '@expo/vector-icons';

const EditPetScreen = ({ route, navigation }: any) => {
  // Recibimos la mascota a editar
  const { pet } = route.params;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Catálogos
  const [loadingData, setLoadingData] = useState(true);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [breedsList, setBreedsList] = useState<any[]>([]);
  const [filteredBreeds, setFilteredBreeds] = useState<any[]>([]);
  
  // Modales
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);

  // Estados de Fecha e Imagen
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObject, setDateObject] = useState(new Date()); 
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // Formulario completo
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

  // 1. Cargar Catálogos y Pre-llenar datos
  useEffect(() => {
    fetchCatalogsAndPreFill();
  }, []);

  const fetchCatalogsAndPreFill = async () => {
    try {
      // A. Cargar listas
      const [speciesRes, breedsRes] = await Promise.all([
        api.get('/species/'),
        api.get('/breeds/')
      ]);
      setSpeciesList(speciesRes.data);
      setBreedsList(breedsRes.data);

      // B. Lógica de Pre-llenado (Encontrar raza y especie actual)
      let currentSpecies = null;
      let currentBreed = null;

      // Buscar Raza
      if (pet.breed) {
         // Si pet.breed ya viene como objeto completo
         if (typeof pet.breed === 'object') {
             currentBreed = pet.breed;
         } 
         // Si es solo un ID, lo buscamos en la lista que acabamos de bajar
         else {
             currentBreed = breedsRes.data.find((b: any) => b.id === pet.breed);
         }
      }

      // Buscar Especie basada en la Raza
      if (currentBreed) {
          const speciesId = typeof currentBreed.species === 'object' ? currentBreed.species.id : currentBreed.species;
          currentSpecies = speciesRes.data.find((s: any) => s.id === speciesId);
          
          // Filtrar razas para que el modal funcione bien si el usuario quiere cambiarla
          const filtered = breedsRes.data.filter((b: any) => (typeof b.species === 'object' ? b.species.id : b.species) === speciesId);
          setFilteredBreeds(filtered);
      }

      // Configurar Fecha Inicial
      let initialDate = new Date();
      if (pet.birth_date) {
          // Agregamos hora para evitar problemas de zona horaria
          initialDate = new Date(pet.birth_date + 'T00:00:00');
      }

      // C. Setear el Estado del Formulario
      setForm({
        name: pet.name || '',
        selectedSpecies: currentSpecies,
        selectedBreed: currentBreed,
        weight: pet.characteristics?.weight_kg ? pet.characteristics.weight_kg.toString() : '',
        color: pet.characteristics?.color || '',
        medical_history: pet.medical_history || '',
        birth_date: pet.birth_date || '', 
        isFriendlyChildren: pet.is_friendly_children || false,
        isFriendlyPets: pet.is_friendly_pets || false,
        isEnergetic: pet.is_energetic || false,
        isSterilized: pet.is_sterilized || false,
        vaccinesUpToDate: pet.vaccines_up_to_date || false,
        behaviorNotes: pet.behavior_notes || ''
      });

      setDateObject(initialDate);

      // Setear Imagen si existe
      if (pet.photos_url && pet.photos_url.length > 0) {
          setLocalImageUri(pet.photos_url[0]);
      }

    } catch (error) {
      console.log("Error cargando datos:", error);
      Alert.alert("Error", "No se pudieron cargar los datos de la mascota.");
    } finally {
      setLoadingData(false);
    }
  };

  const clearError = (field: string) => {
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  // Manejo de selectores
  const handleSelectSpecies = (species: any) => {
    setForm({ ...form, selectedSpecies: species, selectedBreed: null });
    const filtered = breedsList.filter(b => (typeof b.species === 'object' ? b.species.id : b.species) === species.id);
    setFilteredBreeds(filtered);
    setShowSpeciesModal(false);
    clearError('species');
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateObject;
    setShowDatePicker(false);
    setDateObject(currentDate);
    
    // Formato YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setForm({ ...form, birth_date: formattedDate });
  };

  // Manejo de Imagen
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
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
        setLocalImageUri(result.assets[0].uri);
        clearError('image');
    }
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
    if (!result.canceled) {
        setLocalImageUri(result.assets[0].uri);
        clearError('image');
    }
  };

  const validate = () => {
    let valid = true;
    let temp: any = {};

    if (!localImageUri) { temp.image = "Foto requerida"; valid = false; }
    if (!form.name) { temp.name = "El nombre es obligatorio"; valid = false; }
    if (!form.selectedSpecies) { temp.species = "Selecciona especie"; valid = false; }
    if (!form.selectedBreed) { temp.breed = "Selecciona raza"; valid = false; }
    
    if (!form.weight) { temp.weight = "Ingresa el peso"; valid = false; }
    else if (isNaN(parseFloat(form.weight))) { temp.weight = "Debe ser número"; valid = false; }

    if (!form.color) { temp.color = "Indica el color"; valid = false; }

    setErrors(temp);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // 1. Subir imagen SOLO si es nueva (comienza con file:// o content://)
      // Si empieza con http, es la que ya estaba en el servidor.
      let uploadedUrl = localImageUri;
      if (localImageUri && !localImageUri.startsWith('http')) {
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
        
        // El backend espera un array de fotos
        photos_url: uploadedUrl ? [uploadedUrl] : []
      };

      // 3. Actualizar
      await petsService.updatePet(pet.id, payload);
      
      Alert.alert("¡Éxito!", "Mascota actualizada correctamente.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo actualizar la mascota.");
    } finally {
      setSaving(false);
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

  if (loadingData) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Editar Mascota</Text>
            <View style={{width: 24}} /> 
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
                
                      <View style={styles.form}>

                        {/* 📸 FOTO */}
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            <TouchableOpacity 
                                onPress={handleSelectImage} 
                                style={[styles.imagePickerBtn, errors.image && styles.imagePickerError]}
                            >
                                {localImageUri ? (
                                    <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
                                ) : (
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
                            <TextInput 
                                style={[styles.input, errors.name && styles.inputError]} 
                                placeholder="Ej: Max" 
                                placeholderTextColor="#999" 
                                autoCapitalize="words"
                                value={form.name}
                                onChangeText={t=>{ setForm({...form, name: t}); clearError('name'); }}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>
                        
                        <View>
                            <Text style={styles.label}>Especie</Text>
                            <TouchableOpacity 
                                style={[styles.selectBtn, errors.species && styles.inputError]} 
                                onPress={() => setShowSpeciesModal(true)}
                            >
                                <Text style={{color: form.selectedSpecies ? '#000' : '#999'}}>
                                    {form.selectedSpecies?.name || "Seleccionar..."}
                                </Text>
                                <Text style={{ color: '#000' }}>▼</Text>
                            </TouchableOpacity>
                            {errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
                        </View>

                        <View>
                            <Text style={styles.label}>Raza</Text>
                            <TouchableOpacity 
                                style={[styles.selectBtn, errors.breed && styles.inputError]} 
                                onPress={() => form.selectedSpecies ? setShowBreedModal(true) : null}
                            >
                                <Text style={{color: form.selectedBreed ? '#000' : '#999'}}>
                                    {form.selectedBreed?.name || (form.selectedSpecies ? "Seleccionar..." : "Primero elige especie")}
                                </Text>
                                <Text style={{ color: '#000' }}>▼</Text>
                            </TouchableOpacity>
                            {errors.breed && <Text style={styles.errorText}>{errors.breed}</Text>}
                        </View>

                        <View style={{flexDirection: 'row', gap: 10}}>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                <TextInput 
                                    style={[styles.input, errors.weight && styles.inputError]} 
                                    placeholder="Ej: 15.5" 
                                    placeholderTextColor="#999" 
                                    keyboardType="numeric"
                                    value={form.weight}
                                    onChangeText={t=>{ setForm({...form, weight: t}); clearError('weight'); }}
                                />
                                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput 
                                    style={[styles.input, errors.color && styles.inputError]} 
                                    placeholder="Ej: Café" 
                                    placeholderTextColor="#999" 
                                    autoCapitalize="words"
                                    value={form.color}
                                    onChangeText={t=>{ setForm({...form, color: t}); clearError('color'); }}
                                />
                                {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
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

                        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Guardar Cambios</Text>}
                        </TouchableOpacity>
                      </View>
                
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
  form: { gap: 15 },
  title: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
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
  imagePickerError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
    borderStyle: 'dashed'
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
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', fontSize:18, marginBottom:10, color: '#000'},
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#000' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontFamily: FONTS.bold }
});

export default EditPetScreen;