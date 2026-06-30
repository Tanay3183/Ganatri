import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../utils/supabase';
import { getTransactions } from '../db/database';
import { PieChart } from 'react-native-chart-kit';

export default function FilteredDataScreen({ route, navigation }) {
    const { mode } = route.params;
    const insets = useSafeAreaInsets();
    const SCREEN_WIDTH = Dimensions.get('window').width;

    const currentYear = new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [transactions, setTransactions] = useState([]);
    const [totalSpent, setTotalSpent] = useState(0);
    const [loading, setLoading] = useState(true);

    const years = [
        { label: '2026', value: '2026' },
        { label: '2025', value: '2025' },
        { label: '2024', value: '2024' },
    ];
    const months = [
        { label: 'January', value: '01' }, { label: 'February', value: '02' },
        { label: 'March', value: '03' }, { label: 'April', value: '04' },
        { label: 'May', value: '05' }, { label: 'June', value: '06' },
        { label: 'July', value: '07' }, { label: 'August', value: '08' },
        { label: 'September', value: '09' }, { label: 'October', value: '10' },
        { label: 'November', value: '11' }, { label: 'December', value: '12' },
    ];

    const categoryColors = {
        'Food': '#F6AD55',
        'Transport': '#63B3ED',
        'Groceries': '#68D391',
        'Health': '#FC8181',
        'Shopping': '#d181fc',
        'Other': '#A0AEC0',
    };

    useEffect(() => {
        loadAndFilterData();
    }, [selectedYear, selectedMonth, mode]);

    const loadAndFilterData = async () => {
        setLoading(true);
        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const allData = await getTransactions(user.id);
        

        const targetSearch = mode === 'monthly' ? `${selectedYear}-${selectedMonth}` : `${selectedYear}`;

        const filteredData = allData.filter(item => {
            if (!item.date) return false;
            
            const cleanDate = item.date.trim(); 
            
            return cleanDate.startsWith(targetSearch);
        });

        setTransactions(filteredData);
        
        const total = filteredData.reduce((sum, current) => sum + current.amount, 0);
        setTotalSpent(total);

        } catch (error) {
        console.error("Error loading filtered data:", error);
        } finally {
        setLoading(false);
        }
    };

    const groupedData = transactions.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {});

    const chartData = Object.keys(groupedData).map(category => ({
        name: category,
        amount: groupedData[category],
        color: categoryColors[category] || '#A0AEC0',
        legendFontColor: '#4A5568',
        legendFontSize: 13
    })).sort((a, b) => b.amount - a.amount);

    const renderTransaction = ({ item }) => (
        <View style={styles.transactionCard}>
        <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardCategory}>{item.category} • {item.date}</Text>
        </View>
        <Text style={styles.cardAmount}>₹{item.amount.toFixed(2)}</Text>
        </View>
    );

    return(
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={{ height: insets.top-10, backgroundColor: '#FFF' }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2D3748" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {mode === 'monthly' ? 'Monthly Expenses' : 'Yearly Expenses'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filters Section */}
            <View style={styles.filtersContainer}>
                {mode === 'monthly' ? (
                <View style={styles.filterWrapper}>
                    <Text style={styles.label}>Month</Text>
                    <Dropdown
                    style={styles.dropdown}
                    data={months}
                    labelField="label"
                    valueField="value"
                    value={selectedMonth}
                    onChange={item => setSelectedMonth(item.value)}
                    />
                </View>
                ) : null}

                <View style={styles.filterWrapper}>
                <Text style={styles.label}>Year</Text>
                <Dropdown
                    style={styles.dropdown}
                    data={years}
                    labelField="label"
                    valueField="value"
                    value={selectedYear}
                    onChange={item => setSelectedYear(item.value)}
                />
                </View>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
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
                )
            }

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTransaction}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No expenses found for this period.</Text>
                }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    chartContainer:{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        marginHorizontal: 20,
        marginBottom: 10,
        height: 240,
    },
    chartTitle: { fontSize: 18, fontWeight: '600', color: '#2D3748', marginHorizontal: 10, },
    container: { flex: 1, backgroundColor: '#F8F9FA', },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#FFF', borderBottomWidth: 0, borderColor: '#E2E8F0' },
    backButton: { padding: 8, backgroundColor: '#EDF2F7', borderRadius: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    
    filtersContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,gap: 15 },
    filterWrapper: { flex: 1 },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
    dropdown: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, height: 50 },

    summaryCard: {
        backgroundColor: '#3182CE', 
        shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4,
        marginHorizontal: 20, 
        padding: 24, 
        borderRadius: 16, 
        marginBottom: 10, 
        elevation: 4 
    },
    summaryLabel: { color: '#E2E8F0', fontSize: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,},
    summaryAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold' },

    transactionCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    cardLeft: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
    cardCategory: { fontSize: 13, color: '#718096' },
    cardAmount: { fontSize: 18, fontWeight: 'bold', color: '#E53E3E' },
    
    emptyText: { textAlign: 'center', color: '#A0AEC0', fontSize: 16, marginTop: 40 }
});