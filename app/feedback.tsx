import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEEDBACK_KEY = 'FEEDBACK_V1';

export default function Feedback() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Feedback & Support</Text>
      <Text style={{ marginBottom: 8 }}>Send feedback or report issues. Messages are saved locally.</Text>
      <TextInput value={text} onChangeText={setText} placeholder="Write feedback..." multiline style={styles.input} />
      <TouchableOpacity style={styles.send} onPress={submit}><Text style={{ color: 'white', fontWeight: '600' }}>Send</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, minHeight: 120 },
  send: { marginTop: 12, backgroundColor: '#007affe', padding: 12, borderRadius: 8, alignItems: 'center' },
});