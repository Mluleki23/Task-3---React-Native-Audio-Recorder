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
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.noteInfo}>
          <Text style={styles.name}>{note.name}</Text>
          <Text style={styles.meta}>
            {new Date(note.createdAt).toLocaleDateString()} • {fmt(note.duration)}
          </Text>
        </View>

        <View style={styles.playbackSection}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={toggle}
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            activeOpacity={0.7}
          >
            <View style={styles.playIcon}>
              <Ionicons name={playing ? 'pause' : 'play'} size={20} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.positionText}>{formatTime(position)}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${note.duration ? (position / note.duration) * 100 : 0}%` }
                ]} 
              />
            </View>
          </View>
          <Text style={styles.durationText}>{formatTime(note.duration)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => cycleSpeed()} 
            accessibilityLabel="Change playback speed"
            activeOpacity={0.7}
          >
            <Text style={styles.speedText}>{speed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onRename()} 
            accessibilityLabel="Rename recording"
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={18} color="#6366f1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onDelete(note.id)} 
            accessibilityLabel="Delete recording"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardContent: {
    padding: 16,
  },
  noteInfo: {
    marginBottom: 12,
  },
  name: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  meta: { 
    color: '#6b7280', 
    fontSize: 13,
    fontWeight: '400',
  },
  playbackSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: {
    marginRight: 12,
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  positionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    marginBottom: 4,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  durationText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 12,
    minWidth: 28,
    textAlign: 'center',
  },
});
