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
  KeyboardAvoidingView, // 👈 1. Importado
  Platform             // 👈 2. Importado
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import api, { authService } from '../services/api'; 

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  // 1. Cargar datos del usuario al entrar
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/'); 
      
      if (response.data && response.data.length > 0) {
        const user = response.data[0]; 
        setUserId(user.id); 
        setForm({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      Alert.alert("Error", "No se pudieron cargar tus datos.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Guardar cambios
  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
        await authService.updateProfile(userId, {
            first_name: form.first_name,
            last_name: form.last_name,
        });

        Alert.alert("¡Éxito!", "Tu perfil ha sido actualizado.", [
            { text: "OK", onPress: () => navigation.goBack() }
        ]);

    } catch (error: any) {
        console.error("Error actualizando:", error);
        Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24, color: '#000'}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={{width: 24}} /> 
      </View>

      {/* 3. KEYBOARD AVOIDING VIEW */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            {/* Campo Nombre */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.first_name} autoCapitalize="words"
                    onChangeText={(t) => setForm({...form, first_name: t})}
                    placeholder="Tu nombre"
                    placeholderTextColor="#999"
                />
            </View>

            {/* Campo Apellido */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput 
                    style={styles.input} 
                    value={form.last_name} autoCapitalize="words"
                    onChangeText={(t) => setForm({...form, last_name: t})}
                    placeholder="Tu apellido"
                    placeholderTextColor="#999"
                />
            </View>

            {/* Campo Email (Solo lectura) */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo (No editable)</Text>
                <TextInput 
                    style={[styles.input, { backgroundColor: '#f0f0f0', color: '#666' }]} 
                    value={form.email}
                    editable={false} 
                />
                <Text style={{fontSize: 10, color: '#999', marginTop: 5}}>
                    El correo no se puede cambiar por seguridad.
                </Text>
            </View>

            {/* Botón Guardar */}
            <TouchableOpacity 
                style={styles.btnPrimary} 
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.btnText}>Guardar Cambios</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: FONTS.semiBold, marginBottom: 8, color: COLORS.textDark },
  
  // 4. CORRECCIÓN: Color negro explícito
  input: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
    fontSize: 16,
    color: '#000000' // IMPORTANTE
  },
  
  btnPrimary: { 
    backgroundColor: COLORS.primary, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 20 
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 }
});

export default EditProfileScreen;