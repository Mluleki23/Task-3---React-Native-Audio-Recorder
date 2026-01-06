import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { startRecording, stopRecordingAndSave } from './services/recordingService';

const MIN_RECORDING_TIME = 1000; // 1 second minimum

export default function RecordScreen() {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Pulsing animation effect for recording state
  useEffect(() => {
    if (!isRecording) {
      setIsPulsing(false);
      return;
    }
    
    const interval = setInterval(() => {
      setIsPulsing(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isRecording]);

  const start = async () => {
    try {
      // Request permissions and start recording
      const rec = await startRecording();
      recordingRef.current = rec;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setElapsed(0);
      
      // Start timer for recording duration
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 500); // Update every 500ms for smoother animation
      }, 500) as unknown as number;
      
      // Provide haptic feedback
      Vibration.vibrate(50);
    } catch (err) {
      console.error('Start failed', err);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please check microphone permissions and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stop = async () => {
    if (!recordingRef.current) return;
    
    const recordingTime = Date.now() - startTimeRef.current;
    
    // Check for very short recordings
    if (recordingTime < MIN_RECORDING_TIME) {
      const continueRecording = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Short Recording',
          'The recording is very short. Do you want to keep it or continue recording?',
          [
            { text: 'Delete', onPress: () => resolve(false), style: 'destructive' },
            { text: 'Keep', onPress: () => resolve(true) },
            { text: 'Continue', onPress: () => resolve(false) }
          ]
        );
      });
      
      if (!continueRecording) {
        // User chose to delete or continue recording (both result in deletion)
        try {
          await recordingRef.current.stopAndUnloadAsync();
          console.log('Short recording discarded');
        } catch (err) {
          console.error('Error discarding recording:', err);
        }
        
        // Cleanup and navigate back
        clearInterval(timerRef.current as any);
        recordingRef.current = null;
        setIsRecording(false);
        router.back();
        return;
      }
      
      // User chose to keep the short recording, continue with save process
    }
    
    // Normal recording save process
    try {
      console.log('Attempting to save recording...');
      const savedNote = await stopRecordingAndSave(recordingRef.current);
      console.log('Recording saved successfully:', savedNote);
      Vibration.vibrate(100); // Success haptic feedback
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert(
        'Save Failed',
        `Failed to save the recording: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
      return; // Don't navigate if save failed
    }
    
    // Cleanup and navigate back
    clearInterval(timerRef.current as any);
    recordingRef.current = null;
    setIsRecording(false);
    router.back();
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Recorder</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <View style={[styles.recordingIndicator, isRecording && styles.recordingActive]}>
          <View style={[styles.recordingDot, isPulsing && styles.recordingPulse]} />
          <Text style={styles.recordingText}>
            {isRecording ? 'Recording...' : 'Ready to record'}
          </Text>
        </View>
        
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        
        <View style={styles.waveformContainer}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: isRecording 
                    ? Math.random() * 40 + 10 
                    : 4,
                  backgroundColor: isRecording ? '#6366f1' : '#e5e7eb',
                },
              ]}
            />
          ))}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={isRecording ? stop : start}
            style={[styles.recButton, isRecording && styles.recordingButton]}
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isRecording ? 'stop' : 'mic'}
              size={32} 
              color="white" 
            />
            <Text style={styles.recText}>
              {isRecording ? 'STOP' : 'RECORD'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {!isRecording && (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    padding: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recordingActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 12,
    opacity: 0,
  },
  recordingPulse: {
    opacity: 1,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  recordingText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    color: '#111827',
    marginBottom: 40,
    letterSpacing: -2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 40,
    gap: 3,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  buttonContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  recButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  recordingButton: {
    backgroundColor: '#ef4444',
    transform: [{ scale: 1.05 }],
    shadowColor: '#ef4444',
  },
  recText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 2,
  },
  cancelButton: {
    padding: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
