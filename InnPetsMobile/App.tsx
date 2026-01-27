import React, { useCallback } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';

// Imports de tus pantallas y navegación
import LoginScreen from './src/screens/LoginScreen';
import DrawerNavigator from './src/navigation/DrawerNavigator'; 

import ServiceDetailScreen from './src/screens/ServiceDetailScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import BecomeProviderScreen from './src/screens/BecomeProviderScreen';
import CreateServiceScreen from './src/screens/CreateServiceScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import CreatePetScreen from './src/screens/CreatePetScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import CreateReviewScreen from './src/screens/CreateReviewScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
// 👇 1. AGREGAMOS EL IMPORT QUE FALTABA
import CreateBookingScreen from './src/screens/CreateBookingScreen';

import { RootStackParamList } from './src/types';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    OpenSans_400Regular,
    OpenSans_600SemiBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <SafeAreaProvider>
          
          <NavigationContainer>
            <Stack.Navigator 
              id="RootStack"
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >

              {/* 1. Pantallas de Autenticación */}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />

              {/* 2. PANTALLA PRINCIPAL (Drawer) */}
              <Stack.Screen name="MainDrawer" component={DrawerNavigator} />

              {/* 3. Pantallas Secundarias */}
              <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
              <Stack.Screen name="BecomeProvider" component={BecomeProviderScreen} />
              <Stack.Screen name="CreateService" component={CreateServiceScreen} />
              <Stack.Screen name="CreatePet" component={CreatePetScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
              <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
              
              {/* 👇 2. AGREGAMOS LAS PANTALLAS NUEVAS AQUÍ */}
              <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
              <Stack.Screen name="CreateBookingScreen" component={CreateBookingScreen} />
              
            </Stack.Navigator>
          </NavigationContainer>

        </SafeAreaProvider>
      </AuthProvider>
    </View>
  );
}