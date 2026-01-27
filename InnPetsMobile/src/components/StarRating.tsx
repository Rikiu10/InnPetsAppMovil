import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  rating: number;
  onRate: (rating: number) => void;
  maxStars?: number;
}

const StarRating = ({ rating, onRate, maxStars = 5 }: Props) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        return (
          <TouchableOpacity 
            key={index} 
            onPress={() => onRate(starValue)}
            style={styles.starBtn}
          >
            <Text style={[styles.star, { color: starValue <= rating ? '#FFC107' : '#E0E0E0' }]}>
              ★
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  starBtn: { marginHorizontal: 5 },
  star: { fontSize: 40 }
});

export default StarRating;