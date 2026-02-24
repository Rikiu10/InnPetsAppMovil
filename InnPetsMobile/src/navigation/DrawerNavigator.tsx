import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS, FONTS } from '../constants/theme';
import { View, Text } from 'react-native';

// Importa tus pantallas
import MainNavigator from './MainNavigator'; 
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawer from './CustomDrawer';
import ReservasScreen from '../screens/ReservasScreen';
import ChatListScreen from '../screens/ChatListScreen';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      id="DrawerNavigator" 
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
      <Drawer.Screen name="Inicio" component={MainNavigator} />
      <Drawer.Screen name="Mi Perfil" component={ProfileScreen} />
      <Drawer.Screen 
        name="Reservas" 
        component={ReservasScreen} 
        options={{
          title: 'Mis Reservas',
          drawerIcon: ({color}) => <Text style={{fontSize: 20, color}}>📅</Text>
        }}
      />

      <Drawer.Screen 
        name="ChatList" 
        component={ChatListScreen} 
        initialParams={{ mode: 'normal' }} // 👈 IMPORTANTE
        options={{
          title: 'Mis Mensajes',
          drawerIcon: ({color}) => <Text style={{fontSize: 20, color}}>💬</Text>
        }}
      />

      {/* 👇 RUTA OCULTA DEL MENU (Se accede desde el CustomDrawer) */}
      <Drawer.Screen 
        name="SupportTickets" 
        component={ChatListScreen} 
        initialParams={{ mode: 'support' }} // 👈 IMPORTANTE
        options={{
          drawerItemStyle: { display: 'none' } // Oculta el botón duplicado estándar
        }}
      />

    </Drawer.Navigator>
  );
};

export default DrawerNavigator;