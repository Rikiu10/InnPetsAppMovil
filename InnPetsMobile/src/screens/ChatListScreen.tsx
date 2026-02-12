import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, 
  ActivityIndicator, Alert // 👈 1. Importamos Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; // Para ícono de papelera opcional

const ChatListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const data = await chatService.getRooms();
      setRooms(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [])
  );

  // 👇 2. Función para manejar el borrado
  const handleDeleteChat = (roomId: number, partnerName: string) => {
    Alert.alert(
      "Eliminar Chat",
      `¿Estás seguro que quieres eliminar la conversación con ${partnerName}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", // Se ve rojo en iOS
          onPress: async () => {
            try {
              setLoading(true);
              await chatService.deleteRoom(roomId);
              // Recargamos la lista para que desaparezca
              await fetchRooms(); 
              Alert.alert("Éxito", "Chat eliminado correctamente");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el chat. Intenta nuevamente.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: any) => {
    // Lógica de identificación
    const isImOwner = user?.email === item.owner_email;
    const partnerName = isImOwner ? item.provider_name : item.owner_name;
    const rawPhoto = isImOwner ? item.provider_photo : item.owner_photo;
    const roleLabel = isImOwner ? "Cuidador" : "Dueño";

    let avatarUrl = 'https://via.placeholder.com/100'; 
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.startsWith('http')) {
        avatarUrl = rawPhoto;
    }

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('ChatDetail', { roomId: item.id, partnerName })}
        // 👇 3. Agregamos el evento Long Press
        onLongPress={() => handleDeleteChat(item.id, partnerName)}
        delayLongPress={500} // Medio segundo para activar
        activeOpacity={0.7}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        
        <View style={styles.info}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={styles.name}>
                    {partnerName || "Usuario Desconocido"}
                </Text>
                <Text style={styles.date}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                </Text>
            </View>
            <Text style={styles.service}>{item.service_title} • {roleLabel}</Text>
            <Text style={styles.lastMsg} numberOfLines={1}>
                Mantén presionado para eliminar...
            </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Mis Mensajes 💬</Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
      ) : (
        <FlatList 
            data={rooms} 
            keyExtractor={(item) => item.id.toString()} 
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop:50}}>
                     <Text style={{color:'#999'}}>No tienes chats activos.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.textDark, padding: 20, paddingBottom: 10 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 15, ...SHADOWS.card },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textDark },
  service: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primary, marginBottom: 2 },
  lastMsg: { color: '#999', fontSize: 13, fontStyle: 'italic' },
  date: { fontSize: 10, color: '#ccc' }
});

export default ChatListScreen;