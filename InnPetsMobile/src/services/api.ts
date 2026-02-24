import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Service, ServiceCategory } from '../types';

// URL DEL SERVIDOR
const API_URL = 'https://innpets.cl/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, 
});

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

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 (No autorizado) y no hemos reintentado ya
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Marcamos para no entrar en un bucle infinito

            try {
                // Buscamos el refresh token guardado
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                
                if (refreshToken) {
                    console.log("🔄 Intentando refrescar el token...");
                    
                    // Hacemos la petición a Django con axios puro para evitar el interceptor
                    const response = await axios.post(`${API_URL}/auth/refresh/`, {
                        refresh: refreshToken
                    });

                    const newAccessToken = response.data.access;
                    
                    // Guardamos el nuevo token de acceso
                    await AsyncStorage.setItem('access_token', newAccessToken);
                    
                    // Actualizamos el header de la petición original que había fallado y la reintentamos
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    console.log("✅ Token refrescado con éxito. Reintentando petición...");
                    
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("🚨 El Refresh Token también expiró. La sesión ha muerto.");
                // Aquí podrías despachar tu función de 'logout' del AuthContext si la tienes,
                // o simplemente limpiar el storage para que vuelva al Login.
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('refresh_token');
            }
        }

        // Si no es 401 o el refresh falló, devolvemos el error normal
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
      const response = await api.post('/auth/register/', userData); 
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
  verifyOTP: async (email: string, otp: string) => {
    // ✅ Faltaba extraer el .data
    const response = await api.post('/auth/verify-otp/', { email, otp });
    return response.data; 
  },
  resendOTP: async (email: string) => {
    // ✅ Faltaba extraer el .data
    const response = await api.post('/auth/resend-otp/', { email });
    return response.data; 
  },
};

export const servicesService = {
  getAllServices: async (): Promise<Service[]> => {
    const response = await api.get<Service[]>('/services/');
    return response.data;
  },
  getCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get<ServiceCategory[]>('/service-categories/');
    return response.data;
  },
  getMyCertifications: async () => {
    const response = await api.get('/certifications/');
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

export const notificationService = {
    getAll: async () => {
        const response = await api.get('/notifications/');
        return response.data;
    },
    getUnreadCount: async () => {
        try {
            const response = await api.get('/notifications/');
            const all = Array.isArray(response.data) ? response.data : response.data.results || [];
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

// 🔥 SERVICIO DEL MARKETPLACE CORREGIDO
export const marketplaceService = {
  getAll: async () => {
      // 👇 Cambiado a /marketplace/
      const response = await api.get('/marketplace/');
      return response.data;
  },
  create: async (data: any) => {
      // 👇 Cambiado a /marketplace/
      const response = await api.post('/marketplace/', data);
      return response.data;
  },
  delete: async (id: number) => {
      // 👇 Cambiado a /marketplace/
      await api.delete(`/marketplace/${id}/`);
      return true;
  }
};

export default api;