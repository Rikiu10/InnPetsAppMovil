import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// 👇 TUS DATOS DE CLOUDINARY AQUÍ
const CLOUD_NAME = "dfswgujud"; // Ej: "dxyz123"
const UPLOAD_PRESET = "innpets_upload"; // Ej: "innpets_upload" (Debe ser Unsigned)

// 1. Abrir Galería
export const pickImage = async () => {
  // Pedir permisos
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería para subir fotos.');
    return null;
  }

  // Abrir selector
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true, // Permite recortar
    aspect: [4, 3],      // Formato rectangular
    quality: 0.5,        // Calidad media para no gastar muchos datos
  });

  if (!result.canceled) {
    return result.assets[0].uri; // Retorna la ruta de la imagen en el celular
  }
  return null;
};

// 2. Subir a Cloudinary
export const uploadImageToCloudinary = async (imageUri: string) => {
  if (!imageUri) return null;

  const data = new FormData();
  
  // Cloudinary necesita estos datos específicos
  data.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  
  data.append('upload_preset', UPLOAD_PRESET);
  data.append('cloud_name', CLOUD_NAME);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: data,
      }
    );
    
    const json = await response.json();
    return json.secure_url; // 👇 ESTO ES LO QUE QUEREMOS (https://...)

  } catch (error) {
    console.error("Error subiendo imagen:", error);
    return null;
  }
};