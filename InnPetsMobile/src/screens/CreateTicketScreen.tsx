import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import api from '../services/api';

const CreateTicketScreen = ({ navigation }: any) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert("Campos vacíos", "Por favor escribe un asunto y un mensaje.");
            return;
        }

        setLoading(true);
        try {
            // 👇 URL CORREGIDA SEGÚN TU BACKEND (urls.py)
            await api.post('/chat/create-ticket/', {
                subject: subject,
                message: message,
                priority: 'MEDIUM' 
            });

            Alert.alert("¡Enviado! 📨", "Un administrador revisará tu caso pronto.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            console.error("Error ticket:", error);
            // Mensaje de error más amigable si el backend falla
            const errorMsg = error.response?.data?.detail || "No se pudo enviar el ticket. Intenta más tarde.";
            Alert.alert("Error", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{fontSize: 24}}>⬅️</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Soporte / Ayuda</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                <View style={styles.form}>
                    <Text style={styles.label}>Asunto</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ej: Problema con un pago" 
                        value={subject} 
                        onChangeText={setSubject}
                    />

                    <Text style={styles.label}>Mensaje</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="Describe detalladamente tu problema..." 
                        multiline 
                        numberOfLines={6}
                        value={message} 
                        onChangeText={setMessage}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Enviar Ticket</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textDark },
    form: { marginTop: 10 },
    label: { fontFamily: FONTS.bold, marginBottom: 8, color: COLORS.textDark },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
    textArea: { height: 150 },
    btn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', ...SHADOWS.card },
    btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 16 }
});

export default CreateTicketScreen;