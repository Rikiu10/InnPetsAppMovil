import api from './api';
import { Alert } from 'react-native';

// 👇 TUS CREDENCIALES
const CLOUD_NAME = "dfswgujud"; 
const UPLOAD_PRESET = "innpets_upload";

// Función auxiliar para subir a Cloudinary
const uploadToCloudinary = async (file: any) => {
    if (!file) return null;

    const data = new FormData();
    
    // Ajuste importante: Si no tiene nombre, generamos uno
    const fileName = file.name || `upload_${Date.now()}.jpg`;
    const fileType = file.mimeType || 'image/jpeg';

    data.append('file', {
        uri: file.uri,
        type: fileType, 
        name: fileName,     
    } as any);
    
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);

    try {
        console.log("☁️ Subiendo a Cloudinary...");
        
        // 🔥 CAMBIO 1: Usamos '/auto/upload' en vez de '/upload' 
        // Esto permite subir PDFs e Imágenes sin cambiar la URL manualmente.
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
            method: 'post',
            body: data,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            }
        });

        const json = await res.json();
        
        if (json.secure_url) {
            console.log("✅ Subida exitosa:", json.secure_url);
            return json.secure_url; 
        } else {
            console.error("❌ Error Cloudinary:", json);
            throw new Error("Error al subir archivo a la nube");
        }
    } catch (error) {
        console.error("Error red Cloudinary:", error);
        throw error;
    }
};

export const chatService = {
  getRooms: async () => {
    const response = await api.get('/chat-rooms/');
    return response.data.results ? response.data.results : response.data;
  },

  getMessages: async (roomId: number) => {
    try {
      const response = await api.get('/messages/', { params: { room_id: roomId } });
      const rawData = response.data;
      if (rawData.results) return rawData.results;
      if (Array.isArray(rawData)) return rawData;
      return [];
    } catch (error: any) {
      console.error("Error GET messages:", error);
      throw error;
    }
  },

  sendMessage: async (roomId: number, content: string, file: any = null) => {
    let attachmentUrl = null;

    // 1. Subir a Cloudinary
    if (file) {
        try {
            attachmentUrl = await uploadToCloudinary(file);
        } catch (error) {
            Alert.alert("Error", "No se pudo subir el archivo.");
            return; 
        }
    }

    // 2. Preparamos el payload
    const payload: any = {
        room: roomId,
        content: content || '', 
    };

    if (attachmentUrl) {
        // 🔥 CAMBIO 2: Enviamos DOS llaves para asegurar compatibilidad con la Web/Backend
        payload.attachment = attachmentUrl;      // Nombre estándar de Django
        payload.attachment_url = attachmentUrl;  // Nombre alternativo que a veces usa el frontend web
    }

    // 3. Enviamos al Backend
    console.log("📤 Enviando Payload:", payload); // Log para depurar
    const response = await api.post('/messages/', payload);
    return response.data;
  },

  deleteRoom: async (roomId: number) => {
    await api.delete(`/chat-rooms/${roomId}/`);
    return true;
  }
};