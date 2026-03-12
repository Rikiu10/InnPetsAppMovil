import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';

const AdoptionsScreen = ({ navigation }: any) => {
  const { user, refreshUser } = useAuth(); 
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('PETS'); 
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false); 
  const isFocused = useIsFocused();
  
  // Estados de Datos
  const [pets, setPets] = useState([]);
  const [foundations, setFoundations] = useState([]);
  const [fosters, setFosters] = useState([]);

  // Estado del Modal Onboarding
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [settingRole, setSettingRole] = useState(false);

  // 1. VERIFICAR ROL AL ENTRAR
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user?.foundation || user?.is_foster_home) return;

      const hasSeen = await AsyncStorage.getItem('@adoption_onboarding_done');
      if (!hasSeen) {
        setShowRoleModal(true);
      }
    };
    
    if (user) checkOnboarding();
  }, [user]);

  // 2. CARGAR DATOS SEGÚN LA PESTAÑA
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'PETS') {
        const res = await api.get('/adoptions/'); 
        setPets(res.data.results || res.data);
      } 
      else if (activeTab === 'FOUNDATIONS') {
        const res = await api.get('/foundations/');
        setFoundations(res.data.results || res.data);
      } 
      else if (activeTab === 'FOSTERS' && user?.foundation) {
        const res = await api.get('/users/rescue_network/?foster_only=true');
        setFosters(res.data);
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. LÓGICA DE ROLES (ACTUALIZADA CON REGLAS DEL PROFESOR)
  const handleSetRole = async (roleType: string) => {
    // REGLA: Fundaciones requieren aprobación del Admin
    if (roleType === 'FOUNDATION') {
        Alert.alert(
            "Aprobación Requerida 🏢",
            "Para registrar tu fundación y acceder al directorio de casas de acogida, un administrador debe verificar tus datos.\n\n¿Deseas abrir un ticket de soporte para iniciar el proceso?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Contactar Soporte", onPress: () => {
                    setShowRoleModal(false);
                    navigation.navigate('CreateTicket');
                }}
            ]
        );
        return; // Detenemos la ejecución aquí, no se guarda automáticamente.
    }

    setSettingRole(true);
    try {
      await api.post('/users/set_adoption_role/', { role: roleType });
      await AsyncStorage.setItem('@adoption_onboarding_done', 'true');
      
      if (refreshUser) await refreshUser(); 
      
      setShowRoleModal(false);
      Alert.alert("¡Excelente!", "Tu perfil ha sido configurado. Recuerda que puedes modificarlo más adelante en los ajustes.");
      
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar tu preferencia.");
    } finally {
      setSettingRole(false);
    }
  };

  // 4. CREAR CHAT DE ADOPCIÓN
  const handleContactAdoption = async (postId: number, animalName: string) => {
      setCreatingChat(true);
      try {
          const res = await api.post('/chat/create_adoption_chat/', { post_id: postId });
          navigation.navigate('ChatDetail', { 
              roomId: res.data.room_id, 
              partnerName: `Adopción: ${animalName}`,
              isSupport: false 
          });
      } catch (error: any) {
          const errMsg = error.response?.data?.error || "No se pudo iniciar el chat.";
          Alert.alert("Aviso", errMsg);
      } finally {
          setCreatingChat(false);
      }
  };

  // --- RENDERIZADO DE LISTAS ---
  const renderPet = ({ item }: any) => {
      const animalName = item.temp_name || item.pet?.name || 'Perrito Rescatado';
      const isMyPost = item.publisher === user?.id; 

      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{animalName}</Text>
          <Text style={styles.cardSubtitle}>Estado: {item.status}</Text>
          
          {!isMyPost && (
              <TouchableOpacity 
                  style={styles.contactBtn} 
                  onPress={() => handleContactAdoption(item.id, animalName)}
                  disabled={creatingChat}
              >
                  <Text style={styles.contactBtnText}>💬 Contactar</Text>
              </TouchableOpacity>
          )}
        </View>
      );
  };

  const renderFoundation = ({ item }: any) => (
    <View style={styles.card}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
        <Ionicons name="business" size={24} color={COLORS.primary} style={{marginRight: 10}}/>
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.contact_email || 'Sin correo público'}</Text>
    </View>
  );

  const renderFoster = ({ item }: any) => (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#4CAF50' }]}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
        <Ionicons name="home" size={24} color="#4CAF50" style={{marginRight: 10}}/>
        <Text style={styles.cardTitle}>{item.first_name} {item.last_name}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.email}</Text>
      <Text style={{color: '#4CAF50', fontSize: 12, marginTop: 5, fontWeight: 'bold'}}>🏡 Casa de Acogida Disponible</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Adopciones y Rescate</Text>
        
        {/* BOTÓN PARA ABRIR EL MODAL DE ROLES MANUALMENTE */}
        <TouchableOpacity onPress={() => setShowRoleModal(true)} style={{padding: 5}}>
          <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* PESTAÑAS (TABS) */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'PETS' && styles.activeTab]} onPress={() => setActiveTab('PETS')}>
          <Text style={[styles.tabText, activeTab === 'PETS' && styles.activeTabText]}>Mascotas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'FOUNDATIONS' && styles.activeTab]} onPress={() => setActiveTab('FOUNDATIONS')}>
          <Text style={[styles.tabText, activeTab === 'FOUNDATIONS' && styles.activeTabText]}>Fundaciones</Text>
        </TouchableOpacity>

        {/* PESTAÑA SECRETA */}
        {user?.foundation && (
            <TouchableOpacity style={[styles.tab, activeTab === 'FOSTERS' && styles.activeTab]} onPress={() => setActiveTab('FOSTERS')}>
              <Text style={[styles.tabText, activeTab === 'FOSTERS' && styles.activeTabText]}>Acogidas 🔒</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* CONTENIDO DE LA PESTAÑA */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={activeTab === 'PETS' ? pets : activeTab === 'FOUNDATIONS' ? foundations : fosters}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={activeTab === 'PETS' ? renderPet : activeTab === 'FOUNDATIONS' ? renderFoundation : renderFoster}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay registros disponibles por ahora.</Text>}
        />
      )}

      {/* MODAL DE ONBOARDING */}
      <Modal visible={showRoleModal && isFocused} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* BOTÓN PARA CERRAR EL MODAL */}
            <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => {
                    setShowRoleModal(false);
                }}
            >
                <Ionicons name="close-circle" size={30} color="#ccc" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>¡Bienvenido a la Red de Rescate! 🐾</Text>
            <Text style={styles.modalSubtitle}>Para ofrecerte la mejor experiencia, cuéntanos cómo te gustaría participar hoy:</Text>

            <TouchableOpacity style={styles.roleBtn} onPress={() => handleSetRole('FOUNDATION')} disabled={settingRole}>
              <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}><Ionicons name="business" size={28} color="#2196F3" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.roleBtnTitle}>Soy una Fundación</Text>
                <Text style={styles.roleBtnDesc}>Requiere verificación del administrador.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.roleBtn} onPress={() => handleSetRole('FOSTER')} disabled={settingRole}>
              <View style={[styles.iconBox, {backgroundColor: '#E8F5E9'}]}><Ionicons name="home" size={28} color="#4CAF50" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.roleBtnTitle}>Quiero ser Casa de Acogida</Text>
                <Text style={styles.roleBtnDesc}>Ofrezco mi hogar temporalmente para un animal rescatado.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.roleBtn} onPress={() => handleSetRole('NONE')} disabled={settingRole}>
              <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}><Ionicons name="heart" size={28} color="#FF9800" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.roleBtnTitle}>Solo busco Adoptar</Text>
                <Text style={styles.roleBtnDesc}>Quiero ver las mascotas disponibles y contactar fundaciones.</Text>
              </View>
            </TouchableOpacity>

            {settingRole && <ActivityIndicator color={COLORS.primary} style={{marginTop: 15}} />}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: COLORS.white, elevation: 2, shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.1, shadowRadius:2 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: 10, paddingBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { color: '#888', fontFamily: FONTS.bold, fontSize: 14 },
  activeTabText: { color: COLORS.primary },

  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.1, shadowRadius:2 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.bold, color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#666', marginTop: 5 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 15 },

  contactBtn: { marginTop: 15, backgroundColor: '#FF9800', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  contactBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, paddingTop: 40, ...SHADOWS.card },
  
  closeModalBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  
  modalTitle: { fontSize: 20, fontFamily: FONTS.bold, textAlign: 'center', color: COLORS.textDark, marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  
  roleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  roleBtnTitle: { fontSize: 16, fontFamily: FONTS.bold, color: '#333' },
  roleBtnDesc: { fontSize: 12, color: '#666', marginTop: 3 },
});

export default AdoptionsScreen;