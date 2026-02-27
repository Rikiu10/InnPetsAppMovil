import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, Modal, Linking 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { chatService } from '../services/chatService';
import api from '../services/api'; 
import { Ionicons } from '@expo/vector-icons'; 

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const ChatScreen = ({ route, navigation }: any) => {
  const { roomId, partnerName, isSupport: paramIsSupport } = route.params || {}; 
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [isSupportRoom, setIsSupportRoom] = useState(paramIsSupport || false);
  const [isClosed, setIsClosed] = useState(false);

  const [attachment, setAttachment] = useState<any>(null); 
  const [customFileName, setCustomFileName] = useState(''); 
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // 🔥 ESTADOS DEL SISTEMA DE RESEÑAS
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // 🔥 NUEVO ESTADO: BARRERA PARA SABER SI YA CALIFICÓ
  const [hasReviewed, setHasReviewed] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!roomId) { navigation.goBack(); }
  }, [roomId]);

  const fetchRoomDetails = useCallback(async () => {
      try {
          const response = await api.get(`/chat-rooms/${roomId}/`);
          if (response.data) {
              if (response.data.room_type === 'SUPPORT') {
                  setIsSupportRoom(true);
              }
              if (response.data.status === 'CLOSED' || response.data.is_active === false) {
                  setIsClosed(true);
              }
              // Si el backend envía que ya tiene review, la ocultamos de entrada
              if (response.data.has_review) {
                  setHasReviewed(true);
              }
          }
      } catch (error) {
          console.log("No se pudo verificar detalles de la sala.");
      }
  }, [roomId]);

  useEffect(() => {
      fetchRoomDetails();
  }, [fetchRoomDetails]);

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
    if (!isClosed) {
        const interval = setInterval(fetchMessages, 3000); 
        return () => clearInterval(interval);
    }
  }, [roomId, isClosed]);

  useEffect(() => {
    if (messages.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  const handleCloseTicket = () => {
    Alert.alert(
      "Cerrar Ticket",
      "¿Estás seguro? Ya no podrás enviar mensajes en este ticket.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Finalizar", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await api.patch(`/chat-rooms/${roomId}/`, { status: 'CLOSED' });
              
              setIsClosed(true);
              setLoading(false);
              
              // Solo mostramos el modal si NO ha calificado
              if (!hasReviewed) {
                  Alert.alert("¡Ticket Resuelto!", "Por favor califica nuestra atención.", [
                      { text: "Calificar", onPress: () => setShowReviewModal(true) },
                      { text: "Más tarde", style: "cancel" }
                  ]);
              }
            } catch (error) {
              Alert.alert("Error", "No se pudo cerrar el ticket.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSubmitReview = async () => {
      if (rating === 0) {
          Alert.alert("Error", "Por favor selecciona al menos una estrella ⭐.");
          return;
      }
      setSubmittingReview(true);
      try {
          await api.post('/chat/support-reviews/', {
              room_id: roomId,
              rating: rating,
              comment: reviewComment
          });
          Alert.alert("¡Gracias!", "Tu calificación ha sido enviada exitosamente.");
          setShowReviewModal(false);
          // 🔥 DESAPARECEMOS EL BOTÓN AL INSTANTE
          setHasReviewed(true);
      } catch (error: any) {
          const detail = error.response?.data?.detail || "Ya enviaste una reseña para este ticket o ocurrió un error.";
          Alert.alert("Aviso", detail);
          setShowReviewModal(false);
          // Por si falló porque ya existía, también lo ocultamos
          if (detail.includes("Ya enviaste")) setHasReviewed(true);
      } finally {
          setSubmittingReview(false);
      }
  };

  const openCamera = async () => {
      setShowAttachMenu(false);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso denegado");
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true });
      if (!result.canceled) {
          const asset = result.assets[0];
          setAttachment({ uri: asset.uri, mimeType: 'image/jpeg', type: 'image', name: `foto_${Date.now()}.jpg` });
          setCustomFileName(`foto_${Date.now()}.jpg`);
      }
  };

  const openGallery = async () => {
      setShowAttachMenu(false);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.5 });
      if (!result.canceled) {
          const asset = result.assets[0];
          const name = asset.fileName || `imagen_${Date.now()}.jpg`;
          const type = asset.type === 'video' ? 'video' : 'image';
          setAttachment({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', type, name: name });
          setCustomFileName(name);
      }
  };

  const pickDocument = async () => {
      setShowAttachMenu(false);
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
          if (!result.canceled && result.assets) {
              const asset = result.assets[0];
              setAttachment({ uri: asset.uri, mimeType: asset.mimeType, type: 'file', name: asset.name });
              setCustomFileName(asset.name);
          }
      } catch (err) { console.log(err); }
  };

  const handleSend = async () => {
    if (isClosed) return;
    if (!text.trim() && !attachment) return; 
    
    setSending(true);
    try {
      let attachmentToSend = null;
      if (attachment) {
          attachmentToSend = {
              ...attachment,
              name: customFileName.trim() ? customFileName : attachment.name
          };
      }
      await chatService.sendMessage(roomId, text, attachmentToSend); 
      setText('');
      setAttachment(null); 
      setCustomFileName('');
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
    const attachmentUrl = item.attachment || item.attachment_url;
    
    let displayName = item.sender_name || partnerName;
    if (isSupportRoom && !isMe) {
        displayName = "🛡️ Soporte InnPets";
    }

    const isImage = attachmentUrl && (
        attachmentUrl.includes('jpg') || attachmentUrl.includes('png') || attachmentUrl.includes('jpeg') || attachmentUrl.includes('cloudinary')
    );

    return (
      <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 15 }}>
        {!isMe && <Text style={{fontSize: 10, color: '#888', marginBottom: 2, marginLeft: 10}}>{displayName}</Text>}
        
        <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
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
                <Text style={[styles.msgText, { color: isMe ? '#FFF' : COLORS.textDark }]}>{item.content}</Text>
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
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>
                {isSupportRoom ? "🛡️ Soporte InnPets" : partnerName}
            </Text>
            <Text style={styles.headerSubtitle}>
                {isClosed ? "Ticket Cerrado 🔒" : (isSupportRoom ? "Ticket Abierto" : "En línea")}
            </Text>
        </View>

        {isSupportRoom && !isClosed && (
            <TouchableOpacity onPress={handleCloseTicket} style={styles.closeTicketBtn}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#D32F2F" style={{marginRight: 4}} />
                <Text style={styles.closeTicketText}>Cerrar Ticket</Text>
            </TouchableOpacity>
        )}
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

        {attachment && !isClosed && (
            <View style={styles.previewContainer}>
                <View style={styles.previewBox}>
                    <Ionicons name={attachment.type === 'image' ? "image" : "document"} size={24} color="#666" />
                    
                    <TextInput 
                        style={styles.fileNameInput}
                        value={customFileName}
                        onChangeText={setCustomFileName}
                        placeholder="Nombre del archivo..."
                    />

                    <TouchableOpacity onPress={() => {setAttachment(null); setCustomFileName('');}}>
                        <Ionicons name="close-circle" size={24} color="red" />
                    </TouchableOpacity>
                </View>
            </View>
        )}

        <View style={[styles.inputWrapper, { paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 10 }]}>
            {isClosed ? (
                <View style={styles.closedTicketBanner}>
                    <Text style={styles.closedTicketTextBanner}>Este ticket ha sido finalizado. 🔒</Text>
                    
                    {isSupportRoom && (
                        <View style={{flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center'}}>
                            {/* 🔥 LA BARRERA VISUAL: Si ya calificó, ocultamos el botón naranja */}
                            {!hasReviewed && (
                                <TouchableOpacity onPress={() => setShowReviewModal(true)} style={[styles.rateBtn, {backgroundColor: '#FF9800'}]}>
                                    <Text style={styles.rateBtnText}>⭐ Calificar</Text>
                                </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('CreateTicket')} 
                                style={[styles.rateBtn, {backgroundColor: COLORS.primary}]}
                            >
                                <Text style={styles.rateBtnText}>➕ Nuevo Ticket</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => setShowAttachMenu(true)} disabled={sending}>
                        <Ionicons name="attach" size={24} color="#666" />
                    </TouchableOpacity>

                    <TextInput 
                        style={styles.input} placeholder="Escribe un mensaje..." placeholderTextColor="#999"
                        value={text} onChangeText={setText} multiline
                        editable={!sending}
                    />
                    
                    <TouchableOpacity 
                        style={[styles.sendBtn, { backgroundColor: (text.trim() || attachment) ? COLORS.primary : '#E0E0E0' }]} 
                        onPress={handleSend} disabled={sending || (!text.trim() && !attachment)}
                    >
                        {sending ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="send" size={18} color="white" style={{marginLeft: 2}} />}
                    </TouchableOpacity>
                </View>
            )}
        </View>
      </KeyboardAvoidingView>

      {!isClosed && (
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
      )}

      <Modal transparent visible={showReviewModal} animationType="slide">
          <View style={styles.modalOverlayCenter}>
              <View style={styles.reviewModalContent}>
                  <Text style={styles.reviewTitle}>Califica nuestro Soporte 🛡️</Text>
                  <Text style={styles.reviewSubtitle}>¿Qué tal te pareció la atención recibida en este ticket?</Text>
                  
                  <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setRating(star)}>
                              <Ionicons 
                                  name={star <= rating ? "star" : "star-outline"} 
                                  size={45} 
                                  color={star <= rating ? "#FFD700" : "#ccc"} 
                                  style={{ marginHorizontal: 5 }} 
                              />
                          </TouchableOpacity>
                      ))}
                  </View>

                  <TextInput 
                      style={styles.reviewInput}
                      placeholder="Deja un comentario (opcional)..."
                      multiline
                      value={reviewComment}
                      onChangeText={setReviewComment}
                  />

                  <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#eee'}]} onPress={() => setShowReviewModal(false)}>
                          <Text style={{color: '#333', fontWeight: 'bold'}}>Cancelar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4CAF50'}]} onPress={handleSubmitReview} disabled={submittingReview}>
                          {submittingReview ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>Enviar Reseña</Text>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
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
  
  closeTicketBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#FFCDD2' },
  closeTicketText: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold' },

  msgBubble: { padding: 12, borderRadius: 18, maxWidth: '100%' },
  msgMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4, borderBottomRightRadius: 0 },
  msgOther: { backgroundColor: '#f5f5f5', borderTopLeftRadius: 4, borderBottomLeftRadius: 0 },
  msgText: { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 22 },
  msgTime: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 2 },
  
  fileBox: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.1)', padding:10, borderRadius:8 },
  fileText: { marginLeft:5, fontSize:12, fontWeight:'bold', textDecorationLine: 'underline' },

  inputWrapper: { padding: 10, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5 },
  
  closedTicketBanner: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closedTicketTextBanner: { color: '#666', fontFamily: FONTS.bold, marginBottom: 10 },
  rateBtn: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  rateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  attachBtn: { padding: 10 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: COLORS.textDark, fontFamily: FONTS.regular },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 5 },

  previewContainer: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#fff' },
  previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', padding: 10, borderRadius: 10, borderWidth:1, borderColor:'#ddd' },
  fileNameInput: { flex: 1, marginHorizontal: 10, color: '#333', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 20, textAlign:'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  modalText: { fontSize: 16, color: '#333' },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  reviewModalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center' },
  reviewTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#333', marginBottom: 10 },
  reviewSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  reviewInput: { width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, height: 100, textAlignVertical: 'top', backgroundColor: '#f9f9f9' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});

export default ChatScreen;