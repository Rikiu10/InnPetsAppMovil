import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../types';
import { chatService } from '../services/chatService';

type Props = NativeStackScreenProps<RootStackParamList, 'MarketplaceItemDetail'>;

const { width } = Dimensions.get('window');

const MarketplaceItemDetailScreen = ({ route, navigation }: Props) => {
  const { item } = route.params;
  const insets = useSafeAreaInsets();
  const [loadingChat, setLoadingChat] = useState(false);

  const imageSource = item.photos_url && item.photos_url.length > 0 
    ? { uri: item.photos_url[0] } 
    : { uri: 'https://via.placeholder.com/600?text=Sin+Foto' };

  const handleContactSeller = async () => {
    setLoadingChat(true);
    try {
        const res = await chatService.createMarketplaceChat(item.id);
        navigation.navigate('ChatDetail', { 
            roomId: res.room_id, 
            partnerName: item.seller_name,
            isSupport: false 
        });
    } catch (error: any) {
        const errorMsg = error.response?.data?.error || "No se pudo contactar al vendedor.";
        Alert.alert("Aviso", errorMsg);
    } finally {
        setLoadingChat(false);
    }
  };

  return (
    // 🔥 ENVOLVEMOS EN UN SAFEAREAVIEW
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        <View style={styles.imageContainer}>
          <Image source={imageSource} style={styles.image} />
          
          <SafeAreaView style={styles.backButtonContainer} edges={['top']}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color={COLORS.textDark} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.contentContainer}>
          
          <View style={styles.headerRow}>
            <View style={[styles.badge, item.condition === 'NEW' ? styles.badgeNew : styles.badgeUsed]}>
              <Text style={styles.badgeText}>{item.condition === 'NEW' ? 'NUEVO' : 'USADO'}</Text>
            </View>
            <Text style={styles.dateText}>
              Publicado el {new Date(item.created_at).toLocaleDateString('es-CL')}
            </Text>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>${Number(item.price).toLocaleString('es-CL')}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Vendedor</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={{fontSize: 24}}>👤</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.sellerName}>{item.seller_name}</Text>
              <Text style={styles.sellerEmail}>{item.seller_email}</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* 🔥 STICKY FOOTER CON MARGEN DINÁMICO */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
            style={styles.contactBtn} 
            activeOpacity={0.8}
            onPress={handleContactSeller}
            disabled={loadingChat}
        >
          {loadingChat ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="chatbubbles" size={22} color={COLORS.white} />
              <Text style={styles.contactBtnText}>Contactar al Vendedor</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  imageContainer: { width: '100%', height: 350, backgroundColor: '#F0F0F0' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  backButtonContainer: { position: 'absolute', top: 10, left: 15 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 20, ...SHADOWS.card },
  contentContainer: { padding: 20, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeNew: { backgroundColor: COLORS.primary },
  badgeUsed: { backgroundColor: COLORS.textDark },
  badgeText: { color: COLORS.white, fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  dateText: { color: COLORS.textLight, fontSize: 12, fontFamily: FONTS.regular },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 8, lineHeight: 28 },
  price: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, marginBottom: 10 },
  description: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textLight, lineHeight: 24 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 16, ...SHADOWS.card },
  sellerAvatar: { width: 50, height: 50, backgroundColor: COLORS.white, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sellerName: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.textDark },
  sellerEmail: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 2 },
  footer: { 
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: 15,
      borderTopWidth: 1, borderTopColor: '#F0F0F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 10
  },
  contactBtn: { 
      flexDirection: 'row', backgroundColor: COLORS.secondary, paddingVertical: 16, 
      borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 
  },
  contactBtnText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold }
});

export default MarketplaceItemDetailScreen;