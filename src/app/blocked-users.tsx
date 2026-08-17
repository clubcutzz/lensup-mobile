import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

type BlockedUser = {
  id: string;
  full_name: string | null;
};

export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_blocked_users");

    if (error) {
      console.error("No se pudieron cargar los bloqueos:", error);
      Alert.alert("No pudimos cargar tus bloqueos", "Intentá nuevamente.");
      setUsers([]);
    } else {
      setUsers((data ?? []) as BlockedUser[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function unblock(user: BlockedUser) {
    try {
      setWorkingId(user.id);
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_id", user.id);

      if (error) throw error;
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      console.error("No se pudo desbloquear al usuario:", error);
      Alert.alert("No pudimos desbloquear al usuario", "Intentá nuevamente.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>Usuarios bloqueados</Text>
          <View style={styles.spacer} />
        </View>

        <Text style={styles.description}>
          Estos usuarios no pueden ver tu contenido y tampoco aparecerán en tus búsquedas.
        </Text>

        {loading ? (
          <ActivityIndicator color="#9A5CFF" style={styles.loader} />
        ) : users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={34} color="#A970FF" />
            <Text style={styles.emptyTitle}>No bloqueaste a nadie</Text>
            <Text style={styles.emptyText}>Podés bloquear perfiles desde su menú de seguridad.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {users.map((blockedUser) => (
              <View key={blockedUser.id} style={styles.userRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(blockedUser.full_name?.trim() || "LU").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userName} numberOfLines={1}>
                  {blockedUser.full_name?.trim() || "Usuario de LensUP"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={workingId === blockedUser.id}
                  onPress={() => unblock(blockedUser)}
                  style={styles.unblockButton}
                >
                  {workingId === blockedUser.id ? (
                    <ActivityIndicator size="small" color="#D8C3FF" />
                  ) : (
                    <Text style={styles.unblockText}>Desbloquear</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#080808" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 15, backgroundColor: "#121214" },
  spacer: { width: 44 },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "800" },
  description: { marginTop: 28, color: "#99999F", fontSize: 14, lineHeight: 21 },
  loader: { marginTop: 48 },
  emptyCard: { alignItems: "center", marginTop: 32, padding: 30, borderWidth: 1, borderColor: "#29292C", borderRadius: 20, backgroundColor: "#111113" },
  emptyTitle: { marginTop: 14, color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  emptyText: { marginTop: 7, color: "#88888E", textAlign: "center", fontSize: 13, lineHeight: 19 },
  list: { gap: 12, marginTop: 28 },
  userRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderColor: "#29292C", borderRadius: 18, backgroundColor: "#111113" },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#7442B8", borderRadius: 15, backgroundColor: "#28163A" },
  avatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  userName: { flex: 1, color: "#F2F2F4", fontSize: 15, fontWeight: "700" },
  unblockButton: { minWidth: 94, height: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "#58378A", borderRadius: 12, backgroundColor: "#21152E" },
  unblockText: { color: "#D8C3FF", fontSize: 12, fontWeight: "800" },
});
