import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export type VoiceNote = {
  id: string;
  name: string;
  uri: string;
  duration: number; // milliseconds
  createdAt: number; // timestamp
};

export const SETTINGS_KEY = 'RECORDER_SETTINGS_V1';
const STORAGE_KEY = "VOICE_NOTES_V1";

function getRecordingsDir() {
  const base =
    (FileSystem as any).documentDirectory ??
    (FileSystem as any).cacheDirectory ??
    "";
  return `${base}recordings/`;
}

export async function ensureRecordingsDir() {
  const dir = getRecordingsDir();
  console.log('Ensuring recordings directory exists:', dir);
  
  // Check if we can access the base directory
  const baseDir = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? "";
  console.log('Base directory:', baseDir);
  
  try {
    const baseInfo = await FileSystem.getInfoAsync(baseDir);
    console.log('Base directory accessible:', baseInfo.exists);
  } catch (err) {
    console.error('Cannot access base directory:', err);
    throw new Error('Cannot access file system base directory');
  }
  
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    console.log('Creating recordings directory...');
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    console.log('Recordings directory created successfully');
  } else {
    console.log('Recordings directory already exists');
  }
  
  // Verify directory is writable
  try {
    const testFile = `${dir}test-write-${Date.now()}.tmp`;
    await FileSystem.writeAsStringAsync(testFile, 'test');
    await FileSystem.deleteAsync(testFile, { idempotent: true });
    console.log('Directory is writable');
  } catch (err) {
    console.error('Directory is not writable:', err);
    throw new Error('Recordings directory is not writable');
  }
}

export async function requestAudioPermissions() {
  console.log('Requesting audio permissions...');
  const { status } = await Audio.requestPermissionsAsync();
  console.log('Audio permission status:', status);
  if (status !== "granted") {
    throw new Error("Microphone permission not granted");
  }
  
  console.log('Setting audio mode...');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });
  console.log('Audio permissions and mode set successfully');
}

export async function startRecording(options?: { quality?: 'high'|'low' }): Promise<Audio.Recording> {
  console.log('Starting recording with options:', options);
  await requestAudioPermissions();
  const recording = new Audio.Recording();
  try {
    // prefer explicit option, otherwise read stored settings
    let quality = options?.quality;
    if (!quality) {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          quality = s.recordingQuality ?? 'high';
          console.log('Using stored quality setting:', quality);
        }
      } catch {}
    }
    
    const finalQuality = quality ?? 'high';
    console.log('Final recording quality:', finalQuality);

    const preset = finalQuality === 'low' ? (Audio as any).RECORDING_OPTIONS_PRESET_LOW_QUALITY : (Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY;
    console.log('Using recording preset:', preset);
    
    await recording.prepareToRecordAsync(preset);
    console.log('Recording prepared successfully');
    
    await recording.startAsync();
    console.log('Recording started successfully');
    
    return recording;
  } catch (err) {
    console.error("Failed to start recording", err);
    throw err;
  }
}

export async function stopRecordingAndSave(
  recording: Audio.Recording,
  displayName?: string
): Promise<VoiceNote> {
  try {
    console.log('Stopping recording...');
    await recording.stopAndUnloadAsync();
    const rawUri = recording.getURI();
    if (!rawUri) {
      throw new Error("No recording URI available");
    }
    console.log('Recording stopped, raw URI:', rawUri);

    await ensureRecordingsDir();

    const id = `${Date.now()}`;
    const filename = `${id}.m4a`;
    const dest = `${getRecordingsDir()}${filename}`;
    console.log('Moving recording from', rawUri, 'to', dest);

    // Move file to permanent location
    await FileSystem.moveAsync({ from: rawUri, to: dest });
    console.log('Recording moved successfully to:', dest);

    // Verify file exists after move
    const fileInfo = await FileSystem.getInfoAsync(dest);
    if (!fileInfo.exists) {
      throw new Error('Failed to move recording file to destination');
    }

    // Get duration by loading Sound
    console.log('Loading sound to get duration...');
    const { sound } = await Audio.Sound.createAsync(
      { uri: dest },
      {},
      undefined,
      false
    );
    const status: any = await sound.getStatusAsync();
    const duration = status.durationMillis ?? 0;
    console.log('Recording duration:', duration, 'ms');
    await sound.unloadAsync();

    const note: VoiceNote = {
      id,
      name: displayName ?? `Recording ${new Date().toLocaleString()}`,
      uri: dest,
      duration,
      createdAt: Date.now(),
    };

    console.log('Saving note to storage:', note);
    await saveNote(note);
    console.log('Recording saved successfully!');
    return note;
  } catch (err) {
    console.error("Failed to stop and save recording:", err);
    throw err;
  }
}

