import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;  // 👈 Esta es la propiedad que faltaba para arreglar el error
  color?: string;
  maxStars?: number;
}

const StarRating = ({ rating, onRate, size = 30, color = "#FFD700", maxStars = 5 }: Props) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        return (
          <TouchableOpacity 
            key={index} 
            onPress={() => onRate && onRate(starValue)}
            activeOpacity={0.7}
            disabled={!onRate}
          >
            <Ionicons 
                name={starValue <= rating ? "star" : "star-outline"} 
                size={size} // 👈 Aquí aplicamos el tamaño dinámico
                color={color} 
                style={{ marginHorizontal: 2 }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default StarRating;