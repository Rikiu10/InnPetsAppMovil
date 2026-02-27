import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import ReservasScreen from '../screens/ReservasScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';

import { COLORS, FONTS } from '../constants/theme';
import { MainTabParamList } from '../types'; 

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        // 🔥 CORRECCIÓN AQUÍ: Quitamos el "absolute" y fijamos la barra al fondo
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          // La altura base es 60. Le sumamos el "inset" inferior (la barrita del iPhone/Android)
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          // El padding inferior empuja los iconos hacia arriba para que no queden tapados
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          elevation: 8, // Sombra en Android
          shadowColor: '#000', // Sombra en iOS
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 11,
          marginTop: 2,
        }
      }}
    >
      <Tab.Screen 
        name="Explorar" 
        component={HomeScreen} 
        options={{ 
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ) 
        }}
      />
      
      <Tab.Screen 
        name="Servicios" 
        component={ServicesScreen} 
        options={{ 
            tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
            ) 
        }}
      />

      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}  
        options={{ 
            tabBarLabel: 'Tienda',
            tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "bag-handle" : "bag-handle-outline"} size={24} color={color} />
            ) 
        }}
      />
      
      <Tab.Screen 
        name="Reservas" 
        component={ReservasScreen} 
        options={{ 
            tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
            ) 
        }}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{ 
            tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ) 
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;