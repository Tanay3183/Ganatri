import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransactionDetailsScreen({ route }) {
  // Extract the specific transaction item passed from the touchable list
  const { item } = route.params;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/*Top Header Block*/}
        <View style={styles.headerBlock}>
          <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
          <Text style={styles.titleText}>{item.title}</Text>
        </View>

        {/*Info Card*/}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{item.date}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{item.category}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.label}>Payment Method</Text>
            {/*Fallback to 'Not Specified' for older items before we added the column*/}
            <Text style={styles.value}>{item.payment_mode || 'Not Specified'}</Text>
          </View>
        </View>

        {/*Receipt Image Viewer*/}
        <Text style={styles.sectionTitle}>Attached Receipt</Text>
        {item.receipt_uri ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.receipt_uri }} 
              style={styles.receiptImage} 
            />
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No receipt image saved for this transaction.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { padding: 20, paddingBottom: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  amountText: { fontSize: 48, fontWeight: 'bold', color: '#fd7c59', marginBottom: 5 },//2D3748
  titleText: { fontSize: 20, color: '#5a6575', fontWeight: '600' },
  
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 15, color: '#91a3b9', fontWeight: '500' },
  value: { fontSize: 16, color: '#2D3748', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#EDF2F7', my: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2D3748', marginBottom: 15, marginLeft: 5 },
  imageContainer: { backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  receiptImage: { width: '100%', height: 450, resizeMode: 'contain' },
  
  noImageContainer: { backgroundColor: '#EDF2F7', borderRadius: 16, padding: 40, alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: '#A0AEC0', fontSize: 15, textAlign: 'center' }
});