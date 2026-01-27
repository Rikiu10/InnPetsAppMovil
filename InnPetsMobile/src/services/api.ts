import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Service } from '../types';

// 1. URL DEL SERVIDOR (Escrita correctamente ✅)
const API_URL = 'https://innpets.cl/api';   //servidor hosting backend
//const API_URL = 'http://192.168.1.84:8000/api';   //local backend

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de espera
});

// --- INTERCEPTOR DE PETICIONES ---
api.interceptors.request.use(async (config) => {
  // Leemos el token
  const token = await AsyncStorage.getItem('access_token');
  
  // 2. TRUCO PARA DJANGO: Asegurar que TODAS las URLs terminen en '/'
  if (config.url && !config.url.endsWith('/')) {
      config.url = `${config.url}/`;
  }

  // 3. LOGICA DE AUTH:
  // Solo evitamos enviar el token en el Login. 
  // (Quitamos '/users/' de aquí para que updateProfile SÍ envíe el token)
  const isAuthRequest = config.url?.includes('/auth/login/');

  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log para ver qué estamos enviando
  console.log(`📡 Request: ${config.baseURL}${config.url}`); 
  return config;
});

// --- INTERCEPTOR DE RESPUESTAS ---
api.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            console.error("🚨 Error de Red:", error.message);
        } else {
            console.error("⚠️ Error del Servidor:", error.response.status, error.response.data);
        }
        return Promise.reject(error);
    }
);

export const authService = {
  // LOGIN
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/', { email, password });
    return response.data;
  },
  
  // REGISTRO
  register: async (userData: any) => {
    try {
      const response = await api.post('/users/', userData); 
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ACTUALIZAR PERFIL
  updateProfile: async (userId: number, data: any) => {
    const response = await api.patch(`/users/${userId}/`, data);
    return response.data;
  },

  // CAMBIAR ROL
  switchRole: async () => {
    const response = await api.post('/users/switch_role/'); 
    return response.data;
  },
};

export const servicesService = {
  getAllServices: async (): Promise<Service[]> => {
    const response = await api.get<Service[]>('/services/');
    return response.data;
  },
};

export default api;