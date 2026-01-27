import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform } from 'react-native';
// 1. Esto es lo que mide la barra del sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Importamos las pantallas
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import ReservasScreen from '../screens/ReservasScreen';

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
        tabBarStyle: {
          // 👇 CORRECCIÓN CLAVE:
          // Altura = 60 base + el espacio seguro del sistema (sea Android o iOS)
          // Si insets.bottom es 0 (celulares viejos), usamos 10px de seguridad.
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          
          // Padding = Lo que mida la barra del sistema
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          
          paddingTop: 10,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.regular,
          fontSize: 12,
          marginBottom: 5,
        }
      }}
    >
      <Tab.Screen 
        name="Explorar" 
        component={HomeScreen} 
        options={{ 
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>🏠</Text> 
        }}
      />
      
      <Tab.Screen 
        name="Servicios" 
        component={ServicesScreen} 
        options={{ tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>🔍</Text> }}
      />
      
      <Tab.Screen 
        name="Reservas" 
        component={ReservasScreen} 
        options={{ tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>📅</Text> }}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>👤</Text> }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;