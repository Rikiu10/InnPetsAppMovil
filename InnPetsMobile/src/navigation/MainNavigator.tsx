import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import ReservasScreen from '../screens/ReservasScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';


const MarketplacePlaceholder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Marketplace en construcción 🚧</Text>
  </View>
);

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
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
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

      {/* 🔥 NUEVO: Pestaña del Marketplace en el medio */}
      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}  // <-- Usa el real
        options={{ 
                  tabBarLabel: 'Tienda',
                  tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>🛒</Text> 
        }}
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