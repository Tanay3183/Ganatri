import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({ name: '', other_info: '', avatar_url: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const {data, error} = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if(data){
        setProfile(data);
      } 
      else{
        await supabase.from('profiles').insert([{id: user.id}]);
      }
    } 
    catch(error){
      console.error("Error loading profile:", error);
    } 
    finally{
      setLoading(false);
    }
  };

  const handleSaveData = async (key, value) => {
    if (!userId) return;
    setProfile(prev => ({...prev, [key]: value}));
    await supabase.from('profiles').update({[key]: value}).eq('id', userId);
  };

  const pickAndUploadImage = async () => {
    // 1. Open Image Picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if(!result.canceled && result.assets[0].base64) {
      setSaving(true);
      try {
        const imageBase64 = result.assets[0].base64;
        const fileName = `${userId}/${Date.now()}_avatar.jpg`;

        const {error: uploadError} = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(imageBase64), {contentType: 'image/jpeg'});

        if (uploadError) throw uploadError;

        const {data: publicUrlData} = supabase.storage.from('avatars').getPublicUrl(fileName);
        const newAvatarUrl = publicUrlData.publicUrl;

        await supabase.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', userId);
        setProfile(prev => ({...prev, avatar_url: newAvatarUrl}));
      } 
      catch(error){
        Alert.alert("Upload Failed", error.message);
      }
      finally{
        setSaving(false);
      }
    }
  };

  const handleLogout = async () => {
    const {error} = await supabase.auth.signOut();
    if(error) Alert.alert("Logout Failed", error.message);
  };

  const confirmLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: handleLogout 
        }
      ]
    );
  };

  if(loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3182CE"/></View>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#4A5568" />
        </TouchableOpacity>
      </View>

      {/* Profile Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity onPress={pickAndUploadImage} style={styles.imageCircle}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={60} color="#A0AEC0" />
          )}
          {saving && 
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAndUploadImage}>
          <Text style={styles.editImageText}>Edit image</Text>
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <View style={styles.inputsSection}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Arun Kumar"
          placeholderTextColor="#A0AEC0"
          value={profile.name}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          onEndEditing={(e) => handleSaveData('name', e.nativeEvent.text)}
        />

        <Text style={styles.label}>Other Info</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bio, Phone, etc."
          placeholderTextColor="#A0AEC0"
          value={profile.other_info}
          onChangeText={(text) => setProfile({ ...profile, other_info: text })}
          onEndEditing={(e) => handleSaveData('other_info', e.nativeEvent.text)}
        />
      </View>

      {/* Action List */}
      <View style={styles.listSection}>
        <TouchableOpacity onPress={() => navigation.navigate('FilteredData', {mode: 'monthly'})} style={styles.listRow}>
          <Text style={styles.listText}>Show monthly data</Text>
          <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('FilteredData', {mode: 'yearly'})} style={styles.listRow}>
          <Text style={styles.listText}>Show yearly data</Text>
          <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.listRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.listText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E53E3E" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 30 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3748' },
  closeButton: { backgroundColor: '#EDF2F7', padding: 8, borderRadius: 20 },
  
  imageSection: { alignItems: 'center', marginBottom: 35 },
  imageCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#E2E8F0' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  loaderOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  editImageText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#3182CE' },

  inputsSection: { marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#2D3748', marginBottom: 20 },

  listSection: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 40 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  listText: { fontSize: 16, fontWeight: '500', color: '#2D3748' },

  bottomSection: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  logoutButton: { flexDirection: 'row', backgroundColor: '#FED7D7', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', width: '100%', justifyContent: 'center' },
  logoutText: { color: '#E53E3E', fontSize: 16, fontWeight: 'bold' }
});