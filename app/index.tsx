import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
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
    typeof n.name === 'string' && n.name.toLowerCase().includes(query.toLowerCase())
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <Text style={styles.title}>Voice Notes</Text>
        <TouchableOpacity onPress={async () => { const p = await import('./services/recordingService').then(m => m.exportBackup()); alert('Backup exported to: ' + p); }} style={styles.backupButton}>
          <Ionicons name="cloud-download-outline" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/record')} accessibilityLabel="Create new recording">
          <Ionicons name="mic" size={18} color="white" />
          <Text style={styles.primaryButtonText}>New Recording</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={18} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/feedback')}>
            <Ionicons name="chatbubble-outline" size={18} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search recordings..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
        />
      </View>

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
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-off" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptySubtitle}>Tap the record button to create your first voice note</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/record")}
        accessibilityLabel="Create new recording"
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename recording</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              style={styles.input}
              placeholder="Enter new name"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={submitRename}>
                <Text style={styles.saveModalText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#111827',
    letterSpacing: -0.5,
  },
  backupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: { 
    color: 'white', 
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  search: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    maxWidth: 320,
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: '#111827',
  },
  input: { 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    padding: 12, 
    borderRadius: 8,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  cancelModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelModalText: {
    color: "#6b7280",
    fontWeight: "500",
    fontSize: 16,
  },
  saveModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveModalText: {
    color: "#6366f1",
    fontWeight: "600",
    fontSize: 16,
  },
});
