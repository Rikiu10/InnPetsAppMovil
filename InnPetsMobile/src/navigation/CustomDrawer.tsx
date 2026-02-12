import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext'; 
import { COLORS, FONTS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
// 👇 Importamos iconos para que se vea bonito
import { Ionicons } from '@expo/vector-icons'; 

const CustomDrawer = (props: any) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets(); 
  
  const defaultImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const getPhotoUrl = () => {
    if (!user) return defaultImage;
    const providerData = user.provider_profile?.photos_url;
    if (Array.isArray(providerData) && providerData.length > 0) return providerData[0];
    if (typeof providerData === 'string' && providerData) return providerData;
    
    const parentData = user.pet_parent_profile?.photo_identification_url;
    if (Array.isArray(parentData) && parentData.length > 0) return parentData[0];
    if (typeof parentData === 'string' && parentData) return parentData;

    return defaultImage;
  };

  const userPhoto = getPhotoUrl(); 

  const handleLogout = async () => {
    await logout(); 
    setTimeout(() => {
        props.navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }, 300);
  };

  // 👇 Handler para ir a Ticket
  const handleSupport = () => {
      props.navigation.navigate('CreateTicket'); 
      // Asegúrate de que 'CreateTicket' esté registrado en tu Stack Navigator principal
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ backgroundColor: COLORS.primary }}
      >
        {/* CABECERA */}
        <ImageBackground 
            source={{uri: 'https://img.freepik.com/free-vector/paw-print-background_1017-30882.jpg'}} 
            style={{padding: 20}}
            imageStyle={{opacity: 0.1}}
        >
            <View style={styles.profileContainer}>
                <Image source={{ uri: userPhoto }} style={styles.profileImage} />
                <Text style={styles.userName}>
                    {user ? `${user.first_name} ${user.last_name}` : 'Bienvenido'}
                </Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                        {user?.user_type === 'PP' ? '🐶 Dueño de Mascota' : '🛠️ Proveedor'}
                    </Text>
                </View>
            </View>
        </ImageBackground>

        {/* LISTA DE PANTALLAS */}
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 10 }}>
          <DrawerItemList {...props} />

          {/* 👇 BOTÓN EXTRA: SOPORTE / TICKET */}
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <TouchableOpacity 
                  onPress={handleSupport} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}
              >
                  {/* Icono de salvavidas o ayuda */}
                  <Ionicons name="help-buoy-outline" size={24} color={COLORS.textLight || '#666'} style={{ marginRight: 30 }} />
                  <Text style={{ fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textDark || '#333' }}>
                      Soporte / Ayuda
                  </Text>
              </TouchableOpacity>
          </View>

        </View>
      </DrawerContentScrollView>

      {/* FOOTER (Cerrar Sesión) */}
      <View style={{ 
          padding: 20, 
          borderTopWidth: 1, 
          borderTopColor: '#ccc',
          paddingBottom: 20 + insets.bottom 
      }}>
        <TouchableOpacity onPress={handleLogout} style={{flexDirection: 'row', alignItems: 'center'}}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.textDark} style={{ marginRight: 10 }} />
          <Text style={{fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark}}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileContainer: { alignItems: 'center', marginBottom: 10 },
  profileImage: { height: 80, width: 80, borderRadius: 40, marginBottom: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: '#ccc' },
  userName: { color: '#fff', fontSize: 18, fontFamily: FONTS.bold, marginBottom: 5, textAlign: 'center' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});

export default CustomDrawer;