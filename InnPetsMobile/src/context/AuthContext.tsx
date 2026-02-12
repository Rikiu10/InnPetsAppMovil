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
  const [loading, setLoading] = useState(true);

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
            await refreshUser();
        }
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
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
          // 1. Intentamos obtener el ID del usuario guardado
          const storedUser = await AsyncStorage.getItem('user_data');
          let userId = null;
          
          if (storedUser) {
              const parsed = JSON.parse(storedUser);
              userId = parsed.id;
          }

          // 2. CORRECCIÓN CRÍTICA:
          // Si tenemos ID, pedimos ESE usuario. Si no, pedimos genérico (pero esto es riesgoso)
          // La mayoría de ViewSets soportan /users/{id}/
          
          let response;
          if (userId) {
              // Pedimos específicamente a ESTE usuario
              response = await api.get(`/users/${userId}/`);
          } else {
              // Si no tenemos ID, usamos el endpoint general (último recurso)
              // OJO: Esto puede devolver una lista
              response = await api.get('/users/');
          }

          // 3. Manejo inteligente de la respuesta
          // Si pedimos por ID (/users/5/), devuelve un objeto directo.
          // Si pedimos lista (/users/), devuelve array y buscamos filtrar o tomar el [0] (riesgo)
          
          let userData;
          
          if (Array.isArray(response.data)) {
              // Si devolvió lista, intentamos encontrar el nuestro si tenemos ID, si no, tomamos el primero
              if (userId) {
                  userData = response.data.find((u: any) => u.id === userId) || response.data[0];
              } else {
                  userData = response.data[0];
              }
          } else {
              // Si es objeto, es nuestro usuario
              userData = response.data;
          }

          if (userData) {
            setUser(userData);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
          }

      } catch (error) {
          console.error("Error refrescando usuario", error);
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