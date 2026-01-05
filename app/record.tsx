import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { startRecording, stopRecordingAndSave } from './services/recordingService';
import { useRouter } from 'expo-router';

export default function RecordScreen() {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const rec = await startRecording();
      recordingRef.current = rec;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        (async () => {
          if (!recordingRef.current) return;
          const status = await recordingRef.current.getStatusAsync();
          setElapsed(Math.floor((status.durationMillis || 0)));
        })();
      }, 500) as unknown as number;
    } catch (err) {
      console.warn('Start failed', err);
    }
  };

  const stop = async () => {
    try {
      if (!recordingRef.current) return;
      clearInterval(timerRef.current as any);
      await stopRecordingAndSave(recordingRef.current);
      recordingRef.current = null;
      setIsRecording(false);
      // go back to list; list will reload on focus
      router.back();
    } catch (err) {
      console.warn('Stop failed', err);
    }
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRecording ? 'Recording...' : 'Ready to record'}</Text>
      <Text style={styles.timer}>{fmt(elapsed)}</Text>

      <TouchableOpacity
        onPress={isRecording ? stop : start}
        style={[styles.recButton, { backgroundColor: isRecording ? '#ff3b30' : '#007affe' }]}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <Text style={styles.recText}>{isRecording ? 'Stop' : 'Record'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={{ color: '#666' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  timer: { fontSize: 32, marginBottom: 20 },
  recButton: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10 },
  recText: { color: 'white', fontSize: 18, fontWeight: '600' },
  back: { marginTop: 24 },
});
