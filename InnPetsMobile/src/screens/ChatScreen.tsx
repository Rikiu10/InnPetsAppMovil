import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert 
} from 'react-native';
// 👇 IMPORTANTE: Hook para evitar que el menú de Android tape el input
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';
import { chatService } from '../services/chatService';
import { Ionicons } from '@expo/vector-icons'; 

const ChatScreen = ({ route, navigation }: any) => {
  // Evitamos crash si params es undefined
  const { roomId, partnerName } = route.params || {};
  
  // 👇 Obtenemos las medidas de seguridad de la pantalla (Notch y Barra inferior)
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // 1. Validación de seguridad: Si no hay ID, salimos.
  useEffect(() => {
    if (!roomId) {
        Alert.alert("Error", "No se encontró el ID del chat.");
        navigation.goBack();
    }
  }, [roomId]);

  const fetchMessages = async () => {
    if (!roomId) return;
    try {
      const data = await chatService.getMessages(roomId);
      
      // 2. Protección: Aseguramos que sea un array, venga como venga
      if (Array.isArray(data)) {
         setMessages(data);
      } else if (data && data.results && Array.isArray(data.results)) {
         // Por si el servicio devuelve paginación cruda
         setMessages(data.results);
      } else {
         console.warn("⚠️ Formato de mensajes desconocido:", data);
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(); 
    const interval = setInterval(fetchMessages, 3000); // Polling cada 3s
    return () => clearInterval(interval);
  }, [roomId]);

  // Auto-scroll al bajar
  useEffect(() => {
    if (messages.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await chatService.sendMessage(roomId, text);
      setText('');
      await fetchMessages(); // Recarga inmediata para ver tu mensaje
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: any) => {
    // 🔍 IGUALAMOS LA LÓGICA DE LA WEB 🔍
    // La web usa: msg.is_me, msg.content, msg.timestamp
    const isMe = item.is_me; 

    return (
      <View style={{
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        maxWidth: '75%', // Un poco más angosto para que se vea mejor
        marginBottom: 10,
      }}>
        <View style={[
            styles.msgBubble, 
            isMe ? styles.msgMe : styles.msgOther
        ]}>
            {/* Ahora usamos 'content' como en la web */}
            <Text style={[styles.msgText, { color: isMe ? '#FFF' : COLORS.textDark }]}>
                {item.content} 
            </Text>
        </View>
        
        {/* Ahora usamos 'timestamp' como en la web */}
        <Text style={[styles.msgTime, { textAlign: isMe ? 'right' : 'left' }]}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>{partnerName}</Text>
            <Text style={styles.headerSubtitle}>En línea</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
      >
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            ListEmptyComponent={
                !loading ? (
                    <View style={{alignItems:'center', marginTop: 50, opacity: 0.5}}>
                        <Ionicons name="chatbubbles-outline" size={60} color={COLORS.primary} />
                        <Text style={{fontFamily: FONTS.regular, color: '#999', marginTop:10}}>
                            ¡Saluda a {partnerName}! 👋
                        </Text>
                        {/* Debug visual sutil por si necesitas ver el ID */}
                        { <Text style={{fontSize: 10, color:'#eee'}}>ID: {roomId}</Text> }
                    </View>
                ) : <ActivityIndicator style={{marginTop:50}} color={COLORS.primary}/>
            }
        />

        {/* 👇 INPUT AREA CON FIX DE ANDROID */}
        {/* Usamos insets.bottom para darle el espacio exacto de la barra de navegación */}
        <View style={[styles.inputWrapper, { paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 10 }]}>
            <View style={styles.inputContainer}>
                <TextInput 
                    style={styles.input}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor="#999"
                    value={text}
                    onChangeText={setText}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: text.trim() ? COLORS.primary : '#E0E0E0' }]} 
                    onPress={handleSend} 
                    disabled={sending || !text.trim()}
                >
                    {sending ? (
                        <ActivityIndicator color="white" size="small"/> 
                    ) : (
                        <Ionicons name="send" size={18} color="white" style={{marginLeft: 2}} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  
  header: { 
      flexDirection: 'row', alignItems: 'center', 
      paddingHorizontal: 15, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
      backgroundColor: COLORS.white
  },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  headerSubtitle: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.primary },

  // Estilos de Burbujas (Igual a la Web)
  msgBubble: { padding: 12, borderRadius: 18, maxWidth: '100%' },
  
  // YO: Naranja, Texto Blanco, borde redondeado menos la esquina inf. derecha
  msgMe: { 
      backgroundColor: COLORS.primary, 
      borderTopRightRadius: 4, 
      borderBottomRightRadius: 0 
  },
  
  // AMIGO: Gris claro (#f5f5f5 de la web), Texto Oscuro
  msgOther: { 
      backgroundColor: '#f5f5f5', 
      borderTopLeftRadius: 4, 
      borderBottomLeftRadius: 0 
  },
  
  msgText: { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 22 },
  msgTime: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 2 },

  // Input
  inputWrapper: {
      padding: 10,
      backgroundColor: COLORS.white,
      borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  inputContainer: { 
      flexDirection: 'row', 
      alignItems: 'center',
      backgroundColor: '#F8F8F8', 
      borderRadius: 25, 
      paddingHorizontal: 5,
      paddingVertical: 5
  },
  input: { 
      flex: 1, 
      paddingHorizontal: 15, 
      paddingVertical: 10, 
      maxHeight: 100, 
      fontSize: 15,
      color: COLORS.textDark,
      fontFamily: FONTS.regular
  },
  sendBtn: { 
      width: 40, height: 40, 
      borderRadius: 20, 
      justifyContent: 'center', alignItems: 'center',
      marginRight: 5
  }
});

export default ChatScreen;