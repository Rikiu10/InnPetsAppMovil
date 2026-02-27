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
  const [myProducts, setMyProducts] = useState<any[]>([]); 
  
  const [certification, setCertification] = useState<any>(null);
  const [certLevel, setCertLevel] = useState<string | null>(null);

  const [allCertifications, setAllCertifications] = useState<any[]>([]);
  const [showAppealModal, setShowAppealModal] = useState(false);
  
  // 🔥 NUEVO: Estado para múltiples documentos
  const [documentsList, setDocumentsList] = useState<any[]>([]);
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

  // --- LÓGICA DE SELECCIÓN DE ARCHIVOS MÚLTIPLES ---
  const handleSelectFile = () => {
      Alert.alert("Añadir Documento", "Elige el formato", [
          { text: "📷 Cámara", onPress: openCamera },
          { text: "🖼️ Galería", onPress: openGallery },
          { text: "📄 PDF", onPress: pickDocument },
          { text: "Cancelar", style: "cancel" }
      ]);
  };

  const addFileToList = (asset: any, type: 'image' | 'pdf', defaultName: string) => {
    const newDoc = {
        id: Date.now().toString(),
        asset: asset,
        type: type,
        customName: defaultName
    };
    setDocumentsList([...documentsList, newDoc]);
  };

  const openCamera = async () => {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!result.canceled) addFileToList(result.assets[0], 'image', `Certificado_${Date.now()}.jpg`);
  };

  const openGallery = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled) addFileToList(result.assets[0], 'image', result.assets[0].fileName || `Certificado_${Date.now()}.jpg`);
  };

  const pickDocument = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
          if (!result.canceled && result.assets) {
              addFileToList(result.assets[0], 'pdf', result.assets[0].name);
          }
      } catch (err) { console.log(err); }
  };

  const removeDocument = (id: string) => {
    setDocumentsList(documentsList.filter(doc => doc.id !== id));
  };

  const updateDocName = (id: string, newName: string) => {
    setDocumentsList(documentsList.map(doc => 
        doc.id === id ? { ...doc, customName: newName } : doc
    ));
  };

  const handleSubmitAppeal = async () => {
      if (documentsList.length === 0) return Alert.alert("Error", "Debes añadir al menos un archivo.");
      
      const hasEmptyNames = documentsList.some(doc => !doc.customName.trim());
      if (hasEmptyNames) return Alert.alert("Error", "Todos los archivos deben tener un nombre.");

      setUploading(true);
      try {
          // Subir todos los documentos uno por uno
          for (const doc of documentsList) {
              let docUrl = "";
              if (doc.type === 'image') {
                  docUrl = await uploadImageToCloudinary(doc.asset.uri);
              } else {
                  docUrl = await uploadFileToCloudinary(doc.asset.uri, doc.customName, doc.asset.mimeType || 'application/pdf');
              }
              
              // Enviarlo al backend
              await api.post('/certifications/', { 
                  document_url: docUrl,
                  title: doc.customName // Si tu backend lo soporta
              });
          }
          
          Alert.alert("¡Enviado!", "Documentación subida correctamente.");
          setShowAppealModal(false);
          setDocumentsList([]);
          fetchExtraData(); 
      } catch (error) {
          Alert.alert("Error", "No se pudo subir la documentación.");
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

  const handleLevelInfo = () => {
      let title = "Nivel Desconocido";
      let msg = "No se pudo determinar tu nivel actual.";
      
      if (certLevel === 'BASIC' || certLevel === 'GREEN') {
          title = "Nivel Básico (Verde) 🟢";
          msg = "Estás validado en el sistema. Puedes ofrecer servicios de paseo y cuidado básico, pero no servicios médicos ni de entrenamiento avanzado.";
      } else if (certLevel === 'INTERMEDIATE' || certLevel === 'YELLOW') {
          title = "Nivel Intermedio (Amarillo) 🟡";
          msg = "Tienes certificaciones técnicas. Puedes ofrecer servicios de Grooming, primeros auxilios básicos y entrenamiento intermedio.";
      } else if (certLevel === 'ADVANCED' || certLevel === 'RED') {
          title = "Nivel Avanzado (Rojo) 🔴";
          msg = "Eres un profesional médico o especialista. Tienes permiso total para ofrecer servicios de Veterinaria y procedimientos complejos.";
      }

      Alert.alert(title, msg, [{ text: "Entendido" }]);
  };

  const getLevelBadge = () => {
      if (!certLevel) return null;
      let color = COLORS.success; 
      let text = "Básico (Verde)";
      if (certLevel === 'INTERMEDIATE' || certLevel === 'YELLOW') { color = '#F59E0B'; text = "Intermedio (Amarillo)"; } 
      else if (certLevel === 'ADVANCED' || certLevel === 'RED') { color = '#EF4444'; text = "Avanzado (Rojo)"; }

      return (
          <View style={[styles.levelBadgeContainer, { backgroundColor: color }]}>
              <Ionicons name="medal" size={14} color={COLORS.white} />
              <Text style={styles.levelBadgeText}>Nivel {text}</Text>
          </View>
      );
  };

  const fetchExtraData = async () => {
      if (!user) return;
      try {
         if(myServices.length === 0 && myPets.length === 0 && myProducts.length === 0) setLoading(true);

         // 1. Traer certificaciones
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

         // 2. Traer Mascotas o Servicios
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

         // 3. Traer Productos del Marketplace
         try {
            const productsRes = await api.get('/marketplace/mine/');
            if(isMounted.current) setMyProducts(productsRes.data);
         } catch(e) {
            console.log("Aún no tiene productos en el marketplace");
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
                text: "Editar", 
                onPress: () => {
                    if (type === 'pet') navigation.navigate('EditPet', { pet: item });
                    else navigation.navigate('EditService', { service: item });
                }
            },
            { 
                text: "Eliminar", style: "destructive",
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

  const handlePayProductFee = (item: any) => {
      Alert.alert(
          "Pagar Publicación",
          `La tarifa de publicación para "${item.title}" es de $${item.calculated_fee.toLocaleString('es-CL')}. \n\nPronto te redirigiremos a MercadoPago para completar esta transacción.`,
          [{ text: "Entendido", style: "default" }]
      );
  };

  // ----------------------------------------------------
  // RENDERIZADOS DE TARJETAS
  // ----------------------------------------------------
  const renderServiceItem = ({ item }: { item: any }) => {
    const imageUrl = Array.isArray(item.photos_url) && item.photos_url.length > 0 ? item.photos_url[0] : item.image;
    return (
        <View style={styles.itemCard}>
            <View style={styles.itemImageThumb}>
                {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" /> : <Ionicons name="briefcase" size={24} color="#ccc" />}
            </View>
            <View style={{flex: 1, paddingLeft: 12}}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemPrice}>${item.price.toLocaleString('es-CL')}</Text>
            </View>
            <TouchableOpacity style={styles.optionsButton} onPress={() => handleOptions(item, 'service')}>
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
        </View>
    );
  };

  const renderPetItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
        <View style={styles.itemImageThumb}>
            {item.photos_url && item.photos_url.length > 0 
                ? <Image source={{ uri: item.photos_url[0] }} style={styles.itemImage} resizeMode="cover" /> 
                : <Ionicons name="paw" size={24} color="#ccc" />
            }
        </View>
        <View style={{flex: 1, paddingLeft: 12}}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.breed_name || "Mascota Innpets"}</Text>
        </View>
        <TouchableOpacity style={styles.optionsButton} onPress={() => handleOptions(item, 'pet')}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
    </View>
  );

  const renderProductItem = ({ item }: { item: any }) => {
    const imageUrl = Array.isArray(item.photos_url) && item.photos_url.length > 0 ? item.photos_url[0] : null;
    
    let statusConfig = { text: 'Desconocido', bg: '#EEE', color: '#666' };
    if (item.status === 'PE') statusConfig = { text: 'En Revisión', bg: '#FFF3E0', color: '#E65100' };
    if (item.status === 'PP') statusConfig = { text: 'Pendiente Pago', bg: '#FFEBEE', color: '#D32F2F' };
    if (item.status === 'AP') statusConfig = { text: 'Publicado', bg: '#E8F5E9', color: '#2E7D32' };
    if (item.status === 'RE') statusConfig = { text: 'Rechazado', bg: '#F5F5F5', color: '#616161' };
    if (item.status === 'SO') statusConfig = { text: 'Vendido', bg: '#E3F2FD', color: '#1565C0' };

    return (
        <View style={styles.itemCard}>
            <View style={styles.itemImageThumb}>
                {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" /> : <Ionicons name="cart" size={24} color="#ccc" />}
            </View>
            <View style={{flex: 1, paddingLeft: 12}}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemPrice}>${Number(item.price).toLocaleString('es-CL')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
                </View>
            </View>

            {item.status === 'PP' ? (
                <TouchableOpacity style={styles.payBtn} onPress={() => handlePayProductFee(item)}>
                    <Text style={styles.payBtnText}>Pagar Tarifa</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.optionsButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            )}
        </View>
    );
  };

  const renderOwnerView = () => {
      if (certification && certification.status === 'APPROVED') return null;

      if (certification && (certification.status === 'PENDING' || certification.status === 'REJECTED')) {
          const isPending = certification.status === 'PENDING';
          const icon = isPending ? 'time' : 'close-circle';
          const color = isPending ? COLORS.primary : COLORS.danger;

          return (
             <TouchableOpacity style={styles.statusBox} onPress={handleStatusCardClick}>
                  <Ionicons name={icon} size={28} color={color} style={{marginRight: 12}} />
                  <View style={{flex: 1}}>
                      <Text style={styles.statusTitle}>{isPending ? 'Solicitud en Revisión' : 'Solicitud Rechazada'}</Text>
                      <Text style={styles.statusSubtitle}>{isPending ? 'Estamos validando tus datos.' : 'Toca aquí para apelar.'}</Text>
                  </View>
             </TouchableOpacity>
          );
      }
      
      return (
          <TouchableOpacity style={styles.ctaCard} onPress={() => navigation.navigate('BecomeProvider')}>
              <View style={styles.ctaIconBox}>
                  <Ionicons name="briefcase" size={24} color={COLORS.white} />
              </View>
              <View style={{flex: 1}}>
                  <Text style={styles.ctaTitle}>¿Eres Cuidador?</Text>
                  <Text style={styles.ctaText}>Certifícate y ofrece tus servicios.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
      );
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
                 <TouchableOpacity style={[styles.statusBox, { borderColor: '#FFB74D', backgroundColor: '#FFF3E0' }]} onPress={handleStatusCardClick}>
                    <Ionicons name="warning" size={28} color="#E65100" style={{marginRight: 12}} />
                    <View style={{flex: 1}}>
                        <Text style={[styles.statusTitle, {color: '#E65100'}]}>Cuenta no Verificada</Text>
                        <Text style={styles.statusSubtitle}>
                            {certification?.status === 'PENDING' ? 'Esperando aprobación...' : 'Debes enviar tu documentación.'}
                        </Text>
                    </View>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowAppealModal(true)}>
                     <Text style={styles.outlineBtnText}>Subir Documentación</Text>
                 </TouchableOpacity>
             </View>
          );
      }

      return (
         <View>
             <Text style={styles.sectionTitleSmall}>Estado de tu Cuenta</Text>
             
             <View style={styles.activeCertCard}>
                <Ionicons name="checkmark-circle" size={30} color={COLORS.success} style={{marginRight: 12}} />
                <View style={{flex: 1}}>
                    <Text style={styles.activeCertTitle}>Certificado Activo</Text>
                    <Text style={styles.activeCertSubtitle}>{levelLabels[certification?.level] || 'Verificado'}</Text>
                </View>
                <TouchableOpacity onPress={handleLevelInfo} style={{padding: 5}}>
                    <Ionicons name="help-circle-outline" size={26} color={COLORS.textLight} />
                </TouchableOpacity>
             </View>

             <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowAppealModal(true)}>
                 <Text style={styles.outlineBtnText}>Actualizar Nivel / Certificación</Text>
             </TouchableOpacity>
         </View>
      );
  };

  if (!user && loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!user) return <View style={styles.center}><Text>No se pudo cargar el perfil.</Text></View>;

  const userName = `${user.first_name} ${user.last_name}`;
  const showSwitchButton = user.user_type === 'IP' || (certification && certification.status === 'APPROVED');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerCurve}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
                    <Ionicons name="pencil" size={18} color={COLORS.textDark} />
                </TouchableOpacity>
            </View>
            
            <View style={styles.avatarContainer}>
                <Image source={{ uri: getProfileImage() }} style={styles.avatarImage} />
            </View>
            <Text style={styles.name}>{userName}</Text>
            
            {user.user_type === 'IP' && getLevelBadge()}
          </View>

          <View style={styles.switchContainer}>
              <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{user.user_type === 'PP' ? 'MODO DUEÑO' : 'MODO PROVEEDOR'}</Text>
              </View>

              {showSwitchButton && (
                  <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchRole}>
                    <Ionicons name={user.user_type === 'PP' ? 'swap-horizontal' : 'home'} size={18} color={COLORS.white} />
                    <Text style={styles.switchText}>
                        {user.user_type === 'PP' ? 'Cambiar a Proveedor' : 'Volver a Dueño'}
                    </Text>
                  </TouchableOpacity>
              )}
          </View>

          <View style={styles.dividerLight} />

          <View style={styles.contentSection}>
              {user.user_type === 'PP' ? (
                  <>
                      {renderOwnerView()}
                      <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Mis Mascotas</Text>
                          <TouchableOpacity style={styles.addBtnSmall} onPress={() => navigation.navigate('CreatePet')}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                              <Text style={styles.addBtnText}>Agregar</Text>
                          </TouchableOpacity>
                      </View>
                      {myPets.length > 0 ? (
                          <FlatList data={myPets} keyExtractor={(item) => item.id.toString()} renderItem={renderPetItem} scrollEnabled={false} />
                      ) : (
                          <View style={styles.emptyState}>
                              <Ionicons name="paw-outline" size={40} color="#ccc" />
                              <Text style={styles.emptyText}>No tienes mascotas registradas.</Text>
                          </View>
                      )}
                  </>
              ) : (
                  <>
                       {renderProviderView()}
                       <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Mis Servicios</Text>
                          <TouchableOpacity style={styles.addBtnSmall} onPress={handleCreateService}>
                              <Ionicons name="add" size={16} color={COLORS.white} />
                              <Text style={styles.addBtnText}>Crear</Text>
                          </TouchableOpacity>
                      </View>
                      {myServices.length > 0 ? (
                          <FlatList data={myServices} keyExtractor={(item) => item.id.toString()} renderItem={renderServiceItem} scrollEnabled={false} />
                      ) : (
                          <View style={styles.emptyState}>
                              <Ionicons name="briefcase-outline" size={40} color="#ccc" />
                              <Text style={styles.emptyText}>No has publicado servicios activos.</Text>
                          </View>
                      )}
                  </>
              )}

              <View style={styles.dividerLight} />
              
              <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🛍️ Mis Productos</Text>
                  <TouchableOpacity style={styles.addBtnSmall} onPress={() => navigation.navigate('CreateMarketplaceItem')}>
                      <Ionicons name="pricetag" size={14} color={COLORS.white} />
                      <Text style={styles.addBtnText}>Vender</Text>
                  </TouchableOpacity>
              </View>

              {myProducts.length > 0 ? (
                  <FlatList data={myProducts} keyExtractor={(item) => item.id.toString()} renderItem={renderProductItem} scrollEnabled={false} />
              ) : (
                  <View style={styles.emptyState}>
                      <Ionicons name="storefront-outline" size={40} color="#ccc" />
                      <Text style={styles.emptyText}>No tienes productos a la venta.</Text>
                  </View>
              )}

          </View>
      </ScrollView>

      {/* 🔥 MODAL PARA SUBIR DOCUMENTOS (MEJORADO) */}
      <Modal visible={showAppealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                
                <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>Certificaciones</Text>
                    <TouchableOpacity onPress={() => { setShowAppealModal(false); setDocumentsList([]); }}>
                        <Ionicons name="close" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                </View>

                {/* 🔥 BANNER AMARILLO GIGANTE */}
                <View style={styles.warningBanner}>
                    <Ionicons name="alert-circle" size={24} color="#856404" />
                    <Text style={styles.warningText}>
                        <Text style={{fontWeight: 'bold'}}>IMPORTANTE:</Text> Es obligatorio adjuntar tu <Text style={{fontWeight: 'bold'}}>Certificado de Antecedentes Penales</Text> para validar que no existan antecedentes de maltrato animal. Sin él, la solicitud será rechazada.
                    </Text>
                </View>
                
                <Text style={styles.modalSubtitle}>Historial de solicitudes:</Text>
                <View style={styles.historyList}>
                    {allCertifications.length > 0 ? (
                        <FlatList 
                            data={allCertifications}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({item}) => (
                                <View style={styles.historyItem}>
                                    <Text style={{fontSize:13, color: '#555'}}>📅 {new Date(item.created_at).toLocaleDateString()}</Text>
                                    <Text style={{fontSize:13, fontWeight:'bold', color: item.status==='APPROVED'? COLORS.success :(item.status==='REJECTED'? COLORS.danger : COLORS.primary)}}>
                                        {item.status === 'APPROVED' ? 'Aprobado' : (item.status === 'REJECTED' ? 'Rechazado' : 'Pendiente')}
                                    </Text>
                                </View>
                            )}
                        />
                    ) : <Text style={{fontSize:13, color:'#999', fontStyle: 'italic'}}>No hay historial.</Text>}
                </View>

                <View style={styles.dividerLight}/>
                
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                    <Text style={styles.modalSubtitle}>Subir nuevos documentos:</Text>
                    <TouchableOpacity style={styles.addSmallBtn} onPress={handleSelectFile}>
                        <Ionicons name="add-circle" size={18} color={COLORS.white} />
                        <Text style={{color: COLORS.white, fontWeight: 'bold', marginLeft: 4, fontSize: 12}}>Añadir</Text>
                    </TouchableOpacity>
                </View>

                {documentsList.length > 0 ? (
                    <ScrollView style={{maxHeight: 180, marginBottom: 15}} showsVerticalScrollIndicator={false}>
                        <View style={{gap: 10}}>
                            {documentsList.map((doc) => (
                                <View key={doc.id} style={styles.docCard}>
                                    <View style={styles.docInfo}>
                                        <Text style={{fontSize: 20}}>{doc.type === 'image' ? '🖼️' : '📄'}</Text>
                                        <View style={{flex: 1, marginLeft: 10}}>
                                            <TextInput 
                                                style={styles.docInputName}
                                                value={doc.customName}
                                                onChangeText={(val) => updateDocName(doc.id, val)}
                                                placeholder="Ej: Título Vet o Antecedentes"
                                                placeholderTextColor="#999"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => removeDocument(doc.id)}>
                                            <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <TouchableOpacity style={styles.uploadBox} onPress={handleSelectFile}>
                        <Ionicons name="cloud-upload-outline" size={30} color={COLORS.primary} />
                        <Text style={{color:COLORS.primary, fontWeight:'bold', marginTop: 5}}>Toca para subir carnet y antecedentes</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={[styles.modalSubmit, (documentsList.length === 0 || uploading) && {opacity: 0.6}]} 
                    onPress={handleSubmitAppeal} 
                    disabled={uploading || documentsList.length === 0}
                >
                    {uploading ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalSubmitText}>Enviar a Revisión</Text>}
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerCurve: { backgroundColor: COLORS.white, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 25, alignItems: 'center', ...SHADOWS.card },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: 15, alignItems: 'center' },
  topBarTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textDark },
  editBtn: { padding: 8, backgroundColor: '#F0F0F0', borderRadius: 20 },
  
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EAEAEA', alignItems: 'center', justifyContent: 'center', marginBottom: 15, marginTop: 10, overflow: 'hidden', borderWidth: 3, borderColor: COLORS.white, ...SHADOWS.card },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  name: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.textDark },
  
  levelBadgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  levelBadgeText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12, marginLeft: 4 },

  switchContainer: { paddingHorizontal: 20, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  roleTagText: { color: COLORS.success, fontFamily: FONTS.bold, fontSize: 12 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.textDark, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 },
  
  dividerLight: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 20 },
  
  contentSection: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  sectionTitleSmall: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textLight, marginBottom: 10, textTransform: 'uppercase' },
  
  addBtnSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 4 },
  
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.white, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  emptyText: { marginTop: 10, fontFamily: FONTS.regular, color: COLORS.textLight, fontSize: 14 },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', ...SHADOWS.card },
  itemImageThumb: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.textDark, marginBottom: 2 },
  itemSubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textLight },
  itemPrice: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
  optionsButton: { padding: 10 },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontFamily: FONTS.bold },
  
  payBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 10 },
  payBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12 },

  statusBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#90CAF9', backgroundColor: '#E3F2FD', marginBottom: 20 },
  statusTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.textDark, marginBottom: 2 },
  statusSubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textDark },
  
  ctaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 18, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0', ...SHADOWS.card },
  ctaIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  ctaTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textDark },
  ctaText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 2 },
  
  activeCertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6FEF9', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#A5D6A7', marginBottom: 15 },
  activeCertTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#2E7D32', marginBottom: 2 },
  activeCertSubtitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textDark },

  outlineBtn: { backgroundColor: COLORS.white, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, marginBottom: 20 },
  outlineBtnText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textDark },
  modalSubtitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 5 },
  
  // 🔥 ESTILOS NUEVOS
  warningBanner: { backgroundColor: '#fff3cd', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#ffeeba' },
  warningText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#856404', lineHeight: 18 },
  addSmallBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  docCard: { backgroundColor: COLORS.background, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  docInfo: { flexDirection: 'row', alignItems: 'center' },
  docInputName: { fontWeight: 'bold', color: COLORS.primary, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 2, fontSize: 13 },
  
  historyList: { width: '100%', maxHeight: 120, backgroundColor: '#F8F9FA', borderRadius: 12, padding: 10 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  
  uploadBox: { width: '100%', padding: 20, backgroundColor: '#F0F8FF', borderWidth: 1, borderColor: '#90CAF9', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  
  modalSubmit: { width: '100%', paddingVertical: 16, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 16, marginTop: 10 },
  modalSubmitText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 }
});

export default ProfileScreen;