import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '../services/fileService';
import { uploadImageToCloudinary } from '../services/imageService';

const CreateTicketScreen = ({ navigation }: any) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Archivo
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
    const [customFileName, setCustomFileName] = useState('');

    const handleAttachFile = () => {
        Alert.alert(
            "Adjuntar Archivo",
            "¿Qué deseas adjuntar?",
            [
                { text: "📷 Cámara", onPress: openCamera },
                { text: "🖼️ Galería", onPress: openGallery },
                { text: "📄 Documento PDF", onPress: pickDocument },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const openCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedFile(asset);
            setFileType('image');
            setCustomFileName(`foto_ticket_${Date.now()}.jpg`);
        }
    };

    const openGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedFile(asset);
            setFileType('image');
            setCustomFileName(asset.fileName || `img_ticket_${Date.now()}.jpg`);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
            if (!result.canceled && result.assets) {
                setSelectedFile(result.assets[0]);
                setFileType('pdf');
                setCustomFileName(result.assets[0].name);
            }
        } catch (err) { console.log(err); }
    };

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert("Campos vacíos", "Por favor escribe un asunto y un mensaje.");
            return;
        }

        setLoading(true);
        try {
            let fileUrl = null;

            if (selectedFile) {
                if (fileType === 'image') {
                    fileUrl = await uploadImageToCloudinary(selectedFile.uri);
                } else {
                    fileUrl = await uploadFileToCloudinary(selectedFile.uri, customFileName, selectedFile.mimeType || 'application/pdf');
                }
            }

           // 🔥 CLONAMOS LA ESTRUCTURA EXACTA DE LA WEB + NUESTRA FOTO
            const payload = {
                subject: subject,
                message: message,
                attachment_url: fileUrl 
            };

            // 🔥 LE DEVOLVEMOS LA BARRA FINAL QUE USA LA WEB
            await api.post('/chat/create-ticket/', payload);

            Alert.alert("¡Enviado! 📨", "Ticket creado correctamente. Un administrador te responderá pronto.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
            
        } catch (error: any) {
            console.error("Detalle del Error:", error);
            
            // 🔥 NUESTRO DETECTOR EXTREMO (Si no ves la sirena en tu celular, ¡sigues usando la app vieja!)
            const status = error.response?.status || "Error de Red";
            const serverData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            
            Alert.alert(
                "Error Técnico 🚨", 
                `Status: ${status}\nDetalle:\n${serverData}`,
                [{ text: "Entendido" }]
            );
        }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{fontSize: 24}}>⬅️</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Soporte / Ayuda</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Asunto</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ej: Problema con un pago" 
                        value={subject} onChangeText={setSubject}
                    />

                    <Text style={styles.label}>Mensaje</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="Describe tu problema..." 
                        multiline numberOfLines={6}
                        value={message} onChangeText={setMessage}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity style={styles.attachBtn} onPress={handleAttachFile}>
                        {selectedFile ? (
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <Text style={{fontSize: 20, marginRight: 10}}>{fileType === 'image' ? '🖼️' : '📄'}</Text>
                                <Text style={{color: COLORS.primary, fontWeight:'bold'}}>Archivo seleccionado</Text>
                            </View>
                        ) : (
                            <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center'}}>
                                <Text style={{fontSize: 18, marginRight: 5}}>📎</Text>
                                <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Adjuntar Archivo (Opcional)</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {selectedFile && (
                        <View style={{marginBottom: 20}}>
                            <Text style={styles.label}>Nombre del Archivo:</Text>
                            <View style={{flexDirection: 'row', gap: 10}}>
                                <TextInput 
                                    style={[styles.input, {flex: 1, marginBottom: 0}]} 
                                    value={customFileName} 
                                    onChangeText={setCustomFileName}
                                />
                                <TouchableOpacity 
                                    style={styles.deleteFileBtn} 
                                    onPress={() => { setSelectedFile(null); setCustomFileName(''); }}
                                >
                                    <Text style={{fontSize: 20}}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Enviar Ticket</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
    form: { marginTop: 10, paddingBottom: 40 },
    label: { fontFamily: FONTS.bold, marginBottom: 8, color: COLORS.textDark },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
    textArea: { height: 150 },
    attachBtn: { backgroundColor: '#F0F8FF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: 20 },
    deleteFileBtn: { backgroundColor: '#FFEBEE', width: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
    btn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', ...SHADOWS.card },
    btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 16 }
});

export default CreateTicketScreen;