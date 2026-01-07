import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

export type VoiceNote = {
  id: string;
  name: string;
  uri: string;
  duration: number;
  createdAt: number;
};

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingSession {
  recording: Audio.Recording;
  state: RecordingState;
  startTime?: number;
  pausedDuration?: number;
  lastPauseTime?: number;
}

const STORAGE_KEY = "VOICE_NOTES_V1";
export const SETTINGS_KEY = "RECORDER_SETTINGS_V1";

/* ------------------------------------------------------------------ */
/* Directory Helpers (ANDROID SAFE) */
/* ------------------------------------------------------------------ */

function getRecordingsDir() {
  const base = FileSystem.documentDirectory;

  if (!base) {
    throw new Error(
      "Cannot access file system for recordings. Please restart the app."
    );
  }

  return `${base}recordings/`;
}

export async function ensureRecordingsDir() {
  const dir = getRecordingsDir();
  const info = await FileSystem.getInfoAsync(dir);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  return dir;
}

/* ------------------------------------------------------------------ */
/* Permissions */
/* ------------------------------------------------------------------ */

export async function requestAudioPermissions() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Microphone permission not granted");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}

/* ------------------------------------------------------------------ */
/* Recording Controls */
/* ------------------------------------------------------------------ */

let currentRecordingSession: RecordingSession | null = null;

export async function startRecording(
  options?: { quality?: "high" | "low" }
): Promise<RecordingSession> {
  await requestAudioPermissions();
  await ensureRecordingsDir();

  const preset =
    options?.quality === "low"
      ? Audio.RecordingOptionsPresets.LOW_QUALITY
      : Audio.RecordingOptionsPresets.HIGH_QUALITY;

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(preset);
  await recording.startAsync();

  currentRecordingSession = {
    recording,
    state: 'recording',
    startTime: Date.now(),
    pausedDuration: 0,
  };

  return currentRecordingSession;
}

export async function pauseRecording(): Promise<void> {
  if (!currentRecordingSession || currentRecordingSession.state !== 'recording') {
    throw new Error('No active recording to pause');
  }

  try {
    await currentRecordingSession.recording.pauseAsync();
    currentRecordingSession.state = 'paused';
    currentRecordingSession.lastPauseTime = Date.now();
  } catch (error) {
    throw new Error('Failed to pause recording');
  }
}

export async function resumeRecording(): Promise<void> {
  if (!currentRecordingSession || currentRecordingSession.state !== 'paused') {
    throw new Error('No paused recording to resume');
  }

  try {
    await currentRecordingSession.recording.startAsync();
    currentRecordingSession.state = 'recording';
    
    if (currentRecordingSession.lastPauseTime) {
      const pauseDuration = Date.now() - currentRecordingSession.lastPauseTime;
      currentRecordingSession.pausedDuration = (currentRecordingSession.pausedDuration || 0) + pauseDuration;
      currentRecordingSession.lastPauseTime = undefined;
    }
  } catch (error) {
    throw new Error('Failed to resume recording');
  }
}

export function getCurrentRecordingSession(): RecordingSession | null {
  return currentRecordingSession;
}

export function getRecordingState(): RecordingState {
  return currentRecordingSession?.state || 'idle';
}

export function getRecordingDuration(): number {
  if (!currentRecordingSession || !currentRecordingSession.startTime) {
    return 0;
  }

  const elapsed = Date.now() - currentRecordingSession.startTime;
  const totalPaused = currentRecordingSession.pausedDuration || 0;
  
  if (currentRecordingSession.state === 'paused' && currentRecordingSession.lastPauseTime) {
    const currentPause = Date.now() - currentRecordingSession.lastPauseTime;
    return elapsed - totalPaused - currentPause;
  }
  
  return elapsed - totalPaused;
}

/* ------------------------------------------------------------------ */
/* Stop & Save (ANDROID SAFE) */
/* ------------------------------------------------------------------ */

export async function stopRecordingAndSave(
  displayName?: string
): Promise<VoiceNote> {
  if (!currentRecordingSession) {
    throw new Error('No active recording to stop');
  }

  console.log("Attempting to save recording...");

  // If recording is paused, resume it briefly to ensure proper finalization
  if (currentRecordingSession.state === 'paused') {
    await currentRecordingSession.recording.startAsync();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }

  await currentRecordingSession.recording.stopAndUnloadAsync();
  console.log("Recording stopped and unloaded");

  const rawUri = currentRecordingSession.recording.getURI();
  if (!rawUri) {
    throw new Error("Recording URI missing");
  }

  const dir = await ensureRecordingsDir();
  const id = Date.now().toString();
  const dest = `${dir}${id}.m4a`;

  // ✅ ANDROID SAFE SAVE
  await FileSystem.copyAsync({
    from: rawUri,
    to: dest,
  });

  await FileSystem.deleteAsync(rawUri, { idempotent: true });

  const { sound } = await Audio.Sound.createAsync({ uri: dest });
  const status = await sound.getStatusAsync();

  if (!status.isLoaded) {
    throw new Error("Failed to load saved audio");
  }

  const duration = status.durationMillis ?? 0;
  await sound.unloadAsync();

  const note: VoiceNote = {
    id,
    name: displayName ?? `Recording ${new Date().toLocaleString()}`,
    uri: dest,
    duration,
    createdAt: Date.now(),
  };

  await saveNote(note);
  console.log("Recording saved:", note);

  // Clear the current session
  currentRecordingSession = null;

  return note;
}

export async function saveCurrentRecording(displayName?: string): Promise<VoiceNote> {
  return stopRecordingAndSave(displayName);
}

export async function cancelRecording(): Promise<void> {
  if (!currentRecordingSession) {
    return;
  }

  try {
    if (currentRecordingSession.state === 'recording' || currentRecordingSession.state === 'paused') {
      await currentRecordingSession.recording.stopAndUnloadAsync();
      
      const rawUri = currentRecordingSession.recording.getURI();
      if (rawUri) {
        await FileSystem.deleteAsync(rawUri, { idempotent: true });
      }
    }
  } catch (error) {
    console.warn('Error during recording cancellation:', error);
  } finally {
    currentRecordingSession = null;
  }
}

/* ------------------------------------------------------------------ */
/* Storage */
/* ------------------------------------------------------------------ */

export async function saveNote(note: VoiceNote) {
  const notes = await loadNotes();
  notes.unshift(note);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export async function loadNotes(): Promise<VoiceNote[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteNote(id: string) {
  const notes = await loadNotes();
  const note = notes.find(n => n.id === id);

  if (note) {
    await FileSystem.deleteAsync(note.uri, { idempotent: true });
  }

  const updated = notes.filter(n => n.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function renameNote(id: string, newName: string) {
  const notes = await loadNotes();
  const index = notes.findIndex(n => n.id === id);

  if (index !== -1) {
    notes[index].name = newName;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
}

/* ------------------------------------------------------------------ */
/* Backup */
/* ------------------------------------------------------------------ */

export async function exportBackup(): Promise<string> {
  const notes = await loadNotes();
  const dir = await ensureRecordingsDir();

  const backupPath = `${dir}voice-notes-backup.json`;
  await FileSystem.writeAsStringAsync(
    backupPath,
    JSON.stringify(notes, null, 2)
  );

  return backupPath;
}
