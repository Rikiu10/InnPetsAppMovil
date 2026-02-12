import api from './api';
import { Alert } from 'react-native';

export const chatService = {
  getRooms: async () => {
    const response = await api.get('/chat-rooms/');
    return response.data.results ? response.data.results : response.data;
  },

  getMessages: async (roomId: number) => {
    try {
      console.log(`📡 Pidiendo mensajes sala ${roomId} (PRODUCCIÓN)`);

      // 1. Usamos 'params' para garantizar que la URL se arme perfecta
      const response = await api.get('/messages/', { 
        params: { room_id: roomId } 
      });

      const rawData = response.data;
      console.log("📦 RESPUESTA RAW:", JSON.stringify(rawData, null, 2));

      // 2. DIAGNÓSTICO: Si llega vacío, ¿por qué es?
      if (!rawData) return [];

      // CASO A: Paginación estándar de Django (results)
      if (rawData.results) {
        if (rawData.results.length === 0) {
           console.log("⚠️ La lista 'results' llegó vacía.");
        }
        return rawData.results;
      }
      
      // CASO B: Array directo
      if (Array.isArray(rawData)) {
        return rawData;
      }

      // 3. CASO RARO: ¿Está anidado? (A veces pasa en algunos backends)
      // Si la respuesta es { data: [...] } en lugar de [...]
      if (rawData.data && Array.isArray(rawData.data)) {
          return rawData.data;
      }

      return [];

    } catch (error: any) {
      console.error("🔥 Error GET messages:", error);
      // Si falla, mostramos alerta para saber que fue error de red/token
      if(error.response?.status === 401) {
          Alert.alert("Error de Sesión", "Tu token venció o no se envía. Cierra sesión y entra de nuevo.");
      }
      throw error;
    }
  },

  sendMessage: async (roomId: number, content: string) => {
    // Igualamos exactamente a la web: { room: ID, content: texto }
    const response = await api.post('/messages/', { room: roomId, content });
    return response.data;
  },

  deleteRoom: async (roomId: number) => {
    try {
      // Asumiendo que tu ViewSet en Django permite DELETE en /chat-rooms/{id}/
      await api.delete(`/chat-rooms/${roomId}/`);
      return true;
    } catch (error) {
      console.error("Error eliminando sala:", error);
      throw error;
    }
  }
};