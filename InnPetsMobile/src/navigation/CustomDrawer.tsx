import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext'; 
import { COLORS, FONTS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons'; 

const CustomDrawer = (props: any) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets(); 
  
  const defaultImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  // Lógica para mostrar la foto SEGÚN EL ROL ACTIVO
  const getPhotoUrl = () => {
    if (!user) return defaultImage;

    // A. Si está en modo PROVEEDOR, mostramos foto de proveedor
    if (user.user_type === 'IP') {
        const photos = user.provider_profile?.photos_url;
        if (Array.isArray(photos) && photos.length > 0) return photos[0];
    }
    
    // B. Si está en modo DUEÑO, mostramos foto de dueño
    if (user.user_type === 'PP') {
        const photo = user.pet_parent_profile?.photo_identification_url;
        if (photo) return photo;
    }

    // C. Si no hay foto específica, o falla algo, imagen por defecto
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

  const handleSupport = () => {
      props.navigation.navigate('CreateTicket'); 
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ backgroundColor: COLORS.primary }}
      >
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

        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 10 }}>
          <DrawerItemList {...props} />

          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <TouchableOpacity 
                  onPress={handleSupport} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}
              >
                  <Ionicons name="help-buoy-outline" size={24} color={COLORS.textLight || '#666'} style={{ marginRight: 30 }} />
                  <Text style={{ fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textDark || '#333' }}>
                      Soporte / Ayuda
                  </Text>
              </TouchableOpacity>
          </View>

        </View>
      </DrawerContentScrollView>

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