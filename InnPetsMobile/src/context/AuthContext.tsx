import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api'; 

interface AuthContextData {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  // 👇 CAMBIO: Ahora login acepta opcionalmente el objeto user para ser más rápido
  login: (token: string, userData?: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void; 
  refreshUser: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Al iniciar la App, buscamos si hay datos guardados
  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      // 👇 CORRECCIÓN 1: Usamos las mismas llaves que LoginScreen ('access_token')
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken) {
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        
        if (storedUser) {
            // Si ya tenemos el usuario guardado, lo usamos directo (¡Más rápido!)
            setUser(JSON.parse(storedUser));
        } else {
            // Solo si falta el usuario, lo pedimos a la API
            await refreshUser();
        }
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  // 👇 CORRECCIÓN 2: Función Login optimizada
  async function login(token: string, userData?: any) {
    // 1. Configurar API
    api.defaults.headers.Authorization = `Bearer ${token}`;
    
    // 2. Guardar Token (redundante si LoginScreen ya lo hizo, pero seguro)
    await AsyncStorage.setItem('access_token', token);

    // 3. Actualizar Estado del Usuario
    if (userData) {
        // Opción A: Nos pasaron el usuario (Ideal)
        setUser(userData);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } else {
        // Opción B: LoginScreen ya lo guardó en Storage, lo leemos de ahí
        const storedUser = await AsyncStorage.getItem('user_data');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            // Opción C: No está en ningún lado, lo pedimos a la API (Último recurso)
            await refreshUser();
        }
    }
  }

  async function logout() {
      try {
          setUser(null);
          // 👇 Borramos las llaves correctas
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
          // Esta petición sigue siendo útil para actualizar datos
          const response = await api.get('/users/');
          // Manejo robusto de array vs objeto
          const userData = Array.isArray(response.data) ? response.data[0] : response.data;

          setUser(userData);
          // Actualizamos el storage también
          await AsyncStorage.setItem('user_data', JSON.stringify(userData));
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