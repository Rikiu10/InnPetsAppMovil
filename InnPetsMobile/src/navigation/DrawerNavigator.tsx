import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS, FONTS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons'; 

// Importa tus pantallas
import MainNavigator from './MainNavigator'; 
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawer from './CustomDrawer';
import ReservasScreen from '../screens/ReservasScreen';
import ChatListScreen from '../screens/ChatListScreen';

// 🔥 Importamos la pantalla de Adopciones
import AdoptionsScreen from '../screens/AdoptionsScreen';

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
        drawerInactiveTintColor: '#4A4A4A',
        // @ts-ignore
        drawerLabelStyle: { 
            fontFamily: FONTS.semiBold, 
            fontSize: 15,
            marginLeft: -10, 
        },
        drawerItemStyle: {
            borderRadius: 12, 
            paddingHorizontal: 8,
            marginVertical: 4,
        }
      }}
    >
      <Drawer.Screen 
        name="Inicio" 
        component={MainNavigator} 
        options={{
          drawerIcon: ({color}) => <Ionicons name="home-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Mi Perfil" 
        component={ProfileScreen} 
        options={{
          drawerIcon: ({color}) => <Ionicons name="person-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Reservas" 
        component={ReservasScreen} 
        options={{
          title: 'Mis Reservas',
          drawerIcon: ({color}) => <Ionicons name="calendar-outline" size={22} color={color} />
        }}
      />

      {/* 🔥 NUEVA OPCIÓN: ADOPCIONES */}
      <Drawer.Screen 
        name="AdoptionsDrawer" 
        component={AdoptionsScreen} 
        options={{
          title: 'Adopciones',
          drawerIcon: ({color}) => <Ionicons name="heart-outline" size={22} color={color} />
        }}
      />

      <Drawer.Screen 
        name="ChatList" 
        component={ChatListScreen} 
        initialParams={{ mode: 'normal' }} 
        options={{
          title: 'Mis Mensajes',
          drawerIcon: ({color}) => <Ionicons name="chatbubbles-outline" size={22} color={color} />
        }}
      />

      <Drawer.Screen 
        name="SupportTickets" 
        component={ChatListScreen} 
        initialParams={{ mode: 'support' }} 
        options={{
          drawerItemStyle: { display: 'none' } 
        }}
      />

    </Drawer.Navigator>
  );
};

export default DrawerNavigator;