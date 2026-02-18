import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Service } from '../types';

// URL DEL SERVIDOR
const API_URL = 'https://innpets.cl/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, 
});

// INTERCEPTOR REQUEST
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (config.url && !config.url.endsWith('/')) {
      config.url = `${config.url}/`;
  }
  const isAuthRequest = config.url?.includes('/auth/login/');
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`📡 Request: ${config.baseURL}${config.url}`); 
  return config;
});

// INTERCEPTOR RESPONSE
api.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) console.error("🚨 Error de Red:", error.message);
        else console.error("⚠️ Error Servidor:", error.response.status, error.response.data);
        return Promise.reject(error);
    }
);

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/', { email, password });
    return response.data;
  },
  register: async (userData: any) => {
      const response = await api.post('/users/', userData); 
      return response.data;
  },
  updateProfile: async (userId: number, data: any) => {
    const response = await api.patch(`/users/${userId}/`, data);
    return response.data;
  },
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
  updateService: async (id: number, data: any) => {
    const response = await api.patch(`/services/${id}/`, data);
    return response.data;
  },
  deleteService: async (id: number) => {
    await api.delete(`/services/${id}/`);
    return true;
  }
};

export const petsService = {
    updatePet: async (id: number, data: any) => {
        const response = await api.patch(`/pets/${id}/`, data);
        return response.data;
    },
    deletePet: async (id: number) => {
        await api.delete(`/pets/${id}/`);
        return true;
    }
};

export const paymentService = {
  createPreference: async (bookingId: number) => {
    try {
      const response = await api.post(`/payments/create-preference/${bookingId}/`);
      return response.data; 
    } catch (error) {
      console.error("Error creando preferencia:", error);
      throw error;
    }
  }
};

// 👇 NUEVO: Servicio de Notificaciones
export const notificationService = {
    getAll: async () => {
        const response = await api.get('/notifications/');
        return response.data;
    },
    getUnreadCount: async () => {
        try {
            const response = await api.get('/notifications/');
            // Si tu backend paginas, usa response.data.results
            const all = Array.isArray(response.data) ? response.data : response.data.results || [];
            // Filtramos las que NO están leídas
            return all.filter((n: any) => !n.is_read).length;
        } catch (error) {
            return 0;
        }
    },
    markAsRead: async (id: number) => {
        await api.post(`/notifications/${id}/mark_read/`);
    },
    markAllAsRead: async () => {
        await api.post('/notifications/mark_all_read/');
    }
};

export default api;