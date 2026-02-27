import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Alert, DeviceEventEmitter, Platform } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api, { authService } from '../services/api'; 

interface AuthContextData {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData?: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void; 
  refreshUser: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const performLogout = async () => {
      try {
          setUser(null); 
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token'); 
          await AsyncStorage.removeItem('user_data');
          delete api.defaults.headers.Authorization;
      } catch (e) {
          console.error("Error al cerrar sesión:", e);
      }
  };

  useEffect(() => {
    const banListener = DeviceEventEmitter.addListener('user_banned', (reason) => {
        Alert.alert('Cuenta Suspendida 🚫', reason || "Tu cuenta ha sido suspendida.", [
            { text: "OK", onPress: async () => await performLogout() }
        ], { cancelable: false });
    });

    const forceLogoutListener = DeviceEventEmitter.addListener('force_logout', () => {
        Alert.alert('Sesión Finalizada', 'Tu sesión expiró o tu cuenta fue inhabilitada.', [
            { text: "OK", onPress: async () => await performLogout() }
        ], { cancelable: false });
    });

    return () => {
        banListener.remove();
        forceLogoutListener.remove();
    };
  }, []);

  useEffect(() => {
    loadStorageData();
  }, []);

  // 🔥 NUEVA FUNCIÓN MÁGICA: Obtiene el Token de Notificaciones y lo manda a Django
  async function registerAndSendPushToken(userData: any) {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permiso de notificaciones denegado');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = pushTokenData.data;
      
      console.log("🔥 TOKEN DE EXPO OBTENIDO:", token);

      // Enviamos el token al backend de Django
      if (userData && userData.id) {
          await authService.updateProfile(userData.id, { expo_push_token: token });
          console.log("✅ Token guardado en Django con éxito");
      }
    } catch (error) {
      console.log("Error configurando notificaciones:", error);
    }
  }

  async function loadStorageData() {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken) {
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Ejecutamos el registro de notificaciones al cargar la app
            await registerAndSendPushToken(parsedUser);
        } else {
            await refreshUser(); 
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(token: string, userData?: any) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
    await AsyncStorage.setItem('access_token', token);

    if (userData) {
        setUser(userData);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        // Ejecutamos el registro al iniciar sesión
        await registerAndSendPushToken(userData);
    } else {
        await refreshUser();
    }
  }

  async function logout() {
      await performLogout();
  }

  async function refreshUser() {
      try {
          const storedUser = await AsyncStorage.getItem('user_data');
          let userId = null;
          if (storedUser) userId = JSON.parse(storedUser).id;

          let response = userId ? await api.get(`/users/${userId}/`) : await api.get('/users/');
          let userData = Array.isArray(response.data) ? (userId ? response.data.find((u: any) => u.id === userId) || response.data[0] : response.data[0]) : response.data;

          if (userData) {
            setUser(userData);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
            await registerAndSendPushToken(userData);
          } else {
            await logout();
          }
      } catch (error) {
          await logout(); 
      }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
}