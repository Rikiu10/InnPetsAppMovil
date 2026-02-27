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

  const getPhotoUrl = () => {
    if (!user) return defaultImage;
    if (user.user_type === 'IP') {
        const photos = user.provider_profile?.photos_url;
        if (Array.isArray(photos) && photos.length > 0) return photos[0];
    }
    if (user.user_type === 'PP') {
        const photo = user.pet_parent_profile?.photo_identification_url;
        if (photo) return photo;
    }
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
      props.navigation.navigate('SupportTickets'); 
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ backgroundColor: COLORS.primary, paddingTop: 0 }} // paddingTop 0 para que el color llene la barra de estado
        bounces={false}
      >
        {/* HEADER DEL MENÚ */}
        <ImageBackground 
            source={{uri: 'https://img.freepik.com/free-vector/paw-print-background_1017-30882.jpg'}} 
            style={[styles.headerBg, { paddingTop: insets.top + 20 }]}
            imageStyle={{opacity: 0.15}}
        >
            <View style={styles.profileContainer}>
                <Image source={{ uri: userPhoto }} style={styles.profileImage} />
                <View style={styles.profileTextContainer}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {user ? `${user.first_name} ${user.last_name}` : 'Bienvenido'}
                    </Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name={user?.user_type === 'PP' ? 'paw' : 'briefcase'} size={12} color="#fff" style={{marginRight: 4}} />
                        <Text style={styles.roleText}>
                            {user?.user_type === 'PP' ? 'Dueño de Mascota' : 'Proveedor'}
                        </Text>
                    </View>
                </View>
            </View>
        </ImageBackground>

        {/* LISTA DE NAVEGACIÓN */}
        <View style={styles.drawerListContainer}>
          <DrawerItemList {...props} />

          <View style={styles.divider} />
          
          {/* BOTÓN DE SOPORTE ALINEADO PERFECTAMENTE */}
          <TouchableOpacity onPress={handleSupport} style={styles.customItem}>
              <View style={styles.customItemIcon}>
                  <Ionicons name="help-buoy-outline" size={22} color="#4A4A4A" />
              </View>
              <Text style={styles.customItemText}>Soporte / Ayuda</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* FOOTER - CERRAR SESIÓN */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger || '#D32F2F'} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Estilos del Header
  headerBg: {
      paddingHorizontal: 20,
      paddingBottom: 30,
      backgroundColor: COLORS.primary,
  },
  profileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  profileImage: { 
      height: 65, 
      width: 65, 
      borderRadius: 35, 
      borderWidth: 2, 
      borderColor: '#fff', 
      backgroundColor: '#EAEAEA',
      marginRight: 15
  },
  profileTextContainer: {
      flex: 1,
  },
  userName: { 
      color: '#fff', 
      fontSize: 18, 
      fontFamily: FONTS.bold, 
      marginBottom: 4 
  },
  roleBadge: { 
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)', 
      paddingHorizontal: 10, 
      paddingVertical: 5, 
      borderRadius: 12,
      alignSelf: 'flex-start'
  },
  roleText: { 
      color: '#fff', 
      fontSize: 12, 
      fontFamily: FONTS.semiBold 
  },
  
  // Estilos de la Lista
  drawerListContainer: { 
      flex: 1, 
      backgroundColor: COLORS.white, 
      paddingTop: 15,
      paddingHorizontal: 10,
  },
  divider: {
      height: 1,
      backgroundColor: '#F0F0F0',
      marginVertical: 10,
      marginHorizontal: 10
  },
  
  // Estilo del botón de Soporte (Mimetizado con los del sistema)
  customItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
  },
  customItemIcon: {
      width: 35, 
      alignItems: 'flex-start',
      marginLeft: 6
  },
  customItemText: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: '#4A4A4A',
      marginLeft: 3,
  },
  
  // Estilos del Footer
  footer: { 
      paddingTop: 15,
      paddingHorizontal: 20, 
      borderTopWidth: 1, 
      borderTopColor: '#F0F0F0', 
      backgroundColor: COLORS.white
  },
  logoutBtn: {
      flexDirection: 'row', 
      alignItems: 'center',
      backgroundColor: '#FFF0F0', // Rojo muy clarito
      paddingVertical: 14,
      paddingHorizontal: 15,
      borderRadius: 12,
  },
  logoutText: {
      fontSize: 15, 
      fontFamily: FONTS.bold, 
      color: COLORS.danger || '#D32F2F',
      marginLeft: 10
  }
});

export default CustomDrawer;