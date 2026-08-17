import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { PRIVACY_URL, TERMS_URL } from "../constants/legal";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  function confirmDeletion() {
    Alert.alert("Eliminar cuenta", "Esta acción es permanente. Se eliminarán tu perfil, proyectos, postulaciones y demás datos asociados.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar definitivamente", style: "destructive", onPress: deleteAccount },
    ]);
  }

  async function deleteAccount() {
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      await signOut().catch(() => undefined);
      router.replace("/login");
    } catch {
      Alert.alert("No pudimos eliminar la cuenta", "Intentá nuevamente o contactanos desde lensup.network.");
    } finally {
      setDeleting(false);
    }
  }

  return <SafeAreaView style={styles.safeArea}><View style={styles.content}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable><Text style={styles.title}>Configuración</Text><View style={styles.spacer} /></View>
    <View style={styles.card}>
      <Row icon="help-circle-outline" label="Soporte y contacto" onPress={() => Linking.openURL("https://www.lensup.network/")} />
      <View style={styles.divider} />
      <Row icon="ban-outline" label="Usuarios bloqueados" onPress={() => router.push("/blocked-users" as never)} />
      <View style={styles.divider} />
      <Row icon="document-text-outline" label="Términos y condiciones" onPress={() => Linking.openURL(TERMS_URL)} />
      <View style={styles.divider} />
      <Row icon="shield-checkmark-outline" label="Política de privacidad" onPress={() => Linking.openURL(PRIVACY_URL)} />
    </View>
    <View style={styles.dangerCard}><Text style={styles.dangerTitle}>Eliminar cuenta</Text><Text style={styles.dangerDescription}>Elimina permanentemente tu cuenta y la información asociada.</Text><Pressable onPress={confirmDeletion} disabled={deleting} style={styles.deleteButton}>{deleting ? <ActivityIndicator color="#FF9BA8" /> : <Text style={styles.deleteText}>Eliminar mi cuenta</Text>}</Pressable></View>
  </View></SafeAreaView>;
}

function Row({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.row}><Ionicons name={icon} size={21} color="#C7A7FF" /><Text style={styles.rowLabel}>{label}</Text><Ionicons name="open-outline" size={18} color="#777" /></Pressable>; }
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: "#080808" }, content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }, iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 15, backgroundColor: "#121214" }, spacer: { width: 44 }, title: { color: "#FFF", fontSize: 21, fontWeight: "800" }, card: { overflow: "hidden", borderWidth: 1, borderColor: "#29292C", borderRadius: 18, backgroundColor: "#111113" }, row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, rowLabel: { flex: 1, color: "#EEE", fontSize: 15, fontWeight: "600" }, divider: { height: 1, marginLeft: 49, backgroundColor: "#29292C" }, dangerCard: { marginTop: 28, borderWidth: 1, borderColor: "#5A292F", borderRadius: 18, padding: 18, backgroundColor: "#1B1012" }, dangerTitle: { color: "#FFB0B9", fontSize: 17, fontWeight: "800" }, dangerDescription: { marginTop: 7, color: "#A68B8E", fontSize: 13, lineHeight: 19 }, deleteButton: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 18, borderWidth: 1, borderColor: "#71343B", borderRadius: 14, backgroundColor: "#2A1317" }, deleteText: { color: "#FF9BA8", fontSize: 14, fontWeight: "800" } });
