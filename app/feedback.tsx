import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const FEEDBACK_KEY = 'FEEDBACK_V1';

export default function Feedback() {
  const router = useRouter();
  const [text, setText] = useState('');

  const submit = async () => {
    if (!text.trim()) return Alert.alert('Please enter feedback');
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ text, createdAt: Date.now() });
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(arr));
    setText('');
    Alert.alert('Thanks', 'Feedback saved locally');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.title}>Feedback & Support</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Ionicons name="chatbubble-outline" size={32} color="#6366f1" style={styles.icon} />
          <Text style={styles.sectionTitle}>Send us your feedback</Text>
          <Text style={styles.sectionDescription}>
            Help us improve by sharing your thoughts, reporting issues, or suggesting new features.
          </Text>
          <Text style={styles.note}>Messages are saved locally on your device.</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Your feedback</Text>
          <TextInput 
            value={text} 
            onChangeText={setText} 
            placeholder="Share your thoughts..." 
            multiline 
            style={styles.input}
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
          onPress={submit}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="white" />
          <Text style={styles.sendButtonText}>Send Feedback</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#111827',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  icon: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  note: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    padding: 16, 
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 120,
    lineHeight: 20,
  },
  sendButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1', 
    padding: 16, 
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowColor: 'transparent',
    elevation: 0,
  },
  sendButtonText: {
    color: 'white', 
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});