import { Alert, Platform } from 'react-native';

const CLOUD_NAME = "dfswgujud";
const UPLOAD_PRESET = "innpets_upload";
// Usamos /auto/upload para que acepte PDFs e Imágenes
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export const uploadFileToCloudinary = async (fileUri: string, fileName: string, mimeType: string) => {
    
    // 1. Validar que llegó la URI
    if (!fileUri) {
        Alert.alert("Error Interno", "No llegó la URI del archivo a la función.");
        return null;
    }

    const data = new FormData();
    
    // 2. Preparar datos para el celular
    // Forzamos el nombre y tipo para evitar errores de detección
    const cleanName = fileName || `doc_${Date.now()}.pdf`;
    const cleanType = 'application/pdf'; // Forzamos PDF para probar

    // 3. Construir el objeto archivo (FormData en React Native es delicado)
    const filePayload = {
        uri: fileUri,
        type: cleanType,
        name: cleanName,
    };

    // @ts-ignore
    data.append('file', filePayload);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);

    try {
        // Alerta de depuración (Para saber que inició)
        // Puedes borrar esto si molesta, pero ayuda a saber si el botón funciona
        // Alert.alert("Iniciando subida...", `URI: ${fileUri}\nTipo: ${cleanType}`);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: data,
            headers: {
                // A veces es necesario explícitamente, a veces no. 
                // Si falla, prueba comentando esta línea de headers.
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        const json = await response.json();

        // 4. SI CLOUDINARY DEVUELVE ERROR
        if (json.error) {
            // ESTO ES LO QUE NECESITAMOS VER EN TU CELULAR
            Alert.alert(
                "Error de Cloudinary", 
                `Mensaje: ${json.error.message}\nTipo: ${json.error.type || 'N/A'}`
            );
            return null;
        }

        // 5. SI FUNCIONA
        if (json.secure_url) {
            // Alert.alert("Éxito", "Archivo subido correctamente");
            return json.secure_url;
        } else {
            Alert.alert("Error Extraño", "Cloudinary respondió pero no dio URL.\n" + JSON.stringify(json));
            return null;
        }

    } catch (error: any) {
        // 6. SI ES ERROR DE INTERNET O CÓDIGO
        Alert.alert(
            "Error de Conexión/Código", 
            `Detalle: ${error.message || error.toString()}`
        );
        return null;
    }
};