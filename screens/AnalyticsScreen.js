import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { Dropdown } from 'react-native-element-dropdown';

import { TransactionItem } from '../components/TransactionItem';
import { getTransactions } from '../db/database';
import { supabase } from '../utils/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnalyticsScreen() {

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    { label: 'All', value: 'All' },
    { label: 'Food', value: 'Food' },
    { label: 'Transport', value: 'Transport' },
    { label: 'Shopping', value: 'Shopping' },
    { label: 'Groceries', value: 'Groceries' },
    { label: 'Health', value: 'Health' },
    { label: 'Other', value: 'Other' },
  ];

  const categoryColors = {
    'Food': '#F6AD55',
    'Transport': '#63B3ED',
    'Groceries': '#68D391',
    'Health': '#FC8181',
    'Shopping': '#d181fc',
    'Other': '#A0AEC0',
  };

  const loadAndProcesData = async (isActive = true) => {
    setLoading(true);

    try{
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) return;

      const data = await getTransactions(user.id);
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const targetSearch = `${currentYear}-${currentMonth}`;
      const currentMonthData = data.filter(item => {
        if (!item.date) return false;
        return item.date.trim().startsWith(targetSearch);
      });

      setAllTransactions(currentMonthData);
      //total amount calculation (similar to ocaml syntax)
      const total = currentMonthData.reduce((sum, item) => sum + parseFloat((item.amount) || 0), 0);
      setTotalSpent(total);

      //aggregate items by category
      const aggregated = {};
      currentMonthData.forEach(item => {
        if(aggregated[item.category]){
          aggregated[item.category] += item.amount;
        }
        else{
          aggregated[item.category] = item.amount;
        }
      });

      //formatting data acco. to chart-kit
      const formattedChartData = Object.keys(aggregated).map((key) => ({
        name: key,
        amount: aggregated[key],
        color: categoryColors[key] || categoryColors['Other'],
        legendFontColor: '#4A5568',
        legendFontSize: 14,
      }));

      formattedChartData.sort((a, b) => b.amount - a.amount);
      if(isActive){
        setChartData(formattedChartData);
      }
    }
    catch(error){
      console.error("Failed to load analytics:", error);
    }
    finally{
      if (isActive) {
        setLoading(false); 
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadAndProcesData();
      return () => { isActive = false; };
    }, [])
  )//useFocusEffect completed

  if(loading){
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3182CE" />
      </SafeAreaView>
    );
  }

  const listData = selectedCategory === 'All' 
    ? allTransactions 
    : allTransactions.filter(item => item.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Analytics</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Month's Spendings</Text>
          <Text style={styles.summaryAmount}>₹{totalSpent.toFixed(2)}</Text>
        </View>

        {chartData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No data to visualize yet.</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>By Category</Text>
            <PieChart
              data={chartData}
              width={SCREEN_WIDTH - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={"amount"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute='true'
            />
          </View>
        )}
        <Dropdown
          containerStyle={styles.dropdownMenuContainer}
          placeholderStyle={styles.dropdownText}
          selectedTextStyle={styles.dropdownText}
          itemTextStyle={styles.dropdownItemText}
          activeColor="#EDF2F7"
          iconColor='#FFFFFF'
          style={styles.dropdown}                                
          data = {categories}
          labelField="label"
          valueField="value"
          placeholder="Select item"
          value={selectedCategory}
          onChange={item => setSelectedCategory(item.value)}
        />
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <TransactionItem 
              item={item} 
              onDeleteRefresh={loadAndProcesData} 
            />
          )}
        />
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: '#8290ac',//8a96a4
    height: 40,
    // borderColor: 'gray',
    // borderWidth: 0.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginVertical: 10,
    elevation: 2,
  },
  dropdownText: {
    fontSize: 16,
    color: '#ffffff',
  },
  // Styles the floating popup wrapper list
  dropdownMenuContainer: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Font style for the individual options inside the opened menu list
  dropdownItemText: {
    fontSize: 16,
    color: '#4A5568',
  },
  safeArea: { flex: 1, backgroundColor: '#F8F9FA', },
  container: { flex:1, paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 4, marginLeft: 4 },
  subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#3182CE',
    padding: 24,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryLabel: { color: '#E2E8F0', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  summaryAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold' },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    height: 250,
  },
  chartTitle: { fontSize: 18, fontWeight: '600', color: '#2D3748', marginHorizontal: 10, marginTop:2 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { color: '#A0AEC0', fontSize: 16 }
});