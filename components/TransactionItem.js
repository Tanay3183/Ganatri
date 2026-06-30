// components/TransactionItem.js
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { deleteTransaction } from '../db/database';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

export const TransactionItem = ({ item, onDeleteRefresh }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isAlertActive = useRef(false);
  const navigation = useNavigation();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSignificantMovement = Math.abs(gestureState.dx) > 10;
        return isHorizontalSwipe && isSignificantMovement;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && !isAlertActive.current) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => { 
        if (isAlertActive.current) return;

        if (gestureState.dx > SWIPE_THRESHOLD) {
          isAlertActive.current = true;
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 150,
            useNativeDriver: true
          }).start(() => {
            Alert.alert(
              'Delete Transaction', 
              `Are you sure you want to delete "${item.title}"?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    Animated.spring(translateX, { toValue: 0, friction: 6, useNativeDriver: true }).start(() => {
                      isAlertActive.current = false;
                    });
                  }
                },
                {
                  text: 'OK',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteTransaction(item.id);
                      if (onDeleteRefresh) onDeleteRefresh(); // Safely call the refresh prop
                    } catch(error) {
                      console.error(error);
                    } finally {
                      isAlertActive.current = false;
                    }
                  }
                }
              ]
            );
          })
        } else {
          Animated.spring(translateX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, friction: 5, useNativeDriver: true }).start(() => {
          isAlertActive.current = false;
        });
      }
    })
  ).current;

  return (
    <View style={styles.itemWrapper}>
      <View style={styles.deleteBackground}>
        <Text style={styles.deleteBackgroundText}>Release to Delete</Text>
      </View>
      <Animated.View style={[styles.transactionRow, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.touchableArea} 
          activeOpacity={0.6}
          onPress={() => navigation.navigate('TransactionDetails', { item })}
        >
          <View>
            <Text style={styles.transactionTitle}>{item.title}</Text>
            <Text style={styles.transactionDate}>{item.date} • {item.category}</Text>
          </View>
          <Text style={styles.transactionAmount}>₹{item.amount.toFixed(2)}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  deleteBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E53E3E', borderRadius: 12, justifyContent: 'center', paddingLeft: 20 },
  deleteBackgroundText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  itemWrapper: { marginBottom: 10 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  transactionTitle: { fontSize: 16, fontWeight: '500', color: '#2D3748', marginBottom: 4 },
  transactionDate: { fontSize: 13, color: '#A0AEC0' },//A0AEC0
  transactionAmount: { fontSize: 20, fontWeight: 'bold', color: '#E53E3E' },
  touchableArea: {
    flex:1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5,
  },
});