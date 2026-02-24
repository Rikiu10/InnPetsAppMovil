import React, { useState, useCallback, useRef, useEffect } from 'react'; 
import { 
  View, Text, TouchableOpacity, StyleSheet, Alert, 
  ActivityIndicator, ScrollView, FlatList, Image, Modal, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme'; 
import { useFocusEffect, CompositeScreenProps } from '@react-navigation/native';
import api, { authService, petsService, servicesService } from '../services/api'; 
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; 

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '../services/fileService';
import { uploadImageToCloudinary } from '../services/imageService';

type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Perfil'>,
  CompositeScreenProps<NativeStackScreenProps<RootStackParamList>, DrawerScreenProps<any>>
>;

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const { user, setUser, refreshUser } = useAuth(); 
  
  const [loading, setLoading] = useState(false);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [myPets, setMyPets] = useState<any[]>([]);
  
  const [certification, setCertification] = useState<any>(null);
  const [certLevel, setCertLevel] = useState<string | null>(null);

  const [allCertifications, setAllCertifications] = useState<any[]>([]);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const isMounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      refreshUser(); 
      fetchExtraData();
      return () => { isMounted.current = false; }; 
    }, [user?.user_type, user?.id]) 
  );

  useEffect(() => {
      fetchCertificationLevel();
  }, []);

  const getProfileImage = () => {
      const defaultImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      if (!user) return defaultImage;

      if (user.user_type === 'IP') {
          const photos = user.provider_profile?.photos_url;
          if (Array.isArray(photos) && photos.length > 0) return photos[0];
      } else {
          if (user.pet_parent_profile?.photo_identification_url) {
              return user.pet_parent_profile.photo_identification_url;
          }
      }
      return defaultImage;
  };

  // --- LÓGICA DE SUBIDA DE ARCHIVOS ---
  const handleSelectFile = () => {
      Alert.alert("Subir Certificado", "Elige el formato", [
          { text: "📷 Cámara", onPress: openCamera },
          { text: "🖼️ Galería", onPress: openGallery },
          { text: "📄 PDF", onPress: pickDocument },
          { text: "Cancelar", style: "cancel" }
      ]);
  };

  const openCamera = async () => {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!result.canceled) {
          setSelectedFile(result.assets[0]);
          setFileType('image');
          setCustomFileName(`cert_${Date.now()}.jpg`);
      }
  };

  const openGallery = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled) {
          setSelectedFile(result.assets[0]);
          setFileType('image');
          setCustomFileName(result.assets[0].fileName || `cert_${Date.now()}.jpg`);
      }
  };

  const pickDocument = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
          if (!result.canceled && result.assets) {
              setSelectedFile(result.assets[0]);
              setFileType('pdf');
              setCustomFileName(result.assets[0].name);
          }
      } catch (err) { console.log(err); }
  };

  const handleSubmitAppeal = async () => {
      if (!selectedFile) return Alert.alert("Error", "Selecciona un archivo primero.");
      if (!customFileName.trim()) return Alert.alert("Error", "Ingresa un nombre para el archivo.");
      
      setUploading(true);
      try {
          let docUrl = "";
          if (fileType === 'image') docUrl = await uploadImageToCloudinary(selectedFile.uri);
          else docUrl = await uploadFileToCloudinary(selectedFile.uri, customFileName, selectedFile.mimeType || 'application/pdf');

          await api.post('/certifications/', { document_url: docUrl });
          
          Alert.alert("¡Enviado!", "Certificado subido correctamente.");
          setShowAppealModal(false);
          setSelectedFile(null);
          setCustomFileName('');
          fetchExtraData(); 
      } catch (error) {
          Alert.alert("Error", "No se pudo subir el archivo.");
      } finally {
          setUploading(false);
      }
  };

  const fetchCertificationLevel = async () => {
      try {
          const res = await api.get('/certifications/');
          if (Array.isArray(res.data)) {
              const approved = res.data.find((c: any) => c.status === 'APPROVED');
              if (approved) setCertLevel(approved.level);
              else setCertLevel(null);
          }
      } catch (error) { console.log("Error cargando nivel", error); }
  };

  const getLevelBadge = () => {
      if (!certLevel) return null;
      let color = COLORS.success; 
      let text = "Nivel Básico (Verde)";
      if (certLevel === 'INTERMEDIATE' || certLevel === 'YELLOW') { color = '#F59E0B'; text = "Nivel Intermedio (Amarillo)"; } 
      else if (certLevel === 'ADVANCED' || certLevel === 'RED') { color = '#EF4444'; text = "Nivel Avanzado (Rojo)"; }

      return (
          <View style={{ backgroundColor: color, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>🏅 {text}</Text>
          </View>
      );
  };

  const fetchExtraData = async () => {
      if (!user) return;
      try {
         if(myServices.length === 0 && myPets.length === 0) setLoading(true);

         try {
             const certRes = await api.get('/certifications/');
             if (certRes.data && Array.isArray(certRes.data) && certRes.data.length > 0) {
                 setAllCertifications(certRes.data); 
                 const current = certRes.data[0];
                 setCertification(current);
                 const approved = certRes.data.find((c:any) => c.status === 'APPROVED');
                 if (approved) setCertLevel(approved.level);
                 else setCertLevel(null);
             } else {
                 setCertification(null); setCertLevel(null); setAllCertifications([]);
             }
         } catch (e) {
             console.log("Sin certificación aún");
             setCertification(null); setCertLevel(null);
         }

         if (user.user_type === 'IP') { 
            const servicesRes = await api.get('/services/');
            const mine = servicesRes.data.filter((s: any) => {
                const providerId = typeof s.provider === 'object' ? s.provider.id : s.provider;
                return providerId === user.id;
            });
            if(isMounted.current) setMyServices(mine);
         } else { 
            const petsRes = await api.get('/pets/');
            if(isMounted.current) setMyPets(petsRes.data);
         }
      } catch (error) { console.error("Error cargando datos:", error); } finally { if (isMounted.current) setLoading(false); }
  };

  const handleSwitchRole = async () => {
    if (!user) return;
    if (user.user_type === 'PP') { 
        if ((certification && certification.status === 'APPROVED') || certLevel) {
             toggleRoleApi();
        } else {
             Alert.alert("Acceso Restringido", "Tu solicitud aún no ha sido aprobada por un administrador.");
        }
    } else {
        Alert.alert(
            "Modo Dueño", "Tus servicios dejarán de ser visibles temporalmente.", 
            [{ text: "Cancelar", style: "cancel" }, { text: "Cambiar", onPress: toggleRoleApi }]
        );
    }
  };

  const toggleRoleApi = async () => {
    try {
      setLoading(true);
      const data = await authService.switchRole();
      if (data.user) setUser(data.user);
      else if(user) setUser({ ...user, user_type: data.new_role });
      
      setMyServices([]);
      setMyPets([]);
      setTimeout(() => fetchExtraData(), 500); 
    } catch (error) {
      Alert.alert("Error", "No se pudo cambiar el rol");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleCreateService = () => {
      if (!certification || certification.status !== 'APPROVED') {
          Alert.alert("Perfil en Revisión ⏳", "No puedes publicar servicios hasta que un administrador apruebe tu certificación.");
          return;
      }
      navigation.navigate('CreateService');
  };

  const handleStatusCardClick = () => {
      if (certification && certification.status === 'PENDING') {
          Alert.alert("Solicitud Enviada", "Tus documentos están siendo revisados.");
          return;
      }
      if (certification && certification.status === 'REJECTED') {
          setShowAppealModal(true); 
          return;
      }
      navigation.navigate('BecomeProvider');
  };

  const handleOptions = (item: any, type: 'pet' | 'service') => {
    const title = type === 'pet' ? item.name : item.title;
    Alert.alert(
        "Opciones", `¿Qué deseas hacer con "${title}"?`,
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Editar ✏️", 
                onPress: () => {
                    if (type === 'pet') navigation.navigate('EditPet', { pet: item });
                    else navigation.navigate('EditService', { service: item });
                }
            },
            { 
                text: "Eliminar 🗑️", style: "destructive",
                onPress: () => performDelete(item.id, type)
            }
        ]
    );
  };

  const performDelete = async (id: number, type: 'pet' | 'service') => {
      try {
          if (type === 'pet') await petsService.deletePet(id);
          else await servicesService.deleteService(id);
          Alert.alert("Eliminado", "Elemento eliminado exitosamente.");
          fetchExtraData();
      } catch (error) { Alert.alert("Error", "No se pudo eliminar."); }
  };

  const renderServiceItem = ({ item }: { item: any }) => {
    const imageUrl = Array.isArray(item.photos_url) && item.photos_url.length > 0 ? item.photos_url[0] : item.image;
    return (
        <View style={styles.card}>
            <View style={{flex: 1, paddingRight: 10}}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>${item.price}</Text>
            </View>
            <View style={styles.imageThumb}>
                {imageUrl ? <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{fontSize: 24}}>💼</Text>}
            </View>
            <TouchableOpacity style={styles.optionsButton} onPress={() => handleOptions(item, 'service')}>
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
        </View>
    );
  };

  const renderPetItem = ({ item }: { item: any }) => (
    <View style={styles.petCard}>
        <View style={styles.petAvatar}>
            {item.photos_url && item.photos_url.length > 0 ? <Image source={{ uri: item.photos_url[0] }} style={{ width: '100%', height: '100%', borderRadius: 30 }} resizeMode="cover" /> : <Text style={{fontSize: 30}}>🐶</Text>}
        </View>
        <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.breed_name || "Raza desconocida"}</Text>
            <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Código:</Text>
                <Text style={styles.codeValue}>{item.code}</Text>
            </View>
        </View>
        <TouchableOpacity style={styles.optionsButton} onPress={() => handleOptions(item, 'pet')}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
    </View>
  );

  const renderBecomeProviderCTA = () => (
      <TouchableOpacity style={styles.ctaContainer} onPress={() => navigation.navigate('BecomeProvider')}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <Text style={{fontSize: 30, marginRight: 15}}>💼</Text>
             <View style={{flex: 1}}>
                 <Text style={styles.ctaTitle}>¿Quieres ser Cuidador?</Text>
                 <Text style={styles.ctaText}>Gana dinero extra cuidando mascotas certificadamente.</Text>
             </View>
          </View>
          <View style={styles.ctaButton}><Text style={styles.ctaButtonText}>Comenzar</Text></View>
      </TouchableOpacity>
  );

  const renderOwnerView = () => {
      if (certification && certification.status === 'APPROVED') return null;

      if (certification && (certification.status === 'PENDING' || certification.status === 'REJECTED')) {
          const config = certification.status === 'PENDING' 
            ? { bg: '#E3F2FD', border: '#64B5F6', icon: '⏳', title: 'Solicitud en Revisión', msg: 'Tu perfil está siendo evaluado.' }
            : { bg: '#FFEBEE', border: '#E57373', icon: '❌', title: 'Solicitud Rechazada', msg: 'Revisa y envía nueva documentación.' };

          return (
             <TouchableOpacity 
                style={[styles.certCard, { backgroundColor: config.bg, borderColor: config.border }]}
                onPress={handleStatusCardClick} 
             >
                  <Text style={{fontSize: 24, marginRight: 10}}>{config.icon}</Text>
                  <View style={{flex: 1}}>
                      <Text style={[styles.certTitle, {color: '#333'}]}>{config.title}</Text>
                      <Text style={styles.certSubtitle}>{config.msg}</Text>
                  </View>
                  {/* Flecha solo si es rechazado */}
                  {certification.status === 'REJECTED' && (
                      <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
                  )}
             </TouchableOpacity>
          );
      }
      return renderBecomeProviderCTA();
  };

  const renderProviderView = () => {
      const levelLabels: any = {
        'BASIC': 'Nivel Básico (Verde)',
        'INTERMEDIATE': 'Nivel Intermedio (Amarillo)',
        'ADVANCED': 'Nivel Avanzado (Rojo)',
      };

      if (!certification || certification.status !== 'APPROVED') {
          return (
             <View>
                 <TouchableOpacity 
                    style={[styles.certCard, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}
                    onPress={handleStatusCardClick}
                 >
                    <Text style={{fontSize: 24, marginRight: 10}}>⚠️</Text>
                    <View style={{flex: 1}}>
                        <Text style={[styles.certTitle, {color: '#E65100'}]}>Cuenta no Verificada</Text>
                        <Text style={styles.certSubtitle}>
                            {certification?.status === 'PENDING' ? 'Esperando aprobación...' : 'Debes enviar tu certificación.'}
                        </Text>
                    </View>
                 </TouchableOpacity>
                 
                 <TouchableOpacity style={styles.appealBtn} onPress={() => setShowAppealModal(true)}>
                     <Text style={styles.appealBtnText}>Subir Nueva Certificación</Text>
                 </TouchableOpacity>
             </View>
          );
      }

      return (
         <View>
             <Text style={styles.labelHeader}>Estado de tu Cuenta:</Text>
             <View style={[styles.certCard, { backgroundColor: '#E8F5E9', borderColor: '#81C784' }]}>
                <Text style={{fontSize: 24, marginRight: 10}}>✅</Text>
                <View style={{flex: 1}}>
                    <Text style={[styles.certTitle, {color: '#388E3C'}]}>Certificado Activo</Text>
                    <Text style={[styles.certSubtitle, {fontWeight: 'bold'}]}>
                        {levelLabels[certification?.level] || 'Verificado'}
                    </Text>
                </View>
             </View>

             <TouchableOpacity style={styles.appealBtn} onPress={() => setShowAppealModal(true)}>
                 <Text style={styles.appealBtnText}>Actualizar Certificación</Text>
             </TouchableOpacity>
         </View>
      );
  };

  const renderContent = () => {
    if (!user) return null;

    if (user.user_type === 'PP') {
        return (
            <View style={styles.contentSection}>
                {renderOwnerView()}
                <View style={styles.divider} />
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🐶 Mis Mascotas</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreatePet')}>
                        <Text style={styles.addButtonText}>+ Agregar</Text>
                    </TouchableOpacity>
                </View>
                {myPets.length > 0 ? (
                    <FlatList data={myPets} keyExtractor={(item) => item.id.toString()} renderItem={renderPetItem} scrollEnabled={false} />
                ) : (
                    <View style={styles.emptyState}><Text style={{fontSize: 40}}>🐕</Text><Text style={styles.emptyText}>No tienes mascotas registradas.</Text></View>
                )}
            </View>
        );
    } else {
        return (
            <View style={styles.contentSection}>
                 {renderProviderView()}
                 <View style={styles.divider} />
                 <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🛠️ Mis Servicios</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateService}>
                        <Text style={styles.addButtonText}>+ Crear</Text>
                    </TouchableOpacity>
                </View>
                {myServices.length > 0 ? (
                    <FlatList data={myServices} keyExtractor={(item) => item.id.toString()} renderItem={renderServiceItem} scrollEnabled={false} />
                ) : (
                    <View style={styles.emptyState}><Text style={{fontSize: 40}}>💼</Text><Text style={styles.emptyText}>No has publicado servicios activos.</Text></View>
                )}
            </View>
        );
    }
  };

  if (!user && loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!user) return <View style={styles.center}><Text>No se pudo cargar el perfil.</Text></View>;

  const userName = `${user.first_name} ${user.last_name}`;
  const showSwitchButton = user.user_type === 'IP' || (certification && certification.status === 'APPROVED');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.header}>
            <View style={styles.topBar}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                    <Text style={{fontSize: 24}}>✏️</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.avatarContainer}>
                <Image source={{ uri: getProfileImage() }} style={{width: 90, height: 90, borderRadius: 45}} />
            </View>
            <Text style={styles.name}>{userName}</Text>
            
            {user.user_type === 'IP' && getLevelBadge()}

            <View style={[styles.badge, { backgroundColor: user.user_type === 'PP' ? '#E8F5E9' : COLORS.primaryLight, marginTop: 10 }]}>
                <Text style={[styles.roleText, { color: user.user_type === 'PP' ? COLORS.success : COLORS.primary }]}>
                    {user.user_type === 'PP' ? 'Modo: Dueño' : 'Modo: Proveedor'}
                </Text>
            </View>
          </View>

          {showSwitchButton && (
              <TouchableOpacity 
                style={[styles.switchBtn, { backgroundColor: user.user_type === 'PP' ? COLORS.primary : COLORS.textDark }]} 
                onPress={handleSwitchRole}
              >
                <Text style={styles.switchText}>
                    {user.user_type === 'PP' ? '🔄 Cambiar a Modo Proveedor' : '🏡 Volver a modo Dueño'}
                </Text>
              </TouchableOpacity>
          )}

          {renderContent()}
          
          {/* BOTÓN CERRAR SESIÓN ELIMINADO */}
      </ScrollView>

      <Modal visible={showAppealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Gestionar Certificaciones</Text>
                
                <Text style={{alignSelf:'flex-start', fontWeight:'bold', marginBottom:5, color: COLORS.textDark}}>Historial:</Text>
                <View style={styles.historyList}>
                    {allCertifications.length > 0 ? (
                        <FlatList 
                            data={allCertifications}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({item}) => (
                                <View style={styles.historyItem}>
                                    <Text style={{fontSize:12, color: '#555'}}>
                                        📅 {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                    <Text style={{fontSize:12, fontWeight:'bold', color: item.status==='APPROVED'?'green':(item.status==='REJECTED'?'red':'orange')}}>
                                        {item.status === 'APPROVED' ? 'Aprobado' : (item.status === 'REJECTED' ? 'Rechazado' : 'Pendiente')}
                                    </Text>
                                </View>
                            )}
                        />
                    ) : <Text style={{fontSize:12, color:'#999'}}>No hay historial.</Text>}
                </View>

                <View style={styles.divider}/>
                <Text style={{marginBottom:10, fontWeight:'bold', color: COLORS.textDark}}>Subir Nuevo:</Text>

                <TouchableOpacity style={styles.uploadBox} onPress={handleSelectFile}>
                    {selectedFile ? (
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <Text style={{fontSize:24}}>{fileType === 'image' ? '🖼️' : '📄'}</Text>
                            <Text style={{marginLeft:10, fontWeight:'bold', color:COLORS.primary}}>Archivo Listo</Text>
                        </View>
                    ) : (
                        <Text style={{color:COLORS.primary, fontWeight:'bold'}}>☁️ Seleccionar Archivo</Text>
                    )}
                </TouchableOpacity>

                {selectedFile && (
                    <TextInput 
                        style={styles.inputName} 
                        value={customFileName} 
                        onChangeText={setCustomFileName} 
                        placeholder="Nombre del archivo (Ej: Certificado 2026)"
                    />
                )}

                <View style={{flexDirection:'row', gap:10, marginTop:20}}>
                    <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAppealModal(false); setSelectedFile(null); }}>
                        <Text style={{color:'#666', fontWeight:'bold'}}>Cerrar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitAppeal} disabled={uploading}>
                        {uploading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>Subir</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20, padding: 20, backgroundColor: COLORS.white, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...SHADOWS.card },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 10, marginTop: 10, overflow: 'hidden' },
  name: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.textDark, marginBottom: 5 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontFamily: FONTS.bold, fontSize: 14 },
  switchBtn: { marginHorizontal: 20, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20, elevation: 3 },
  switchText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  
  contentSection: { paddingHorizontal: 20, flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  addButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 30, opacity: 0.6 },
  emptyText: { marginTop: 10, fontFamily: FONTS.regular, color: COLORS.textLight },
  
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', ...SHADOWS.card },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textDark },
  cardPrice: { fontFamily: FONTS.bold, color: COLORS.success },
  imageThumb: { width: 50, height: 50, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  
  petCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', ...SHADOWS.card },
  petAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5E6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardSubtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 5 },
  codeContainer: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', marginTop: 5 },
  codeLabel: { fontSize: 12, color: '#666', marginRight: 5 },
  codeValue: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 1 },
  optionsButton: { padding: 10, marginLeft: 5, justifyContent: 'center', alignItems: 'center' }, // 👈 ERROR DUPLICADO CORREGIDO AQUÍ

  certCard: {
      flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15,
      borderWidth: 1, marginBottom: 20
  },
  certTitle: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 2 },
  certSubtitle: { fontSize: 12, color: '#555' },
  labelHeader: { fontFamily: FONTS.bold, color: '#666', marginBottom: 10, fontSize: 14 },

  ctaContainer: {
      backgroundColor: COLORS.white, borderRadius: 15, padding: 20, marginBottom: 20,
      borderWidth: 1, borderColor: '#eee', ...SHADOWS.card
  },
  ctaTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textDark },
  ctaText: { fontSize: 13, color: COLORS.textLight, marginTop: 2, marginBottom: 15 },
  ctaButton: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  ctaButtonText: { color: 'white', fontFamily: FONTS.bold },
  
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },

  // 👇 ESTILOS NUEVOS
  appealBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  appealBtnText: { color: '#fff', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', maxHeight:'80%' },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 10 },
  historyList: { width:'100%', maxHeight:150, marginBottom:10 },
  historyItem: { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#eee' },
  uploadBox: { width: '100%', padding: 20, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  inputName: { width: '100%', padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9' },
  modalCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 },
  modalSubmit: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 8 }
});

export default ProfileScreen;