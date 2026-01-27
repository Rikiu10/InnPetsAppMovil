import React, { useState, useCallback, useRef, useEffect } from 'react';
// 👇 1. IMPORTANTE: Agregamos 'Image' a los imports
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme'; 
import { useFocusEffect, CompositeScreenProps } from '@react-navigation/native';
import api, { authService } from '../services/api'; 
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Perfil'>,
  CompositeScreenProps<NativeStackScreenProps<RootStackParamList>, DrawerScreenProps<any>>
>;

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const { user, setUser, refreshUser } = useAuth(); 
  
  const [loading, setLoading] = useState(false);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [myPets, setMyPets] = useState<any[]>([]);

  const isMounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchExtraData();

      return () => { isMounted.current = false; }; 
    }, [user?.user_type, user?.id]) 
  );

  const fetchExtraData = async () => {
      if (!user) return;
      
      try {
         if(myServices.length === 0 && myPets.length === 0) setLoading(true);

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
      } catch (error) {
         console.error("Error cargando datos extra:", error);
      } finally {
         if (isMounted.current) setLoading(false);
      }
  };

  const handleSwitchRole = async () => {
    if (!user) return;

    const hasProviderProfile = !!user.provider_profile || user.has_provider_profile;

    if (user.user_type === 'PP') {
      if (hasProviderProfile) {
          toggleRoleApi(); 
      } else {
          navigation.navigate('BecomeProvider', { user: { id: user.id } });
      }
    } else {
      Alert.alert(
        "Modo Dueño", 
        "Tus servicios dejarán de ser visibles temporalmente.", 
        [
          { text: "Cancelar", style: "cancel" }, 
          { text: "Cambiar", onPress: toggleRoleApi }
        ]
      );
    }
  };

  const toggleRoleApi = async () => {
    try {
      setLoading(true);
      const data = await authService.switchRole();
      
      if (data.user) {
          setUser(data.user);
      } else {
          if(user) setUser({ ...user, user_type: data.new_role });
      }
      
      setMyServices([]);
      setMyPets([]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cambiar el rol");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // 👇 2. LÓGICA CORREGIDA PARA SERVICIOS (Detecta foto o muestra maletín)
  const renderServiceItem = ({ item }: { item: any }) => {
    // Intenta obtener la imagen (ya sea lista o string)
    const imageUrl = Array.isArray(item.photos_url) && item.photos_url.length > 0 
        ? item.photos_url[0] 
        : item.image;

    return (
        <View style={styles.card}>
            <View style={{flex: 1, paddingRight: 10}}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>${item.price}</Text>
            </View>
            
            <View style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' }}>
                {imageUrl ? (
                    <Image 
                        source={{ uri: imageUrl }} 
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <Text style={{fontSize: 24}}>💼</Text>
                )}
            </View>
        </View>
    );
  };

  // 👇 3. LÓGICA CORREGIDA PARA MASCOTAS (Usa photos_url[0])
  const renderPetItem = ({ item }: { item: any }) => (
    <View style={styles.petCard}>
        <View style={styles.petAvatar}>
            {/* Si existe la lista y tiene elementos, mostramos la primera foto */}
            {item.photos_url && item.photos_url.length > 0 ? (
                <Image 
                    source={{ uri: item.photos_url[0] }} 
                    style={{ width: '100%', height: '100%', borderRadius: 30 }}
                    resizeMode="cover"
                />
            ) : (
                <Text style={{fontSize: 30}}>🐶</Text>
            )}
        </View>

        <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
                {item.breed_name || "Raza desconocida"}
            </Text>
            <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Código:</Text>
                <Text style={styles.codeValue}>{item.code}</Text>
            </View>
        </View>
    </View>
  );

  const renderContent = () => {
    if (!user) return null;

    if (user.user_type === 'PP') {
        return (
            <View style={styles.contentSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🐶 Mis Mascotas</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreatePet')}>
                        <Text style={styles.addButtonText}>+ Agregar</Text>
                    </TouchableOpacity>
                </View>
                {myPets.length > 0 ? (
                    <FlatList data={myPets} keyExtractor={(item) => item.id.toString()} renderItem={renderPetItem} scrollEnabled={false} />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{fontSize: 40}}>🐕</Text>
                        <Text style={styles.emptyText}>No tienes mascotas registradas.</Text>
                    </View>
                )}
            </View>
        );
    } else {
        return (
            <View style={styles.contentSection}>
                 <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🛠️ Mis Servicios</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateService')}>
                        <Text style={styles.addButtonText}>+ Crear</Text>
                    </TouchableOpacity>
                </View>
                {myServices.length > 0 ? (
                    <FlatList data={myServices} keyExtractor={(item) => item.id.toString()} renderItem={renderServiceItem} scrollEnabled={false} />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{fontSize: 40}}>💼</Text>
                        <Text style={styles.emptyText}>No has publicado servicios activos.</Text>
                    </View>
                )}
            </View>
        );
    }
  };

  if (!user && loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  
  if (!user) return <View style={styles.center}><Text>No se pudo cargar el perfil.</Text></View>;

  const userName = `${user.first_name} ${user.last_name}`;
  const hasProviderProfile = !!user.provider_profile || user.has_provider_profile;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.header}>
            <View style={styles.topBar}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={() => navigation.openDrawer()}><Text style={{fontSize: 24}}>☰</Text></TouchableOpacity>
            </View>
            <View style={styles.avatarContainer}>
                <Text style={{fontSize: 40}}>{user.user_type === 'PP' ? '👤' : '🛠️'}</Text>
            </View>
            <Text style={styles.name}>{userName}</Text>
            <View style={[styles.badge, { backgroundColor: user.user_type === 'PP' ? COLORS.primaryLight : '#dcedc8' }]}>
                <Text style={[styles.roleText, { color: user.user_type === 'PP' ? COLORS.primary : COLORS.success }]}>
                    {user.user_type === 'PP' ? 'Modo: Dueño' : 'Modo: Proveedor'}
                </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.switchBtn, { backgroundColor: user.user_type === 'PP' ? COLORS.primary : COLORS.danger }]} 
            onPress={handleSwitchRole}
          >
            <Text style={styles.switchText}>
                {user.user_type === 'PP' 
                ? (hasProviderProfile ? '🔄 Cambiar a Modo Proveedor' : '🚀 Convertirme en Proveedor') 
                : '🏡 Volver a modo Dueño'}
            </Text>
          </TouchableOpacity>

          {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20, padding: 20, backgroundColor: COLORS.white, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...SHADOWS.card },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 10, marginTop: 20 },
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
  cardSubtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 5 },
  cardPrice: { fontFamily: FONTS.bold, color: COLORS.success },
  petCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', ...SHADOWS.card },
  petAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5E6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, // Added overflow hidden for cleaner image corners
  codeContainer: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', marginTop: 5 },
  codeLabel: { fontSize: 12, color: '#666', marginRight: 5 },
  codeValue: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 1 }
});

export default ProfileScreen;