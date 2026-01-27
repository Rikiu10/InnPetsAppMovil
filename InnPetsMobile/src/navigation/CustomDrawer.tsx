import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext'; 
import { COLORS, FONTS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

const CustomDrawer = (props: any) => {
  // 👇 CONEXIÓN DIRECTA AL CEREBRO DE LA APP
  const { user, logout } = useAuth();
  
  // Medidas para no chocar con la barra de abajo en iPhones/Androids modernos
  const insets = useSafeAreaInsets(); 
  
  const defaultImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  // Lógica para intentar sacar la foto del perfil (si existe)
  const getPhotoUrl = () => {
    if (!user) return defaultImage;

    // 1. Intentar foto de Proveedor
    const providerData = user.provider_profile?.photos_url;
    if (Array.isArray(providerData) && providerData.length > 0) return providerData[0];
    if (typeof providerData === 'string' && providerData) return providerData;

    // 2. Intentar foto de Dueño
    const parentData = user.pet_parent_profile?.photo_identification_url;
    if (Array.isArray(parentData) && parentData.length > 0) return parentData[0];
    if (typeof parentData === 'string' && parentData) return parentData;

    // 3. Fallback
    return defaultImage;
  };

  const userPhoto = getPhotoUrl(); 

  const handleLogout = async () => {
    // 1. Limpiamos todo el almacenamiento y el contexto
    await logout(); 
    
    // 2. Navegamos al Login forzosamente
    // Usamos un pequeño delay para que la animación del menú cerrándose se vea bien
    setTimeout(() => {
        props.navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }, 300);
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ backgroundColor: COLORS.primary }}
      >
        {/* CABECERA CON IMAGEN DE FONDO */}
        <ImageBackground 
            source={{uri: 'https://img.freepik.com/free-vector/paw-print-background_1017-30882.jpg'}} 
            style={{padding: 20}}
            imageStyle={{opacity: 0.1}}
        >
            <View style={styles.profileContainer}>
                {/* FOTO DE PERFIL */}
                <Image 
                    source={{ uri: userPhoto }} 
                    style={styles.profileImage} 
                />
                
                {/* NOMBRE REAL (Traído del Contexto) */}
                <Text style={styles.userName}>
                    {user ? `${user.first_name} ${user.last_name}` : 'Bienvenido'}
                </Text>
                
                {/* ROL ACTUAL */}
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                        {user?.user_type === 'PP' ? '🐶 Dueño de Mascota' : '🛠️ Proveedor'}
                    </Text>
                </View>
            </View>
        </ImageBackground>

        {/* LISTA DE PANTALLAS (Fondo blanco) */}
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 10 }}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* FOOTER (Botón Cerrar Sesión) */}
      <View style={{ 
          padding: 20, 
          borderTopWidth: 1, 
          borderTopColor: '#ccc',
          paddingBottom: 20 + insets.bottom // Margen dinámico para seguridad
      }}>
        <TouchableOpacity onPress={handleLogout} style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{fontSize: 20, marginRight: 10}}>🚪</Text>
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