import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VoiceNote } from "../services/recordingService";

type Props = {
  note: VoiceNote;
  onDelete: (id: string) => void;
  onRename: () => void;
};

export default function VoiceNoteItem({ note, onDelete, onRename }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    return () => {
      (async () => {
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch {}
          soundRef.current = null;
        }
      })();
    };
  }, []);

  const toggle = async () => {
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: note.uri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlaying(true);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis || 0);
          if (status.didJustFinish) {
            setPlaying(false);
            // unload
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
        // apply speed if not 1
        if (speed !== 1) {
          try { sound.setRateAsync(speed, true); } catch {}
        }
      } else {
        const status: any = await soundRef.current.getStatusAsync();
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
      }
    } catch (err) {
      console.warn("Playback error", err);
    }
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };
  const formatTime = (ms: number) => fmt(ms || 0);

  const cycleSpeed = async () => {
    const speeds = [1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    try {
      if (soundRef.current) await soundRef.current.setRateAsync(next, true);
    } catch {}
  };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{note.name}</Text>
        <Text style={styles.meta}>
          {new Date(note.createdAt).toLocaleString()} • {fmt(note.duration)}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginRight: 8 }}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggle}
          accessibilityLabel={playing ? 'Pause' : 'Play'}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color="#007affe" />
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: '#666' }}>{formatTime(position)}</Text>
      </View>

      <View style={{ width: 80, marginRight: 8 }}>
        <View style={{ height: 6, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ flex: note.duration ? (position / note.duration) : 0, backgroundColor: '#007affe' }} />
          <View style={{ flex: 1 - (note.duration ? (position / note.duration) : 0), backgroundColor: '#eee' }} />
        </View>
        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>{formatTime(note.duration)}</Text>
      </View>

      <TouchableOpacity style={[styles.small]} onPress={() => cycleSpeed()} accessibilityLabel="Change playback speed">
        <Text style={{ color: '#007affe' }}>{speed}x</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.small]} onPress={() => onRename()} accessibilityLabel="Rename recording">
        <Ionicons name="pencil" size={18} color="#007affe" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.small]} onPress={() => onDelete(note.id)} accessibilityLabel="Delete recording">
        <Ionicons name="trash" size={18} color="#ff3b30" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: { fontSize: 16, fontWeight: "500" },
  meta: { color: "#666", marginTop: 4 },
  iconButton: { padding: 8, marginHorizontal: 8 },
  button: { padding: 8, marginHorizontal: 8 },
  btnText: { fontSize: 18 },
  small: { padding: 8 },
  smallText: { color: "#007affe" },
  progressBackground: { height: 6, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#007affe' },
});
