import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import VoiceNoteItem from "./components/VoiceNoteItem";
import {
  deleteNote,
  loadNotes,
  renameNote,
  VoiceNote,
} from "./services/recordingService";

export default function Index() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const all = await loadNotes();
    setNotes(all);
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const filtered = notes.filter((n) =>
    n.name.toLowerCase().includes(query.toLowerCase())
  );

  const [renameVisible, setRenameVisible] = React.useState(false);
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(
    null
  );
  const [renameText, setRenameText] = React.useState("");

  const onDelete = async (id: string) => {
    Alert.alert("Delete", "Delete this recording?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNote(id);
          await load();
        },
      },
    ]);
  };

  const onRenameRequest = (id: string, currentName?: string) => {
    setRenameTargetId(id);
    setRenameText(currentName ?? "");
    setRenameVisible(true);
  };

  const submitRename = async () => {
    if (!renameTargetId) return;
    await renameNote(renameTargetId, renameText || `Renamed ${Date.now()}`);
    setRenameVisible(false);
    setRenameTargetId(null);
    setRenameText("");
    await load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Notes</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.recordBtn} onPress={() => router.push('/record')} accessibilityLabel="Create new recording">
            <Text style={styles.recordBtnText}>New Recording</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => router.push('/settings')}>
            <Text style={{ color: '#007affe' }}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => router.push('/feedback')}>
            <Text style={{ color: '#007affe' }}>Feedback</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={async () => { const p = await import('./services/recordingService').then(m => m.exportBackup()); alert('Backup exported to: ' + p); }}>
          <Text style={{ color: '#444' }}>Backup</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search recordings"
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VoiceNoteItem
            note={item}
            onDelete={onDelete}
            onRename={() => onRenameRequest(item.id, item.name)}
          />
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No recordings yet.</Text>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/record")}
        accessibilityLabel="Create new recording"
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal
        visible={renameVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
              Rename recording
            </Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              style={styles.input}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                style={{ marginRight: 12 }}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={{ color: "#666" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename}>
                <Text style={{ color: "#007affe", fontWeight: "600" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007affe",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  fabText: { color: "white", fontSize: 32, lineHeight: 32 },
  empty: { textAlign: "center", marginTop: 40, color: "#666" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    elevation: 6,
  },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 6 },
  recordBtn: { backgroundColor: '#007affe', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  recordBtnText: { color: 'white', fontWeight: '600' },
});
