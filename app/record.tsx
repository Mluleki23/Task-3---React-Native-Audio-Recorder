import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
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
          'The recording is very short. Do you want to continue recording?',
          [
            { text: 'Delete', onPress: () => resolve(false), style: 'destructive' },
            { text: 'Continue', onPress: () => resolve(true) }
          ]
        );
      });
      
      if (continueRecording) return; // Continue recording
      
      // User chose to delete the short recording
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (err) {
        console.error('Error discarding recording:', err);
      }
    } else {
      // Normal recording stop
      try {
        await stopRecordingAndSave(recordingRef.current);
        Vibration.vibrate(100); // Success haptic feedback
      } catch (err) {
        console.error('Stop failed', err);
        Alert.alert(
          'Save Failed',
          'Failed to save the recording. Please try again.',
          [{ text: 'OK' }]
        );
        return; // Don't navigate if save failed
      }
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
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
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  recordingActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
    marginRight: 8,
    opacity: 0,
  },
  recordingPulse: {
    opacity: 1,
  },
  recordingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: '#000',
    marginBottom: 48,
  },
  buttonContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  recButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingButton: {
    backgroundColor: '#ff3b30',
    transform: [{ scale: 1.05 }],
  },
  recText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1,
  },
  cancelButton: {
    padding: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