export async function saveNote(note: VoiceNote) {
  try {
    console.log('Saving note to AsyncStorage:', note.id);
    const all = await loadNotes();
    all.unshift(note);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    console.log('Note saved successfully. Total notes:', all.length);
  } catch (err) {
    console.error('Failed to save note to AsyncStorage:', err);
    throw err;
  }
}

export async function loadNotes(): Promise<VoiceNote[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.log('No existing notes found');
      return [];
    }
    const notes = JSON.parse(raw) as VoiceNote[];
    console.log('Loaded', notes.length, 'notes from storage');
    return notes;
  } catch (err) {
    console.error("Failed to parse stored notes", err);
    return [];
  }
}

export async function deleteNote(id: string) {
  const notes = await loadNotes();
  const note = notes.find((n) => n.id === id);
  if (note) {
    // delete file
    try {
      await FileSystem.deleteAsync(note.uri, { idempotent: true });
    } catch (err) {
      console.warn("Failed deleting file", err);
    }
  }
  const updated = notes.filter((n) => n.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function renameNote(id: string, newName: string) {
  const notes = await loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx >= 0) {
    notes[idx].name = newName;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
}

export async function clearAllNotes() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  // optionally remove folder
  try {
    const info = await FileSystem.getInfoAsync(getRecordingsDir());
    if (info.exists)
      await FileSystem.deleteAsync(getRecordingsDir(), { idempotent: true });
  } catch {
    // ignore
  }
}

export async function exportBackup(): Promise<string> {
  const notes = await loadNotes();
  const file = `${getRecordingsDir()}backup-${Date.now()}.json`;
  await ensureRecordingsDir();
  await FileSystem.writeAsStringAsync(file, JSON.stringify(notes, null, 2));
  return file;
}

// Debug function to help identify issues
export async async function debugRecordingSystem() {
  console.log('=== Recording System Debug ===');
  
  try {
    // Check file system access
    const baseDir = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? "";
    console.log('Base directory:', baseDir);
    
    const recordingsDir = getRecordingsDir();
    console.log('Recordings directory:', recordingsDir);
    
    const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
    console.log('Recordings directory exists:', dirInfo.exists);
    
    // Check existing recordings
    const notes = await loadNotes();
    console.log('Total notes in storage:', notes.length);
    
    // Check each note's file
    const notesWithFileInfo = [];
    for (const note of notes) {
      const fileInfo = await FileSystem.getInfoAsync(note.uri);
      const fileInfoData = {
        exists: fileInfo.exists,
        size: (fileInfo as any).size || 0,
        uri: fileInfo.uri
      };
      console.log(`Note ${note.id}: file exists = ${fileInfoData.exists}, size = ${fileInfoData.size}`);
      notesWithFileInfo.push({
        id: note.id,
        name: note.name,
        uri: note.uri,
        duration: note.duration,
        fileExists: fileInfoData.exists,
        fileSize: fileInfoData.size
      });
    }
    
    // Check audio permissions
    const { status } = await Audio.getPermissionsAsync();
    console.log('Current audio permission status:', status);
    
    console.log('=== End Debug ===');
    return {
      baseDir,
      recordingsDir,
      dirExists: dirInfo.exists,
      notesCount: notes.length,
      audioPermissionStatus: status,
      notes: notesWithFileInfo
    };
  } catch (err) {
    console.error('Debug failed:', err);
    throw err;
  }
}
