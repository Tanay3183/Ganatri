import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './db/database';
import { supabase } from './utils/supabase';

import HomeScreen from './screens/HomeScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import CameraScreen from './screens/CameraScreen';
import TransactionDetailsScreen from './screens/TransactionDetailsScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';  
import FilteredDataScreen from './screens/FilteredDataScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator(){
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({ 
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scan Receipt') { 
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3182CE',
        tabBarInactiveTintColor: '#A0AEC0',
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Scan Receipt" component={CameraScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {

  const [dbInitialized, setDbInitialized] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setDbInitialized(true);
      }
      catch (error) {
        console.error('Database initialization failed:', error);
      }
    };
    setup();

    supabase.auth.getSession().then(({data: {session}}) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); 
    });
    return () => subscription.unsubscribe()
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading App...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {/* Main App entry point holding the Tab Bar */}
          {session && session.user ? (
            <><Stack.Screen
                name="MainTabs"
                component={TabNavigator}
                options={{ headerShown: false }} 
              />
              
              <Stack.Screen
                name="TransactionDetails"
                component={TransactionDetailsScreen}
                options={{
                  title: 'Receipt Details',
                  headerBackTitle: 'Back',
                  headerTintColor: '#3182CE',
                  headerStyle: { backgroundColor: '#F8F9FA' },
                  headerShadowVisible: false
                }}
              />

              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{ headerShown: false, presentation: 'modal' }} 
              />
              <Stack.Screen 
                name="FilteredData" 
                component={FilteredDataScreen} 
                options={{ headerShown: false, presentation: 'fullScreenModal' }} 
              />
            </>
          ) : (
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen} 
              options={{ headerShown: false }} 
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
