import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SectionList, Alert, Animated, PanResponder, Dimensions, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScaledSheet } from 'react-native-size-matters';

import { getTransactions, deleteTransaction, syncTransactionsFromCloud } from '../db/database';
import { TransactionItem } from '../components/TransactionItem';
import { supabase } from '../utils/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4; //40% of screen sliding

export default function HomeScreen({navigation}) {

  const [allTransactions, setAllTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);

  const formatSectionsTitle= (dateStr) => {
    if(!dateStr)return 'Unknown Date';

    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month-1, day);
    const dayNum = date.getDate();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const weekday = date.toLocaleString('default', { weekday: 'short' });
    
    return `${dayNum} ${monthName} ${weekday}`
  }

  const loadData = async () => {
    try {
      const {data: {user}, error} = await supabase.auth.getUser();
      if(error || !user){
        console.error("No active user found:", error);
        return;
      }

      //loading profile image along with transactions
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
        
      if (profileData && profileData.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }
      /////////////////////

      await syncTransactionsFromCloud(user.id);

      const allData = await getTransactions(user.id);
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const targetSearch = `${currentYear}-${currentMonth}`;

      const currentMonthData = allData.filter(item => {
        if (!item.date) return false;
        return item.date.trim().startsWith(targetSearch);
      })

      setAllTransactions(currentMonthData);

      const data = await getTransactions(user.id);
      setAllTransactions(data);
      
      const total = data.reduce((sum, current) => sum + current.amount, 0);
      setTotalSpent(total);

      const sections = [];
      data.forEach(item => {
        const title = formatSectionsTitle(item.date);
        const existingSection = sections.find(s => s.title===title);
        if(existingSection){
          existingSection.data.unshift(item);
        }
        else{
          sections.push({title: title, data: [item]});
        }
      });
      setGroupedTransactions(sections)
    } 
    catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [])
  );

  useEffect(() => {
    //filtering the data for search
    const filterData = allTransactions.filter(item => {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchAmount = item.amount.toString().includes(query);
      return matchAmount || matchTitle;
    });

    const sections = [];
    filterData.forEach(item => {
      const title = formatSectionsTitle(item.date);
      const existingSection = sections.find(s => s.title===title);
      if(existingSection){
        existingSection.data.unshift(item); 
      } 
      else {
        sections.push({ title: title, data: [item] });
      }
    });

    setGroupedTransactions(sections);
  }, [allTransactions, searchQuery])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        Alert.alert("Logout Failed", error.message);
      } else {
        console.log("✅ 3. Supabase sign out successful! App.js should route you away now.");
      }
    } catch (err) {
      console.error("🔥 Caught a crash during logout:", err);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}> 

        {/*Header*/}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.greeting}>Hello!</Text> 
          </View>
          
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {avatarUrl ? (
              <Image source={{uri: avatarUrl}} style={{ width: 45, height: 45, borderRadius: 22.5 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={45} color="#4A5568" />
            )}
          </TouchableOpacity>
        </View>

        {/*Summary*/}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryAmount}>₹{totalSpent.toFixed(2)}</Text>
        </View>

        {/*Searchbar*/}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#A0AEC0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or amount..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery} // Updates state as you type
          />
          {/* Show a clear button only if there is text in the box */}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        {/*Transactions list*/}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses yet. Scan a receipt to get started!</Text>
          </View>
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({item}) => <TransactionItem item={item} onDeleteRefresh={loadData} />}
            renderSectionHeader={({section: {title}}) => (
              <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeaderText}>{title}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = ScaledSheet.create({
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '10@vs',
  },
  logoutButton: {
    backgroundColor: '#FED7D7', // Soft red background
    padding: '10@s',
    borderRadius: '12@s',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingBottom: '-20@vs',
  },
  container: {
    flex: 1,
    paddingHorizontal: '20@s',
  },
  greeting: {
    fontSize: '28@ms',
    fontWeight: 'bold',
    color: '#333',
    marginLeft: '4@s'
  },
  subGreeting: {
    fontSize: '16@ms',
    color: '#666',
    marginBottom: '20@vs',
  },
  summaryCard: {
    backgroundColor: '#6071a6', //2D3748
    paddingHorizontal: '24@s',
    paddingVertical: '12@vs',
    borderRadius: '16@s',
    marginBottom: '10@vs',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  summaryLabel: {
    color: '#A0AEC0',
    fontSize: '14@ms',
    textTransform: 'uppercase',
    letterSpacing: 1, // Kept absolute to prevent weird text stretching
    marginBottom: '4@vs',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: '36@ms',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: '18@ms',
    fontWeight: '600',
    color: '#333',
  },
  // Grouped data styles
  dateHeaderContainer: {
    backgroundColor: '#F8F9FA', 
    paddingVertical: '4@vs',
    marginBottom: '5@vs',
  },
  dateHeaderText: {
    fontSize: '16@ms',
    fontWeight: 'bold',
    color: '#7687a0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Swiping styles
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E53E3E',
    borderRadius: '12@s',
    justifyContent: 'center',
    paddingLeft: '20@s',
  },
  deleteBackgroundText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: '14@ms',
  },
  // Items
  itemWrapper: {
    marginBottom: '10@vs',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '10@s',
    borderRadius: '12@s',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionTitle: {
    fontSize: '16@ms',
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: '4@vs',
  },
  transactionDate: {
    fontSize: '14@ms',
    color: '#A0AEC0',
  },
  transactionAmount: {
    fontSize: '20@ms',
    fontWeight: 'bold',
    color: '#E53E3E',
  },
  listPadding: {
    paddingBottom: '20@vs',
  },
  emptyState: { 
    alignItems: 'center', 
    marginTop: '40@vs' 
  },
  emptyStateText: { 
    color: '#A0AEC0', 
    fontSize: '16@ms' 
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: '12@s',
    paddingHorizontal: '12@s',
    paddingVertical: '10@vs',
    marginBottom: '10@vs',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { 
    marginRight: '10@s' 
  },
  searchInput: { 
    flex: 1, 
    fontSize: '16@ms', 
    color: '#2D3748' 
  },
});