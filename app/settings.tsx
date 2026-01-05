import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SETTINGS_KEY } from './services/recordingService';

type Settings = {
  recordingQuality: 'high' | 'low';
  defaultPlaybackSpeed: number;
};

export default function SettingsScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Recording Quality</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[styles.option, settings.recordingQuality === 'high' && styles.selected]} onPress={() => setSettings(s => ({ ...s, recordingQuality: 'high' }))}>
          <Text style={{ color: settings.recordingQuality === 'high' ? 'white' : '#333' }}>High</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.option, settings.recordingQuality === 'low' && styles.selected]} onPress={() => setSettings(s => ({ ...s, recordingQuality: 'low' }))}>
          <Text style={{ color: settings.recordingQuality === 'low' ? 'white' : '#333' }}>Low</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Default Playback Speed</Text>
      <TextInput keyboardType="numeric" value={String(settings.defaultPlaybackSpeed)} onChangeText={(t) => setSettings(s => ({ ...s, defaultPlaybackSpeed: Number(t) || 1 }))} style={styles.input} />

      <TouchableOpacity onPress={save} style={styles.save}>
        <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 8 },
  option: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  selected: { backgroundColor: '#007affe', borderColor: '#007affe' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6 },
  save: { marginTop: 20, backgroundColor: '#007affe', padding: 12, borderRadius: 8, alignItems: 'center' },
});