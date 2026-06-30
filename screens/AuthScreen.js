import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

export default function AuthScreen(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const {error} = await supabase.auth.signInWithPassword({
            email: email, password:password
        });
        if(error){
            Alert.alert('Login Failed', error.message);
        }
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const {data, error} = await supabase.auth.signUp({
            email: email, password: password
        });
        if(error){
             Alert.alert('Signup Failed', error.message)
        }
        else if(data.session===null){
            Alert.alert('Success', 'Please check your inbox for email verification!')
        }
        setLoading(false);
    }

    return(
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to sync your expenses to the cloud.</Text>
                </View>
                <View style={styles.formContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="email@address.com"
                        placeholderTextColor="#A0AEC0"
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="********"
                        placeholderTextColor="#A0AEC0"
                        autoCapitalize={'none'}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.primaryButton} 
                            onPress={signInWithEmail}
                            disabled={loading}
                            >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
                            </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.secondaryButton} 
                            onPress={signUpWithEmail}
                            disabled={loading}
                        >
                            <Text style={styles.secondaryButtonText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2D3748', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096' },
  formContainer: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 16, color: '#2D3748', marginBottom: 20 },
  buttonContainer: { marginTop: 10 },
  primaryButton: { backgroundColor: '#3182CE', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#EDF2F7', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#3182CE', fontSize: 16, fontWeight: 'bold' }
});