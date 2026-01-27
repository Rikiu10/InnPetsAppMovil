import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import StarRating from '../components/StarRating'; 
import api from '../services/api';

const CreateReviewScreen = ({ route, navigation }: any) => {
  // Ahora esperamos recibir el objeto booking completo para sacar IDs de mascota/dueño
  const { bookingId, booking, userRole } = route.params; 
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA LA EVALUACIÓN 1 ---
  const [ratingPerson, setRatingPerson] = useState(0);
  const [commentPerson, setCommentPerson] = useState('');

  // --- ESTADOS PARA LA EVALUACIÓN 2 ---
  const [ratingEntity, setRatingEntity] = useState(0); 
  const [commentEntity, setCommentEntity] = useState('');

  // Textos dinámicos según el rol
  const isOwner = userRole === 'PP'; // Pet Parent (Dueño)
  
  const title1 = isOwner ? "Califica al Proveedor" : "Califica al Dueño";
  const placeholder1 = isOwner ? "¿Cómo fue el trato con el cuidador?" : "¿Cómo fue el trato con el cliente?";
  
  const title2 = isOwner ? "Califica el Servicio" : "Califica a la Mascota";
  const placeholder2 = isOwner ? "¿El servicio cumplió tus expectativas?" : "¿Cómo se portó la mascota?";

  const handleSubmit = async () => {
    // Validaciones básicas
    if (ratingPerson === 0 || ratingEntity === 0) {
      Alert.alert("Faltan estrellas", "Por favor califica ambos aspectos antes de enviar.");
      return;
    }

    setLoading(true);
    try {
      
      if (isOwner) {
          // --- ESCENARIO 1: DUEÑO CALIFICA (Envía 1 reseña al Servicio - C2S) ---
          // Combinamos los comentarios porque el modelo C2S solo tiene un campo de texto
          // pero el rating será el promedio o el del servicio.
          
          const payload = {
            booking: bookingId,
            review_type: 'C2S', // Cliente califica Servicio
            rating: ratingEntity, // Usamos la nota del servicio como principal
            comment: `[Servicio]: ${commentEntity} \n[Trato Personal]: ${commentPerson}`,
            reviewed_service: booking.service_id || booking.service, // ID del servicio
          };
          
          console.log("Enviando Reseña C2S...", payload);
          await api.post('/reviews/', payload);

      } else {
          // --- ESCENARIO 2: PROVEEDOR CALIFICA (Envía 2 reseñas separadas) ---
          
          // A) Reseña al Dueño (P2C)
          const payloadUser = {
             booking: bookingId,
             review_type: 'P2C', // Proveedor a Cliente
             rating: ratingPerson,
             comment: commentPerson,
             reviewed_user: booking.owner_id || booking.owner // ID del dueño
          };

          // B) Reseña a la Mascota (P2P)
          // Intentamos obtener el ID de la mascota de varias formas posibles
          const petId = booking.pet_id || (booking.pet && booking.pet.id) || booking.pet;

          const payloadPet = {
             booking: bookingId,
             review_type: 'P2P', // Proveedor a Mascota
             rating: ratingEntity,
             comment: commentEntity,
             reviewed_pet: petId // ID OBLIGATORIO
          };

          console.log("Enviando Reseña Dueño (P2C)...", payloadUser);
          await api.post('/reviews/', payloadUser);
          
          if (petId) {
             console.log("Enviando Reseña Mascota (P2P)...", payloadPet);
             await api.post('/reviews/', payloadPet);
          } else {
             console.warn("⚠️ No se encontró ID de mascota, se omitió la reseña P2P");
          }
      }

      // --- ÉXITO ---
      Alert.alert("¡Gracias!", "Tu calificación ha sido enviada con éxito.", [
        { 
          text: "Ir al Inicio", 
          onPress: () => navigation.popToTop() 
        }
      ]);

    } catch (error: any) {
      console.log("Error al enviar review:", error.response?.data || error);

      // Manejo de errores más detallado
      let errorMsg = "No se pudo enviar la reseña.";
      if (error.response?.data) {
          // Si el backend devuelve un objeto de errores (ej: { reviewed_pet: ["Error..."] })
          const keys = Object.keys(error.response.data);
          if(keys.length > 0) {
              errorMsg = `${keys[0]}: ${error.response.data[keys[0]]}`;
          }
      }
      
      Alert.alert("Error", errorMsg);

    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{fontSize: 24}}>⬅️</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Calificar Experiencia</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* --- SECCIÓN 1: PERSONA (Dueño o Proveedor) --- */}
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>👤 {title1}</Text>
            <StarRating rating={ratingPerson} onRate={setRatingPerson} />
            <TextInput 
                style={styles.input}
                placeholder={placeholder1}
                multiline
                numberOfLines={3}
                value={commentPerson} autoCapitalize="sentences"
                onChangeText={setCommentPerson}
            />
        </View>

        {/* --- SECCIÓN 2: ENTIDAD (Servicio o Mascota) --- */}
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isOwner ? '🛠️' : '🐶'} {title2}</Text>
            <StarRating rating={ratingEntity} onRate={setRatingEntity} />
            <TextInput 
                style={styles.input}
                placeholder={placeholder2}
                multiline
                numberOfLines={3}
                value={commentEntity} autoCapitalize="sentences"
                onChangeText={setCommentEntity}
            />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Calificación</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.white, ...SHADOWS.card },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 20, ...SHADOWS.card },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, textAlign: 'center', marginBottom: 10, color: COLORS.primary },
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginTop: 10, textAlignVertical: 'top', borderWidth: 1, borderColor: '#eee' },
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, ...SHADOWS.card },
  btnText: { color: 'white', fontFamily: FONTS.bold, fontSize: 18 }
});

export default CreateReviewScreen;