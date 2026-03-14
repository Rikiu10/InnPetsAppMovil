import React, { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/constants/theme';
import api from './src/services/api';

import LoginScreen from './src/screens/LoginScreen';
import DrawerNavigator from './src/navigation/DrawerNavigator'; 
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ServiceDetailScreen from './src/screens/ServiceDetailScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import BecomeProviderScreen from './src/screens/BecomeProviderScreen';
import CreateServiceScreen from './src/screens/CreateServiceScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import CreatePetScreen from './src/screens/CreatePetScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import CreateReviewScreen from './src/screens/CreateReviewScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CreateBookingScreen from './src/screens/CreateBookingScreen';
import EditPetScreen from './src/screens/EditPetScreen';
import EditServiceScreen from './src/screens/EditServiceScreen';
import CreateTicketScreen from './src/screens/CreateTicketScreen';
import CreateMarketplaceItemScreen from './src/screens/CreateMarketplaceItemScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ResubmitIDScreen from './src/screens/ResubmitIDScreen'; 
import MarketplaceItemDetailScreen from './src/screens/MarketplaceItemDetailScreen';
import AdoptionsScreen from './src/screens/AdoptionsScreen';
import ApplyFoundationScreen from './src/screens/ApplyFoundationScreen';
import CreateAdoptionPostScreen from './src/screens/CreateAdoptionPostScreen';
import { RootStackParamList } from './src/types';

SplashScreen.preventAutoHideAsync();


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
  const navigationRef = useNavigationContainerRef();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      registerForPushNotificationsAsync().then(async token => {
        if (token) {
          console.log("Tu Push Token es:", token);
          try {
            await api.patch('/users/me/', { expo_push_token: token });
            console.log("✅ Token guardado exitosamente en Django");
          } catch (error: any) {
            console.log("❌ Error enviando el token a Django:", error.response?.data || error.message);
          }
        }
      });
    }

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (navigationRef.isReady()) {
        if (data.type === 'chat' && data.roomId) {
          // @ts-ignore
          navigationRef.navigate('ChatDetail', { 
            roomId: data.roomId, 
            partnerName: data.partnerName || 'Mensaje Nuevo',
            isSupport: data.isSupport || false
          });
        }
        else if (data.type === 'booking' && data.bookingId) {
          // @ts-ignore
          navigationRef.navigate('BookingDetail', { booking: { id: data.bookingId } });
        }
        else {
          // @ts-ignore
          navigationRef.navigate('NotificationsScreen');
        }
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove(); 
      }
    };
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        id="RootStack"
        initialRouteName={isAuthenticated ? "MainDrawer" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
        <Stack.Screen name="ResubmitID" component={ResubmitIDScreen} /> 
        <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
        <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        <Stack.Screen name="BecomeProvider" component={BecomeProviderScreen} />
        <Stack.Screen name="CreateService" component={CreateServiceScreen} />
        <Stack.Screen name="CreatePet" component={CreatePetScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
        <Stack.Screen name="CreateBookingScreen" component={CreateBookingScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatDetail" component={ChatScreen} />
        <Stack.Screen name="EditPet" component={EditPetScreen} />
        <Stack.Screen name="EditService" component={EditServiceScreen} />
        <Stack.Screen name="CreateTicket" component={CreateTicketScreen} />
        <Stack.Screen name="CreateMarketplaceItem" component={CreateMarketplaceItemScreen} />
        <Stack.Screen name="MarketplaceItemDetail" component={MarketplaceItemDetailScreen} />
        <Stack.Screen name="Adoptions" component={AdoptionsScreen} />
        <Stack.Screen name="ApplyFoundation" component={ApplyFoundationScreen} />
        <Stack.Screen name="CreateAdoptionPost" component={CreateAdoptionPostScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

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

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permiso denegado para notificaciones push.');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log("No se encontró el projectId de EAS.");
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log(`Fallo en getExpoPushTokenAsync: ${e}`);
    }
  } else {
    console.log('Debes usar un dispositivo físico para Push Notifications.');
  }

  return token;
}