import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasTransport, setHasTransport] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase.from("profiles").select("full_name, headline, city, bio, whatsapp, is_available, has_transport").eq("id", user.id).single().then(({ data, error }) => {
      if (error) Alert.alert("No pudimos cargar tu perfil", "Intentá nuevamente.");
      if (data) {
        setFullName(data.full_name || "");
        setHeadline(data.headline || "");
        setCity(data.city || "");
        setBio(data.bio || "");
        setWhatsapp(data.whatsapp || "");
        setIsAvailable(data.is_available !== false);
        setHasTransport(Boolean(data.has_transport));
      }
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user || !fullName.trim()) {
      Alert.alert("Falta tu nombre", "Ingresá tu nombre para guardar el perfil.");
      return;
    }

    const normalizedWhatsapp = whatsapp.replace(/\D/g, "").replace(/^0+/, "");

    try {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        headline: headline.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        whatsapp: normalizedWhatsapp || null,
        is_available: isAvailable,
        has_transport: hasTransport,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (error) throw error;

      Alert.alert("Perfil actualizado", "Tus cambios ya están publicados.", [{ text: "Listo", onPress: () => router.back() }]);
    } catch {
      Alert.alert("No pudimos guardar", "Revisá tu conexión e intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color="#9A5CFF" size="large" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable><Text style={styles.title}>Editar perfil</Text><View style={styles.headerSpacer} /></View>
          <Field label="Nombre completo" value={fullName} onChangeText={setFullName} />
          <Field label="Título profesional" value={headline} onChangeText={setHeadline} placeholder="Ej: Directora de fotografía" />
          <Field label="Ciudad" value={city} onChangeText={setCity} placeholder="Montevideo" />
          <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="099123456" keyboardType="phone-pad" />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={5} style={[styles.input, styles.bioInput]} placeholder="Contá brevemente sobre tu experiencia" />
          <Toggle label="Disponible para trabajar" value={isAvailable} onValueChange={setIsAvailable} />
          <Toggle label="Tengo transporte propio" value={hasTransport} onValueChange={setHasTransport} />
          <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#080808" /> : <Text style={styles.saveText}>Guardar cambios</Text>}</Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, style, ...props }: FieldProps) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, style]} placeholderTextColor="#666" /></View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) { return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#333", true: "#7048A7" }} thumbColor={value ? "#C7A7FF" : "#AAA"} /></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: "#080808" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#080808" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingBottom: 70, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 15, backgroundColor: "#121214" }, headerSpacer: { width: 44 }, title: { color: "#FFF", fontSize: 21, fontWeight: "800" },
  field: { gap: 8 }, label: { color: "#D4D4D4", fontSize: 14, fontWeight: "700" }, input: { minHeight: 54, borderWidth: 1, borderColor: "#292929", borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#121212", color: "#FFF", fontSize: 16 }, bioInput: { minHeight: 120, paddingTop: 15, textAlignVertical: "top" },
  toggle: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#29292C", borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#111113" }, toggleLabel: { color: "#E4E4E7", fontSize: 15, fontWeight: "600" },
  saveButton: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 8, borderRadius: 16, backgroundColor: "#FFF" }, saveText: { color: "#080808", fontSize: 16, fontWeight: "800" }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.6 },
});
