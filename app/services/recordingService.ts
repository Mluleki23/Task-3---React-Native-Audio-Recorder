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
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function requestAudioPermissions() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted")
    throw new Error("Microphone permission not granted");
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    staysActiveInBackground: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });
}

export async function startRecording(options?: { quality?: 'high'|'low' }): Promise<Audio.Recording> {
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
        }
      } catch {}
    }

    const preset = quality === 'low' ? (Audio as any).RECORDING_OPTIONS_PRESET_LOW_QUALITY : (Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY;
    await recording.prepareToRecordAsync(preset);
    await recording.startAsync();
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
    await recording.stopAndUnloadAsync();
    const rawUri = recording.getURI();
    if (!rawUri) throw new Error("No recording URI");

    await ensureRecordingsDir();

    const id = `${Date.now()}`;
    const filename = `${id}.m4a`;
    const dest = `${getRecordingsDir()}${filename}`;

    // Move file to permanent location
    await FileSystem.moveAsync({ from: rawUri, to: dest });

    // Get duration by loading Sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: dest },
      {},
      undefined,
      false
    );
    const status: any = await sound.getStatusAsync();
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
    return note;
  } catch (err) {
    console.error("Failed to stop and save recording", err);
    throw err;
  }
}

export async function saveNote(note: VoiceNote) {
  const all = await loadNotes();
  all.unshift(note);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function loadNotes(): Promise<VoiceNote[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VoiceNote[];
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
