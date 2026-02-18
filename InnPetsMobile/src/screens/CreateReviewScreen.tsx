import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../components/StarRating'; 
import api from '../services/api';

const CreateReviewScreen = ({ route, navigation }: any) => {
  const { bookingId, booking, userRole } = route.params; 
  const [loading, setLoading] = useState(false);

  // --- ESTADO UNIFICADO DE RESEÑAS ---
  // Guardamos: { "C2S": {rating:0, comment:""}, "C2P": {...}, "P2P_15": {...} }
  const [reviewsData, setReviewsData] = useState<Record<string, { rating: number; comment: string }>>({});
  
  // --- CONTROL DE PESTAÑAS ---
  const isOwner = userRole === 'PP'; // Dueño
  const [activeTab, setActiveTab] = useState(isOwner ? 'C2S' : 'P2C');
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Al cargar, inicializamos datos
  useEffect(() => {
      // Si hay mascotas y soy proveedor, selecciono la primera para la tab de mascotas
      if (!isOwner) {
          const pets = booking.pets_details || booking.pets || [];
          if (pets.length > 0) {
              const firstPetId = typeof pets[0] === 'object' ? pets[0].id : pets[0];
              setSelectedPetId(firstPetId);
          }
      }
  }, []);

  // --- HELPERS ---
  const getCurrentKey = () => {
      if (activeTab === 'P2P') return `P2P_${selectedPetId}`;
      return activeTab;
  };

  const getCurrentData = () => {
      const key = getCurrentKey();
      return reviewsData[key] || { rating: 0, comment: '' };
  };

  const updateCurrentData = (field: 'rating' | 'comment', value: any) => {
      const key = getCurrentKey();
      setReviewsData(prev => ({
          ...prev,
          [key]: {
              ...prev[key],
              rating: prev[key]?.rating || 0,
              comment: prev[key]?.comment || '',
              [field]: value
          }
      }));
  };

  // --- ENVÍO ---
  const handleSubmit = async () => {
    // Filtramos solo las reseñas que tienen estrellas (rating > 0)
    const reviewsToSend = Object.entries(reviewsData).filter(([_, data]) => data.rating > 0);

    if (reviewsToSend.length === 0) {
        Alert.alert("Falta información", "Por favor califica al menos un aspecto antes de enviar.");
        return;
    }

    setLoading(true);
    try {
        const promises = reviewsToSend.map(([key, data]) => {
            let payload: any = {
                booking: bookingId,
                rating: data.rating,
                comment: data.comment,
            };

            if (key === 'C2S') {
                payload.review_type = 'C2S'; // Cliente -> Servicio
                payload.reviewed_service = typeof booking.service === 'object' ? booking.service.id : booking.service;
            } 
            else if (key === 'C2P') {
                payload.review_type = 'C2P'; // Cliente -> Proveedor (Persona)
                payload.reviewed_user = typeof booking.provider === 'object' ? booking.provider.id : booking.provider;
            } 
            else if (key === 'P2C') {
                payload.review_type = 'P2C'; // Proveedor -> Cliente
                payload.reviewed_user = typeof booking.owner === 'object' ? booking.owner.id : booking.owner;
            } 
            else if (key.startsWith('P2P_')) {
                payload.review_type = 'P2P'; // Proveedor -> Mascota
                const petId = Number(key.split('_')[1]);
                payload.reviewed_pet = petId;
            }

            console.log(`Enviando ${key}:`, payload);
            return api.post('/reviews/', payload);
        });

        await Promise.all(promises);

        Alert.alert("¡Gracias!", "Tus calificaciones han sido enviadas.", [
            { text: "Volver", onPress: () => navigation.goBack() }
        ]);

    } catch (error: any) {
        console.error("Error enviando reviews:", error.response?.data || error);
        Alert.alert("Error", "Hubo un problema al enviar algunas reseñas.");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERIZADO ---
  const currentData = getCurrentData();
  const petsList = booking.pets_details || booking.pets || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{fontSize: 24}}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calificar Experiencia</Text>
        <View style={{width: 24}} />
      </View>

      {/* Tabs Superiores */}
      <View style={styles.tabsContainer}>
          {isOwner ? (
              <>
                  <TouchableOpacity 
                      style={[styles.tab, activeTab === 'C2S' && styles.activeTab]} 
                      onPress={() => setActiveTab('C2S')}
                  >
                      <Ionicons name="briefcase" size={18} color={activeTab === 'C2S' ? '#fff' : COLORS.primary} />
                      <Text style={[styles.tabText, activeTab === 'C2S' && styles.activeTabText]}>Servicio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.tab, activeTab === 'C2P' && styles.activeTab]} 
                      onPress={() => setActiveTab('C2P')}
                  >
                      <Ionicons name="person" size={18} color={activeTab === 'C2P' ? '#fff' : COLORS.primary} />
                      <Text style={[styles.tabText, activeTab === 'C2P' && styles.activeTabText]}>Cuidador</Text>
                  </TouchableOpacity>
              </>
          ) : (
              <>
                  <TouchableOpacity 
                      style={[styles.tab, activeTab === 'P2C' && styles.activeTab]} 
                      onPress={() => setActiveTab('P2C')}
                  >
                      <Ionicons name="person" size={18} color={activeTab === 'P2C' ? '#fff' : COLORS.primary} />
                      <Text style={[styles.tabText, activeTab === 'P2C' && styles.activeTabText]}>Dueño</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.tab, activeTab === 'P2P' && styles.activeTab]} 
                      onPress={() => setActiveTab('P2P')}
                  >
                      <Ionicons name="paw" size={18} color={activeTab === 'P2P' ? '#fff' : COLORS.primary} />
                      <Text style={[styles.tabText, activeTab === 'P2P' && styles.activeTabText]}>Mascota</Text>
                  </TouchableOpacity>
              </>
          )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Selector de Mascota (Solo si es Proveedor y está en tab Mascota) */}
        {!isOwner && activeTab === 'P2P' && petsList.length > 0 && (
            <View style={styles.petSelector}>
                <Text style={styles.sectionLabel}>Selecciona la mascota a calificar:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {petsList.map((p: any) => {
                        const pId = typeof p === 'object' ? p.id : p;
                        const pName = typeof p === 'object' ? p.name : `Mascota #${p}`;
                        return (
                            <TouchableOpacity 
                                key={pId} 
                                style={[styles.petChip, selectedPetId === pId && styles.activePetChip]}
                                onPress={() => setSelectedPetId(pId)}
                            >
                                <Text style={[styles.petChipText, selectedPetId === pId && styles.activePetChipText]}>
                                    {pName}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        )}

        {/* Tarjeta de Calificación */}
        <View style={styles.card}>
            <Text style={styles.questionText}>
                {activeTab === 'C2S' && `¿Cómo estuvo el servicio?`}
                {activeTab === 'C2P' && `¿Qué tal fue el trato con el cuidador?`}
                {activeTab === 'P2C' && `¿Cómo fue la experiencia con el dueño?`}
                {activeTab === 'P2P' && `¿Cómo se portó la mascota?`}
            </Text>

            <View style={{ marginVertical: 20 }}>
                <StarRating 
                    rating={currentData.rating} 
                    onRate={(r) => updateCurrentData('rating', r)} 
                    size={40}
                />
            </View>

            <TextInput 
                style={styles.input}
                placeholder="Escribe un comentario (opcional)..."
                multiline
                numberOfLines={4}
                value={currentData.comment}
                autoCapitalize="sentences"
                onChangeText={(t) => updateCurrentData('comment', t)}
            />
        </View>

        {/* Resumen de Progreso */}
        <Text style={styles.helperText}>
            Has completado {Object.values(reviewsData).filter(d => d.rating > 0).length} reseña(s).
            Puedes cambiar de pestaña para calificar lo demás.
        </Text>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Todo</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.white, ...SHADOWS.card },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  
  tabsContainer: { flexDirection: 'row', padding: 15, justifyContent: 'center', gap: 15, backgroundColor: COLORS.background },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.white },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { marginLeft: 8, color: COLORS.primary, fontFamily: FONTS.bold },
  activeTabText: { color: 'white' },

  petSelector: { marginBottom: 20 },
  sectionLabel: { marginBottom: 10, color: COLORS.textLight, fontFamily: FONTS.bold },
  petChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#e0e0e0', marginRight: 10 },
  activePetChip: { backgroundColor: COLORS.secondary },
  petChipText: { color: '#333' },
  activePetChipText: { color: 'white', fontWeight: 'bold' },

  card: { backgroundColor: COLORS.white, padding: 25, borderRadius: 20, marginBottom: 20, ...SHADOWS.card, alignItems: 'center' },
  questionText: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark, textAlign: 'center' },
  
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 15, width: '100%', textAlignVertical: 'top', borderWidth: 1, borderColor: '#eee', height: 120 },
  
  helperText: { textAlign: 'center', color: COLORS.textLight, marginBottom: 20, fontSize: 13 },

  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', ...SHADOWS.card },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 18 }
});

export default CreateReviewScreen;