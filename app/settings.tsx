import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { SETTINGS_KEY } from './services/recordingService';

type Settings = {
  recordingQuality: 'high' | 'low';
  defaultPlaybackSpeed: number;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ recordingQuality: 'high', defaultPlaybackSpeed: 1 });

  useEffect(() => { (async () => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) setSettings(JSON.parse(raw));
  })(); }, []);

  const save = async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    Alert.alert('Saved', 'Settings saved');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording Quality</Text>
          <Text style={styles.sectionDescription}>Choose between high and low quality recordings</Text>
          <View style={styles.options}>
            <TouchableOpacity 
              style={[styles.option, settings.recordingQuality === 'high' && styles.selected]} 
              onPress={() => setSettings(s => ({ ...s, recordingQuality: 'high' }))}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={16} color={settings.recordingQuality === 'high' ? 'white' : 'transparent'} />
              <Text style={[styles.optionText, settings.recordingQuality === 'high' && styles.selectedText]}>High Quality</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.option, settings.recordingQuality === 'low' && styles.selected]} 
              onPress={() => setSettings(s => ({ ...s, recordingQuality: 'low' }))}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={16} color={settings.recordingQuality === 'low' ? 'white' : 'transparent'} />
              <Text style={[styles.optionText, settings.recordingQuality === 'low' && styles.selectedText]}>Low Quality</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Playback Speed</Text>
          <Text style={styles.sectionDescription}>Set the default speed for playing recordings</Text>
          <TextInput 
            keyboardType="numeric" 
            value={String(settings.defaultPlaybackSpeed)} 
            onChangeText={(t) => setSettings(s => ({ ...s, defaultPlaybackSpeed: Number(t) || 1 }))} 
            style={styles.input} 
            placeholder="1.0"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity onPress={save} style={styles.saveButton} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={18} color="white" />
          <Text style={styles.saveButtonText}>Save Settings</Text>
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
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
  },
  option: { 
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  selected: { 
    backgroundColor: '#6366f1', 
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  selectedText: {
    color: 'white',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    padding: 16, 
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  saveButton: { 
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
  saveButtonText: {
    color: 'white', 
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});