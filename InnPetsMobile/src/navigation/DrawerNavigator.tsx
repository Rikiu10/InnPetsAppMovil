import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS, FONTS } from '../constants/theme';
import { View, Text } from 'react-native';

// Importa tus pantallas
import MainNavigator from './MainNavigator'; 
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawer from './CustomDrawer';
import ReservasScreen from '../screens/ReservasScreen';
// 👇 1. Importamos la pantalla de lista de chats
import ChatListScreen from '../screens/ChatListScreen';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      id="DrawerNavigator" 
      
      // Menú lateral personalizado
      drawerContent={(props: any) => <CustomDrawer {...props} />}
      
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: COLORS.primaryLight,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: '#333',
        // @ts-ignore
        drawerLabelStyle: { marginLeft: 10, fontFamily: FONTS.semiBold, fontSize: 15 }
      }}
    >
      <Drawer.Screen 
        name="Inicio" 
        component={MainNavigator} 
      />

      <Drawer.Screen 
        name="Mi Perfil" 
        component={ProfileScreen} 
      />

      <Drawer.Screen 
        name="Reservas" 
        component={ReservasScreen} 
        options={{
          title: 'Mis Reservas',
          drawerIcon: ({color}) => <Text style={{fontSize: 20, color}}>📅</Text>
        }}
      />

      {/* 👇 2. Agregamos la opción de Mensajes */}
      <Drawer.Screen 
        name="ChatList" 
        component={ChatListScreen} 
        options={{
          title: 'Mis Mensajes',
          drawerIcon: ({color}) => <Text style={{fontSize: 20, color}}>💬</Text>
        }}
      />

    </Drawer.Navigator>
  );
};

export default DrawerNavigator;