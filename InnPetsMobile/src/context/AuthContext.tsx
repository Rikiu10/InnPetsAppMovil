import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api'; 

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
  const [loading, setLoading] = useState(true); // <-- Comienza en true para el SplashScreen

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken) {
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            await refreshUser(); // Intenta recuperar los datos si solo había token
        }
      } else {
        // Si no hay token, nos aseguramos de limpiar todo
        setUser(null);
      }
    } catch (error) {
      console.log("Error cargando datos de sesión:", error);
      setUser(null);
    } finally {
      // Pase lo que pase (haya sesión o no), quitamos el loading
      setLoading(false);
    }
  }

  async function login(token: string, userData?: any) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
    await AsyncStorage.setItem('access_token', token);

    if (userData) {
        setUser(userData);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } else {
        await refreshUser();
    }
  }

  async function logout() {
      try {
          setUser(null);
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token'); 
          await AsyncStorage.removeItem('user_data');
          delete api.defaults.headers.Authorization;
      } catch (e) {
          console.error("Error al cerrar sesión:", e);
      }
  }

  async function refreshUser() {
      try {
          const storedUser = await AsyncStorage.getItem('user_data');
          let userId = null;
          
          if (storedUser) {
              const parsed = JSON.parse(storedUser);
              userId = parsed.id;
          }

          let response;
          if (userId) {
              response = await api.get(`/users/${userId}/`);
          } else {
              response = await api.get('/users/');
          }

          let userData;
          if (Array.isArray(response.data)) {
              if (userId) {
                  userData = response.data.find((u: any) => u.id === userId) || response.data[0];
              } else {
                  userData = response.data[0];
              }
          } else {
              userData = response.data;
          }

          if (userData) {
            setUser(userData);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
          } else {
            // Si el token es inválido y no trajo data, cerramos sesión por seguridad
            await logout();
          }

      } catch (error) {
          console.error("Error refrescando usuario, cerrando sesión:", error);
          await logout(); // Token expirado o error de API -> Fuera
      }
  }

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        isAuthenticated: !!user, 
        login, 
        logout, 
        setUser,
        refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}