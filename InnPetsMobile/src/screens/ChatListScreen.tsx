import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, 
  ActivityIndicator, Alert, Modal, TextInput 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons'; 

const ChatListScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const mode = route.params?.mode || 'normal'; // 'normal' o 'support'

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para Crear Ticket
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const fetchRooms = async () => {
    try {
      const data = await chatService.getRooms();
      
      // 👇 FILTRAMOS LAS SALAS SEGÚN EL MODO
      if (mode === 'support') {
          // Solo dejamos las que sean de tipo SUPPORT
          const supportRooms = data.filter((r: any) => r.room_type === 'SUPPORT');
          setRooms(supportRooms);
      } else {
          // Dejamos las normales (excluimos SUPPORT)
          const normalRooms = data.filter((r: any) => r.room_type !== 'SUPPORT');
          setRooms(normalRooms);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [mode])
  );

  const handleDeleteChat = (roomId: number, partnerName: string) => {
    Alert.alert(
      "Eliminar Chat",
      `¿Eliminar conversación con ${partnerName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await chatService.deleteRoom(roomId);
              await fetchRooms(); 
              Alert.alert("Éxito", "Chat eliminado.");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- CREAR TICKET DESDE CERO ---
  const handleCreateTicket = async () => {
      if (!ticketSubject.trim() || !ticketMessage.trim()) {
          Alert.alert("Error", "Debes llenar ambos campos.");
          return;
      }
      setCreatingTicket(true);
      try {
          // Llama al endpoint de tu backend (Ajusta la ruta si es diferente)
          const response = await api.post('/chat/support-ticket/', {
              subject: ticketSubject,
              message: ticketMessage
          });
          
          setShowTicketModal(false);
          setTicketSubject('');
          setTicketMessage('');
          
          // Navegar directamente a la sala recién creada
          if (response.data && response.data.room_id) {
              navigation.navigate('ChatDetail', { 
                  roomId: response.data.room_id, 
                  partnerName: "🛡️ Soporte InnPets",
                  isSupport: true 
              });
          } else {
              fetchRooms(); // Recargar la lista
          }

      } catch (error) {
          Alert.alert("Error", "No se pudo crear el ticket.");
      } finally {
          setCreatingTicket(false);
      }
  };

  const renderItem = ({ item }: any) => {
    // Si es sala de soporte, forzamos la UI
    if (item.room_type === 'SUPPORT') {
        return (
            <TouchableOpacity 
                style={[styles.card, { borderColor: '#FF9800', borderWidth: 1, backgroundColor: '#FFF3E0' }]} 
                onPress={() => navigation.navigate('ChatDetail', { roomId: item.id, partnerName: "Soporte InnPets", isSupport: true })}
                activeOpacity={0.7}
            >
                <View style={[styles.avatar, { backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{fontSize: 24}}>🛟</Text>
                </View>
                <View style={styles.info}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <Text style={[styles.name, { color: '#E65100' }]}>Soporte Oficial</Text>
                        <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</Text>
                    </View>
                    <Text style={[styles.service, { color: '#666' }]}>Ticket Abierto</Text>
                    <Text style={styles.lastMsg} numberOfLines={1}>Toca para ver o enviar mensajes...</Text>
                </View>
            </TouchableOpacity>
        );
    }

    // Sala Normal
    const isImOwner = user?.email === item.owner_email;
    const partnerName = isImOwner ? item.provider_name : item.owner_name;
    const rawPhoto = isImOwner ? item.provider_photo : item.owner_photo;
    const roleLabel = isImOwner ? "Cuidador" : "Dueño";

    const avatarSource = (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.startsWith('http'))
        ? { uri: rawPhoto }
        : { uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }; 

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('ChatDetail', { roomId: item.id, partnerName, isSupport: false })}
        onLongPress={() => handleDeleteChat(item.id, partnerName)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <Image source={avatarSource} style={styles.avatar} />
        
        <View style={styles.info}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={styles.name}>{partnerName || "Usuario"}</Text>
                <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</Text>
            </View>
            <Text style={styles.service}>{item.service_title} • {roleLabel}</Text>
            <Text style={styles.lastMsg} numberOfLines={1}>Toca para ver la conversación...</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>
          {mode === 'support' ? "Tickets de Soporte 🛟" : "Mis Mensajes 💬"}
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
      ) : (
        <FlatList 
            data={rooms} 
            keyExtractor={(item) => item.id.toString()} 
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop:50}}>
                    {mode === 'support' ? (
                        <>
                            <Ionicons name="shield-checkmark-outline" size={60} color="#ccc" />
                            <Text style={{color:'#666', marginTop: 10, textAlign: 'center', marginHorizontal: 20}}>
                                No tienes tickets abiertos. ¿Necesitas ayuda con algo?
                            </Text>
                            <TouchableOpacity 
                                style={{backgroundColor: '#FF9800', padding: 15, borderRadius: 10, marginTop: 20}}
                                onPress={() => setShowTicketModal(true)}
                            >
                                <Text style={{color: 'white', fontWeight: 'bold'}}>+ Crear Ticket de Ayuda</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <Text style={{color:'#999'}}>No tienes chats activos.</Text>
                    )}
                </View>
            }
        />
      )}

      {/* MODAL CREAR TICKET */}
      <Modal visible={showTicketModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Crear Ticket de Soporte</Text>
                  
                  <Text style={styles.label}>Asunto:</Text>
                  <TextInput 
                      style={styles.input}
                      placeholder="Ej: Problema con un pago"
                      value={ticketSubject}
                      onChangeText={setTicketSubject}
                  />

                  <Text style={styles.label}>Detalle:</Text>
                  <TextInput 
                      style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                      placeholder="Describe tu problema en detalle..."
                      value={ticketMessage}
                      onChangeText={setTicketMessage}
                      multiline
                  />

                  <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
                      <TouchableOpacity 
                          style={[styles.btn, { backgroundColor: '#eee' }]} 
                          onPress={() => setShowTicketModal(false)}
                      >
                          <Text style={{color: '#333', fontWeight: 'bold'}}>Cancelar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                          style={[styles.btn, { backgroundColor: '#FF9800' }]} 
                          onPress={handleCreateTicket}
                          disabled={creatingTicket}
                      >
                          {creatingTicket ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold'}}>Enviar Ticket</Text>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.textDark, padding: 20, paddingBottom: 10 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 15, ...SHADOWS.card },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textDark },
  service: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primary, marginBottom: 2 },
  lastMsg: { color: '#999', fontSize: 13, fontStyle: 'italic' },
  date: { fontSize: 10, color: '#ccc' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#E65100' },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, marginBottom: 15, backgroundColor: '#f9f9f9' },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});

export default ChatListScreen;