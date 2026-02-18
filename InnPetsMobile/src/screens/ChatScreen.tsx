import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, Modal, Linking 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';
import { chatService } from '../services/chatService';
import { Ionicons } from '@expo/vector-icons'; 

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const ChatScreen = ({ route, navigation }: any) => {
  const { roomId, partnerName } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [attachment, setAttachment] = useState<any>(null); 
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!roomId) { navigation.goBack(); }
  }, [roomId]);

  const fetchMessages = async () => {
    if (!roomId) return;
    try {
      const data = await chatService.getMessages(roomId);
      if (Array.isArray(data)) setMessages(data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages(); 
    const interval = setInterval(fetchMessages, 3000); 
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  // --- LÓGICA DE SELECCIÓN ---

  const openCamera = async () => {
      setShowAttachMenu(false);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true });
      if (!result.canceled) {
          const asset = result.assets[0];
          setAttachment({ uri: asset.uri, name: `foto_${Date.now()}.jpg`, mimeType: 'image/jpeg', type: 'image' });
      }
  };

  const openGallery = async () => {
      setShowAttachMenu(false);
      const result = await ImagePicker.launchImageLibraryAsync({ 
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
      });
      if (!result.canceled) {
          const asset = result.assets[0];
          setAttachment({ uri: asset.uri, name: asset.fileName || 'imagen.jpg', mimeType: 'image/jpeg', type: 'image' });
      }
  };

  const pickDocument = async () => {
      setShowAttachMenu(false);
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
          if (!result.canceled) {
              const asset = result.assets[0];
              setAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, type: 'file' });
          }
      } catch (err) { console.log(err); }
  };

  const handleSend = async () => {
    if (!text.trim() && !attachment) return; 
    setSending(true);
    try {
      await chatService.sendMessage(roomId, text, attachment);
      setText('');
      setAttachment(null); 
      await fetchMessages(); 
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const openLink = (url: string) => {
      Linking.canOpenURL(url).then(supported => {
          if (supported) Linking.openURL(url);
          else Alert.alert("Error", "No se puede abrir este archivo");
      });
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.is_me; 
    
    // 🔥 CAMBIO 3: Buscamos la URL en AMBOS campos (attachment O attachment_url)
    const attachmentUrl = item.attachment || item.attachment_url;
    
    // Validación más robusta para saber si es imagen
    const isImage = attachmentUrl && (
        attachmentUrl.includes('.jpg') || 
        attachmentUrl.includes('.png') || 
        attachmentUrl.includes('.jpeg') ||
        attachmentUrl.includes('.gif') ||
        attachmentUrl.includes('cloudinary') // A veces cloudinary no trae extensión clara
    );

    return (
      <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginBottom: 10 }}>
        <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
            
            {/* 🖼 RENDERIZAR ADJUNTO SI EXISTE */}
            {attachmentUrl && (
                <TouchableOpacity onPress={() => openLink(attachmentUrl)} style={{marginBottom: 5}}>
                    {isImage ? (
                        <Image source={{ uri: attachmentUrl }} style={{ width: 200, height: 150, borderRadius: 10, backgroundColor: '#ddd' }} resizeMode="cover"/>
                    ) : (
                        <View style={styles.fileBox}>
                            <Ionicons name="document-text" size={24} color={isMe ? '#fff' : '#333'} />
                            <Text style={[styles.fileText, {color: isMe?'#fff':'#333'}]}>Ver Archivo Adjunto</Text>
                        </View>
                    )}
                </TouchableOpacity>
            )}

            {item.content ? (
                <Text style={[styles.msgText, { color: isMe ? '#FFF' : COLORS.textDark }]}>
                    {item.content} 
                </Text>
            ) : null}
        </View>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            ListEmptyComponent={!loading ? <Text style={{textAlign:'center', marginTop:50, color:'#999'}}>Inicia la conversación 👋</Text> : <ActivityIndicator style={{marginTop:50}} color={COLORS.primary}/>}
        />

        {/* PREVIEW DEL ARCHIVO */}
        {attachment && (
            <View style={styles.previewContainer}>
                <View style={styles.previewBox}>
                    <Ionicons name={attachment.type === 'image' ? "image" : "document"} size={20} color="#666" />
                    <Text style={styles.previewText} numberOfLines={1}>{attachment.name}</Text>
                    <TouchableOpacity onPress={() => setAttachment(null)}>
                        <Ionicons name="close-circle" size={22} color="red" />
                    </TouchableOpacity>
                </View>
            </View>
        )}

        {/* INPUT AREA */}
        <View style={[styles.inputWrapper, { paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 10 }]}>
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachBtn} onPress={() => setShowAttachMenu(true)}>
                    <Ionicons name="attach" size={24} color="#666" />
                </TouchableOpacity>

                <TextInput 
                    style={styles.input} placeholder="Mensaje..." placeholderTextColor="#999"
                    value={text} onChangeText={setText} multiline
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: (text.trim() || attachment) ? COLORS.primary : '#E0E0E0' }]} 
                    onPress={handleSend} disabled={sending || (!text.trim() && !attachment)}
                >
                    {sending ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="send" size={18} color="white" style={{marginLeft: 2}} />}
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL */}
      <Modal transparent visible={showAttachMenu} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAttachMenu(false)}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Adjuntar Archivo</Text>
                
                <TouchableOpacity style={styles.modalOption} onPress={openCamera}>
                    <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}><Ionicons name="camera" size={24} color="#2196F3" /></View>
                    <Text style={styles.modalText}>Cámara</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={openGallery}>
                    <View style={[styles.iconBox, {backgroundColor: '#E8F5E9'}]}><Ionicons name="images" size={24} color="#4CAF50" /></View>
                    <Text style={styles.modalText}>Galería</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOption} onPress={pickDocument}>
                    <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}><Ionicons name="document" size={24} color="#FF9800" /></View>
                    <Text style={styles.modalText}>Documento / PDF</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: COLORS.white },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  headerSubtitle: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.primary },
  
  msgBubble: { padding: 12, borderRadius: 18, maxWidth: '100%' },
  msgMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4, borderBottomRightRadius: 0 },
  msgOther: { backgroundColor: '#f5f5f5', borderTopLeftRadius: 4, borderBottomLeftRadius: 0 },
  msgText: { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 22 },
  msgTime: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 2 },
  
  fileBox: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.1)', padding:10, borderRadius:8 },
  fileText: { marginLeft:5, fontSize:12, fontWeight:'bold', textDecorationLine: 'underline' },

  inputWrapper: { padding: 10, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5 },
  attachBtn: { padding: 10 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: COLORS.textDark, fontFamily: FONTS.regular },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 5 },

  previewContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', padding: 10, borderRadius: 10, borderWidth:1, borderColor:'#ddd' },
  previewText: { flex: 1, marginHorizontal: 10, color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 20, textAlign:'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  modalText: { fontSize: 16, color: '#333' },
});

export default ChatScreen;