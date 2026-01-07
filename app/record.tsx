import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import {
    cancelRecording,
    getRecordingDuration,
    pauseRecording,
    RecordingSession,
    resumeRecording,
    startRecording,
    stopRecordingAndSave
} from './services/recordingService';

const MIN_RECORDING_TIME = 1000; // 1 second minimum

export default function RecordScreen() {
  const router = useRouter();
  const [recordingSession, setRecordingSession] = useState<RecordingSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Pulsing animation effect for recording state
  useEffect(() => {
    if (!recordingSession || recordingSession.state !== 'recording') {
      setIsPulsing(false);
      return;
    }
    
    const interval = setInterval(() => {
      setIsPulsing(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [recordingSession]);

  // Update elapsed time
  useEffect(() => {
    if (!recordingSession || recordingSession.state !== 'recording') {
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed(getRecordingDuration());
    }, 100) as unknown as number;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingSession]);

  const start = async () => {
    try {
      // Request permissions and start recording
      const session = await startRecording();
      setRecordingSession(session);
      startTimeRef.current = Date.now();
      setElapsed(0);
      
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

  const pause = async () => {
    if (!recordingSession) return;
    
    try {
      await pauseRecording();
      setRecordingSession({ ...recordingSession, state: 'paused' });
      Vibration.vibrate(30);
    } catch (err) {
      console.error('Pause failed', err);
    }
  };

  const resume = async () => {
    if (!recordingSession) return;
    
    try {
      await resumeRecording();
      setRecordingSession({ ...recordingSession, state: 'recording' });
      Vibration.vibrate(30);
    } catch (err) {
      console.error('Resume failed', err);
    }
  };

  const stop = async () => {
    if (!recordingSession) return;
    
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
        await cancelRecording();
        console.log('Short recording discarded');
        
        // Cleanup and navigate back
        clearInterval(timerRef.current as any);
        setRecordingSession(null);
        router.back();
        return;
      }
    }
    
    // Normal recording save process (for both normal and kept short recordings)
    try {
      console.log('Attempting to save recording...');
      const savedNote = await stopRecordingAndSave();
      console.log('Recording saved successfully:', savedNote);
      Vibration.vibrate(100); // Success haptic feedback
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert(
        'Save Failed',
        `Failed to save recording: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
      return; // Don't navigate if save failed
    }
    
    // Cleanup and navigate back
    clearInterval(timerRef.current as any);
    setRecordingSession(null);
    router.back();
  };

  const save = async () => {
    if (!recordingSession) return;
    
    try {
      console.log('Saving current recording...');
      const savedNote = await stopRecordingAndSave();
      console.log('Recording saved successfully:', savedNote);
      Vibration.vibrate(100);
      
      // Cleanup and navigate back
      clearInterval(timerRef.current as any);
      setRecordingSession(null);
      router.back();
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert(
        'Save Failed',
        `Failed to save recording: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingSession?.state === 'recording';
  const isPaused = recordingSession?.state === 'paused';
  const hasRecording = recordingSession !== null;

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
        <View style={[styles.recordingIndicator, hasRecording && styles.recordingActive]}>
          <View style={[styles.recordingDot, isPulsing && styles.recordingPulse]} />
          <Text style={styles.recordingText}>
            {isRecording ? 'Recording...' : isPaused ? 'Paused' : 'Ready to record'}
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
          {!hasRecording ? (
            <TouchableOpacity
              onPress={start}
              style={styles.recButton}
              accessibilityLabel='Start recording'
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={32} color="white" />
              <Text style={styles.recText}>RECORD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controlButtons}>
              <TouchableOpacity
                onPress={isRecording ? pause : resume}
                style={[styles.controlButton, isRecording ? styles.pauseButton : styles.resumeButton]}
                accessibilityLabel={isRecording ? 'Pause recording' : 'Resume recording'}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={isRecording ? 'pause' : 'play'}
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={save}
                style={[styles.controlButton, styles.saveButton]}
                accessibilityLabel='Save recording'
                activeOpacity={0.8}
              >
                <Ionicons name="save" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={stop}
                style={[styles.controlButton, styles.stopButton]}
                accessibilityLabel='Stop recording'
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {!hasRecording && (
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
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  resumeButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
});
