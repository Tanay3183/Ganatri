import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Button, TextInput, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';

import { parseReceiptText } from '../utils/parser';
import { addTransaction } from '../db/database';
import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer';

export default function CameraScreen({navigation}) {

  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  const [formData, setFormData] = useState(null);

  if (!permission) {
    return <View><Text>Permission not granted</Text></View>;
  }

  if(!permission.granted) {
    return(
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.message}>We need your permission to access the camera</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if(cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhoto(data);
    }
  }

  const retakePicture = () => {
    setPhoto(null);
  }
/////////////////////////////////////////////////////////////////////////
  // After clicking photo
/////////////////////////////////////////////////////////////////////////  
  const analyzeReceipt = async () => {

    if(!photo || !photo.base64){return;}
    setLoading(true);

    try{
      const API_KEY=process.env.EXPO_PUBLIC_OCR_API_KEY
      const endpoint = `https://api.ocr.space/parse/image`;

      const formDataBody = new FormData();
      formDataBody.append('apikey', API_KEY);
      formDataBody.append('language', 'eng');
      formDataBody.append('base64Image', `data:image/jpg;base64,${photo.base64}`);
      // engine 2 is optimized for single numbers, decimals, and tabular layouts like receipts
      formDataBody.append('OCREngine', '2');

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formDataBody,
      });

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        alert(`OCR Error: ${result.ErrorMessage[0]}`);
        setPhoto(null);
        return;
      }

      if(result.ParsedResults && result.ParsedResults.length > 0){
        const rawText = result.ParsedResults[0].ParsedText;

        console.log("Raw Text Block from OCR.space:\n", rawText);

        const extractedData = parseReceiptText(rawText);
        setFormData({...extractedData, payment_mode: 'Card'});
      }
      else{
        alert("Could not extract legible text. Please ensure lighting is bright.");
        setPhoto(null);
      }
    }
    catch(error){
      console.error("OCR.space API Error:", error);
      alert("Failed to connect to OCR service.");
    }
    finally{
      setLoading(false);
    }
  }

  const handleManualEntry = () => {
    setPhoto(null);
    setFormData({
      title: '',
      amount: '',
      category: 'Other',
      payment_mode: 'Cash'
    });
  };

  const saveExpense = async () => {
    if (!formData || !formData.title || !formData.amount || !formData.category) {
      alert('Please fill out the title, amount, and category.');
      return;
    }

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Could not authenticate user");

      let cloudImageUrl = null;
      let localUri = null;

      if (photo && photo.base64) {
        const fileName = `${user.id}/${Date.now()}_receipt.jpg`; 
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, decode(photo.base64), { 
            contentType: 'image/jpeg' 
          });

        if (uploadError) {
          console.error("Image upload failed:", uploadError);
          throw new Error("Failed to upload image to cloud.");
        }

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        cloudImageUrl = publicUrlData.publicUrl;
        localUri = photo.uri;
      }

      const { error: dbError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            amount: parseFloat(formData.amount),
            date: today,
            category: formData.category,
            payment_mode: formData.payment_mode || 'Card',
            receipt_url: cloudImageUrl 
          }
        ]);

      if (dbError) {
        console.error("Cloud DB Error:", dbError);
        throw new Error("Failed to save transaction to cloud.");
      }

      await addTransaction(
        user.id,
        formData.title,
        parseFloat(formData.amount),
        today,
        formData.category,
        formData.payment_mode || 'Card',
        localUri 
      );

      setPhoto(null);
      setFormData(null);
      alert('Expense saved successfully!');

    } catch (error) {
      console.error("Error saving record:", error);
      alert(error.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  if(loading){
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3182CE" />
        <Text style={styles.loadingText}>Reading receipt details...</Text>
      </View>
    );
  }

  if(formData){
    return(
      <SafeAreaView style={styles.formContainer}>
        <Text style={styles.formHeader}>Confirm Details</Text>

        <Text style={styles.label}>Merchant / Title</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => setFormData({...formData, title: text})}
        />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.amount.toString()}
          onChangeText={(text) => setFormData({...formData, amount: text})}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput 
          style={styles.input} 
          value={formData.category} 
          onChangeText={(text) => setFormData({...formData, category: text})}
        />

        <Text style={styles.label}>Payment Method</Text>
        <Dropdown
          style={styles.input} // Re-using your standard input style is perfect here
          data={[{label: 'Card', value: 'Card'}, {label: 'Cash', value: 'Cash'}, {label: 'UPI', value: 'UPI'}]}
          labelField="label"
          valueField="value"
          value={formData.payment_mode}
          onChange={item => setFormData({...formData, payment_mode: item.value})}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveExpense}>
          <Text style={styles.buttonText}>Save to Log</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={() => { setFormData(null); setPhoto(null); }}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>

      </SafeAreaView>
    )
  }

  if(photo){
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={retakePicture}>
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={analyzeReceipt}>
            <Text style={styles.buttonText}>Analyze Receipt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.centerContainer}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>

            <View style={styles.receiptFrame} />

            <View style={styles.captureContainer}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureInnerCircle} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
        <TouchableOpacity style={styles.manualButton} onPress={handleManualEntry}>
          <Text style={styles.manualText}>Add manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  manualButton:{
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 15  
  },
  manualText:{
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  formContainer: { flex: 1, backgroundColor: '#F8F9FA', padding: 24 },
  message: { textAlign: 'center', marginBottom: 20, fontSize: 16 },
  camera: { flex: 1, flexDirection: 'row'},
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  receiptFrame: {
    width: '80%',
    height: '85%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20
  },
  captureContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#1A202C',
  },
  primaryButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#4A5568',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', paddingHorizontal:12 },

  formHeader: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginBottom: 25 },
  label: { fontSize: 14, fontWeight: '600', color: '#718096', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#2D3748', marginBottom: 20 },
  saveButton: { backgroundColor: '#48BB78', paddingVertical: 14, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  cancelLink: { backgroundColor: '#798fb3', paddingVertical: 14, marginTop: 20, alignItems: 'center', borderRadius: 8},
  cancelLinkText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});